// User and Authentication
export interface User {
  id: string
  email: string
  name: string
  role: 'clinician' | 'patient' | 'admin'
  createdAt: Date
}

export interface AuthResponse {
  user: User
  token: string
}

// Analysis and Consultation
export interface Consultation {
  id: string
  patientId: string
  patientName: string
  providerId: string
  providerName: string
  date: Date
  duration: number // in seconds
  audioUrl: string
  transcript: Segment[]
  emotions: EmotionAnalysis
  acousticMetrics: AcousticMetrics
  nlpMetrics: NLPMetrics
  riskAssessment: RiskAssessment
  status: 'processing' | 'completed' | 'failed'
}

export interface Segment {
  id: string
  speaker: 'doctor' | 'patient'
  speakerName: string
  startTime: number // in seconds
  endTime: number
  text: string
  confidence: number
  emotionalState?: string
}

export interface AcousticMetrics {
  speechRate: number // words per minute
  pauseDuration: number // average pause in seconds
  hesitationFrequency: number // per minute
  speakingTime: number // total speaking time in seconds
  silenceTime: number
  speechQuality: number // 0-100
}

export interface NLPMetrics {
  anxietyScore: number // 0-100
  stressIndicators: string[]
  negativeLanguagePatterns: string[]
  confidenceLevel: number // 0-100
}

export interface EmotionAnalysis {
  overall: string
  confidence: number
  breakdown: {
    anxiety: number // 0-100
    stress: number
    concern: number
    calmness: number
    confidence: number
  }
}

export interface RiskAssessment {
  level: 'low' | 'moderate' | 'high'
  score: number // 0-100
  confidence: number // 0-100
  speechEvidence: {
    title: string
    description: string
    supportingQuotes: string[]
  }
  nlpEvidence: {
    title: string
    description: string
    patterns: string[]
  }
  recommendations: string[]
}

// Processing and Timeline
export interface ProcessingStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  message: string
  startTime: Date
  endTime?: Date
}

export interface TimelineEvent {
  time: number // in seconds
  type: 'speaker_change' | 'stress_spike' | 'emotion_shift' | 'important_statement'
  severity: 'low' | 'medium' | 'high'
  description: string
  stressLevel: number // 0-100
}

// API Request/Response
export interface UploadAudioRequest {
  file: File
  patientName: string
  providerId: string
}

export interface AnalysisResponse {
  consultationId: string
  status: 'processing' | 'completed'
  consultation?: Consultation
  processingSteps?: ProcessingStep[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
