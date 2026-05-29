import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  Consultation,
  AnalysisResponse,
  PaginatedResponse,
  AuthResponse,
  User,
  Segment,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
//  Axios instance — talks to your FastAPI backend
// ─────────────────────────────────────────────────────────────────────────────
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 300_000, // 5 min — WhisperX can be slow on CPU
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─────────────────────────────────────────────────────────────────────────────
//  Backend response shape  (mirrors backend/schemas.py)
// ─────────────────────────────────────────────────────────────────────────────
interface BackendEmotionScores {
  anger: number; disgust: number; fear: number
  joy: number; neutral: number; sadness: number; surprise: number
}
interface BackendNLPAnalysis {
  anxiety_score: number; emotion_scores: BackendEmotionScores
  pronoun_density: number; avg_sentence_complexity: number
  word_count: number; dominant_emotion: string
  low_data_warning: boolean; error?: string | null
}
interface BackendSpeechAnalysis {
  patient_transcript: string; doctor_transcript: string
  speech_rate_wpm: number; total_patient_words: number
  patient_speaking_time: number; avg_pause_duration_sec: number
  patient_speaker_id: string
}
interface BackendFusion {
  final_stress_risk: 'LOW' | 'MODERATE' | 'HIGH'
  composite_score: number; acoustic_score: number; nlp_score: number
  acoustic_weight: number; linguistic_weight: number
  nlp_confidence: string; reasoning: string
}
interface BackendAnalysisResponse {
  patient_transcript: string; speech_rate_wpm: number
  nlp_anxiety_score: number; final_stress_risk: 'LOW' | 'MODERATE' | 'HIGH'
  composite_score: number; speech_analysis: BackendSpeechAnalysis
  nlp_analysis: BackendNLPAnalysis; fusion: BackendFusion
  audio_filename: string; processing_time_sec: number
}

// ─────────────────────────────────────────────────────────────────────────────
//  Map backend response → Consultation shape the UI expects
// ─────────────────────────────────────────────────────────────────────────────
function mapBackendToConsultation(
  raw: BackendAnalysisResponse,
  patientName: string,
  consultationId: string
): Consultation {
  const sa = raw.speech_analysis
  const nlp = raw.nlp_analysis
  const fusion = raw.fusion
  const riskLevel = raw.final_stress_risk.toLowerCase() as 'low' | 'moderate' | 'high'

  // Build transcript segments from the raw text
  const buildSegments = (
    text: string,
    speaker: 'patient' | 'doctor',
    speakerName: string
  ): Segment[] => {
    const sentences = text.match(/[^.!?]+[.!?]*/g) ?? (text ? [text] : [])
    let cursor = 0
    return sentences.map((sentence, i) => {
      const words = sentence.trim().split(/\s+/).length
      const duration = words / Math.max(sa.speech_rate_wpm / 60, 1)
      const seg: Segment = {
        id: `${speaker}-${i}`,
        speaker,
        speakerName,
        startTime: parseFloat(cursor.toFixed(2)),
        endTime: parseFloat((cursor + duration).toFixed(2)),
        text: sentence.trim(),
        confidence: 0.9,
        emotionalState: nlp.dominant_emotion,
      }
      cursor += duration + (sa.avg_pause_duration_sec ?? 0.3)
      return seg
    })
  }

  const segments: Segment[] = [
    ...buildSegments(sa.patient_transcript ?? '', 'patient', patientName),
    ...buildSegments(sa.doctor_transcript ?? '', 'doctor', 'Doctor'),
  ].sort((a, b) => a.startTime - b.startTime)

  const es = nlp.emotion_scores
  const anxietyPct = Math.round(nlp.anxiety_score * 100)
  const stressPct = Math.round((es.fear * 0.5 + es.sadness * 0.3 + es.anger * 0.2) * 100)
  const riskScore = Math.round(Math.min(fusion.composite_score * 100, 100))
  const confidencePct = fusion.nlp_confidence === 'full'
    ? Math.max(10, Math.round((1 - fusion.composite_score * 0.3) * 100))
    : 40

  const reasoningLines = fusion.reasoning.split('\n')
  const stressIndicators = reasoningLines
    .filter((l) => l.includes('⚑') || l.includes('CLINICAL'))
    .map((l) => l.replace(/[⚑⚠]/g, '').trim())
    .filter(Boolean)
    .slice(0, 5)

  return {
    id: consultationId,
    patientId: `patient-${consultationId}`,
    patientName,
    providerId: 'provider-001',
    providerName: 'Dr. Sarah Chen',
    date: new Date(),
    duration: Math.round(sa.patient_speaking_time + 30),
    audioUrl: '',
    transcript: segments,
    emotions: {
      overall: nlp.dominant_emotion,
      confidence: confidencePct,
      breakdown: {
        anxiety: anxietyPct,
        stress: stressPct,
        concern: Math.round(es.sadness * 100),
        calmness: Math.round(es.neutral * 100),
        confidence: Math.round(es.joy * 100),
      },
    },
    acousticMetrics: {
      speechRate: Math.round(sa.speech_rate_wpm),
      pauseDuration: sa.avg_pause_duration_sec,
      hesitationFrequency: sa.avg_pause_duration_sec > 1 ? 3 : 1,
      speakingTime: sa.patient_speaking_time,
      silenceTime: Math.max(0, sa.patient_speaking_time * 0.15),
      speechQuality: Math.min(100, Math.round((sa.speech_rate_wpm / 160) * 100)),
    },
    nlpMetrics: {
      anxietyScore: anxietyPct,
      stressIndicators: stressIndicators.length
        ? stressIndicators
        : ['No significant stress indicators detected'],
      negativeLanguagePatterns: [
        `Dominant emotion: ${nlp.dominant_emotion}`,
        `Pronoun density: ${(nlp.pronoun_density * 100).toFixed(1)}%`,
        `Avg sentence length: ${nlp.avg_sentence_complexity.toFixed(1)} words`,
      ],
      confidenceLevel: confidencePct,
    },
    riskAssessment: {
      level: riskLevel,
      score: riskScore,
      confidence: confidencePct,
      speechEvidence: {
        title:
          sa.speech_rate_wpm > 160
            ? 'Elevated Speech Rate'
            : sa.speech_rate_wpm < 90
              ? 'Reduced Speech Rate'
              : 'Normal Speech Rate',
        description: `Patient spoke at ${Math.round(sa.speech_rate_wpm)} WPM with an average pause of ${sa.avg_pause_duration_sec.toFixed(2)}s. Total patient speaking time: ${sa.patient_speaking_time.toFixed(0)}s.`,
        supportingQuotes: segments
          .filter((s) => s.speaker === 'patient')
          .slice(0, 3)
          .map((s) => s.text),
      },
      nlpEvidence: {
        title: `${nlp.dominant_emotion.charAt(0).toUpperCase() + nlp.dominant_emotion.slice(1)} emotion — Anxiety score ${anxietyPct}%`,
        description: `DistilRoBERTa analysed ${nlp.word_count} words. Confidence: ${fusion.nlp_confidence}.`,
        patterns: [
          `Fear: ${(es.fear * 100).toFixed(0)}%`,
          `Sadness: ${(es.sadness * 100).toFixed(0)}%`,
          `Anger: ${(es.anger * 100).toFixed(0)}%`,
          `Neutral: ${(es.neutral * 100).toFixed(0)}%`,
          `Joy: ${(es.joy * 100).toFixed(0)}%`,
        ],
      },
      recommendations: buildRecommendations(riskLevel, sa, nlp),
    },
    status: 'completed',
  }
}

function buildRecommendations(
  level: 'low' | 'moderate' | 'high',
  sa: BackendSpeechAnalysis,
  nlp: BackendNLPAnalysis
): string[] {
  const recs: string[] = []
  if (level === 'high') {
    recs.push('Consider a direct check-in with the patient regarding emotional state')
    recs.push('Schedule a follow-up appointment within 1–2 weeks')
  } else if (level === 'moderate') {
    recs.push('Monitor patient progress at the next scheduled visit')
    recs.push('Consider a brief anxiety screening questionnaire (GAD-7)')
  }
  if (sa.speech_rate_wpm > 160)
    recs.push('Elevated speech rate — consider stress management resources')
  if (sa.avg_pause_duration_sec > 2)
    recs.push('Frequent long pauses — may indicate processing difficulty')
  if (nlp.pronoun_density > 0.08)
    recs.push('High self-referential language — may reflect rumination patterns')
  if (recs.length === 0)
    recs.push('No significant stress markers detected. Continue routine monitoring.')
  return recs
}

// ─────────────────────────────────────────────────────────────────────────────
//  In-memory session store  (persists across route navigations in the same tab)
// ─────────────────────────────────────────────────────────────────────────────
const _sessionStore: Map<string, Consultation> = new Map()

// File is stored on globalThis so it survives the uploadAudio → analyzeAudio call split
function storeFile(id: string, file: File) {
  ;(globalThis as any)[`__audioFile_${id}`] = file
}
function retrieveFile(id: string): File | undefined {
  return (globalThis as any)[`__audioFile_${id}`]
}
function clearFile(id: string) {
  delete (globalThis as any)[`__audioFile_${id}`]
}

// ─────────────────────────────────────────────────────────────────────────────
//  API Client
// ─────────────────────────────────────────────────────────────────────────────
export const apiClient = {
  // ── Auth (no backend auth yet) ───────────────────────────────────────────
  async login(email: string, password: string): Promise<AuthResponse> {
    await delay(400)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null
    return {
      user: { id: 'user-001', email, name: stored ?? 'Dr. Sarah Chen', role: 'clinician', createdAt: new Date() },
      token: 'token_' + Date.now(),
    }
  },

  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    await delay(400)
    if (typeof window !== 'undefined') localStorage.setItem('user_name', name)
    return {
      user: { id: 'user-' + Date.now(), email, name, role: 'clinician', createdAt: new Date() },
      token: 'token_' + Date.now(),
    }
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') localStorage.removeItem('auth_token')
  },

  async getCurrentUser(): Promise<User> {
    await delay(200)
    const name = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null
    return { id: 'user-001', email: 'doctor@clinic.com', name: name ?? 'Dr. Sarah Chen', role: 'clinician', createdAt: new Date() }
  },

  // ── Stage 1: receive file, store it, return a consultation ID ───────────
  async uploadAudio(file: File, patientName: string): Promise<AnalysisResponse> {
    const consultationId = `consultation-${Date.now()}`
    storeFile(consultationId, file)
    // Store patient name across the call boundary
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`patient_${consultationId}`, patientName)
    }
    return { consultationId, status: 'processing' }
  },

  // ── Stage 2: POST the actual file to FastAPI, map real response ──────────
  async analyzeAudio(consultationId: string): Promise<AnalysisResponse> {
    const file = retrieveFile(consultationId)
    const patientName =
      typeof window !== 'undefined'
        ? (sessionStorage.getItem(`patient_${consultationId}`) ?? 'Unknown Patient')
        : 'Unknown Patient'

    if (!file) {
      throw new Error(
        'Audio file not found. Please re-upload the audio file.'
      )
    }

    try {
      const formData = new FormData()
      // field name must match FastAPI endpoint parameter: audio_file
      formData.append('audio_file', file, file.name)

      const response = await axiosInstance.post<BackendAnalysisResponse>(
        '/api/v1/analyze-consultation',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      const consultation = mapBackendToConsultation(
        response.data,
        patientName,
        consultationId
      )

      _sessionStore.set(consultationId, consultation)
      clearFile(consultationId)
      if (typeof window !== 'undefined')
        sessionStorage.removeItem(`patient_${consultationId}`)

      return { consultationId, status: 'completed', consultation }
    } catch (error) {
      clearFile(consultationId)
      throw handleApiError(error)
    }
  },

  // ── Read back a completed consultation ───────────────────────────────────
  async getConsultation(consultationId: string): Promise<Consultation> {
    const cached = _sessionStore.get(consultationId)
    if (cached) return cached
    throw new Error(
      'Consultation not found in this session. Please re-upload the audio to re-analyze.'
    )
  },

  async getConsultationHistory(
    page = 1,
    pageSize = 10,
    search?: string
  ): Promise<PaginatedResponse<Consultation>> {
    const all = Array.from(_sessionStore.values()).reverse()
    const filtered = search
      ? all.filter((c) => c.patientName.toLowerCase().includes(search.toLowerCase()))
      : all
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)
    return {
      data: paged,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    }
  },

  async searchConsultations(query: string): Promise<Consultation[]> {
    const all = Array.from(_sessionStore.values())
    return all.filter(
      (c) =>
        c.patientName.toLowerCase().includes(query.toLowerCase()) ||
        c.transcript.some((s) => s.text.toLowerCase().includes(query.toLowerCase()))
    )
  },

  async deleteConsultation(consultationId: string): Promise<void> {
    _sessionStore.delete(consultationId)
  },

  async getProcessingStatus(consultationId: string) {
    return { consultationId, progress: 50, currentStep: 'analyzing', message: 'Processing audio...' }
  },

  async exportConsultationPdf(consultationId: string): Promise<Blob> {
    return new Blob(['PDF export not yet implemented'], { type: 'application/pdf' })
  },

  getAxiosInstance(): AxiosInstance {
    return axiosInstance
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError
    const detail = (axiosError.response?.data as Record<string, unknown>)?.detail
    const msg = detail ?? axiosError.message ?? 'API error'
    return new Error(String(msg))
  }
  return error instanceof Error ? error : new Error('An unexpected error occurred')
}

export { axiosInstance }
