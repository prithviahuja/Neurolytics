'use client'

import { useCallback, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Consultation, ProcessingStep } from '@/lib/types'

interface UseAnalysisReturn {
  consultation: Consultation | null
  loading: boolean
  error: string | null
  processingSteps: ProcessingStep[]
  uploadAndAnalyze: (file: File, patientName: string) => Promise<string>
  getConsultation: (id: string) => Promise<Consultation>
  deleteConsultation: (id: string) => Promise<void>
  resetState: () => void
}

// Mock processing steps for real-time simulation
const mockProcessingSteps: ProcessingStep[] = [
  { id: '1', name: 'Uploading Audio', status: 'pending', progress: 0, message: 'Preparing upload...', startTime: new Date() },
  { id: '2', name: 'Transcribing Speech', status: 'pending', progress: 0, message: 'Converting audio to text...', startTime: new Date() },
  { id: '3', name: 'Speaker Detection', status: 'pending', progress: 0, message: 'Identifying speakers...', startTime: new Date() },
  { id: '4', name: 'Emotion Analysis', status: 'pending', progress: 0, message: 'Analyzing emotional content...', startTime: new Date() },
  { id: '5', name: 'Risk Assessment', status: 'pending', progress: 0, message: 'Computing risk metrics...', startTime: new Date() },
]

export function useAnalysis(): UseAnalysisReturn {
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])

  const uploadAndAnalyze = useCallback(async (file: File, patientName: string): Promise<string> => {
    setLoading(true)
    setError(null)
    setProcessingSteps(mockProcessingSteps.map((step) => ({ ...step, startTime: new Date() })))

    try {
      // Step 1: Upload audio
      setProcessingSteps((prev) =>
        prev.map((step) =>
          step.id === '1' ? { ...step, status: 'processing' as const, progress: 50 } : step
        )
      )

      const uploadResponse = await apiClient.uploadAudio(file, patientName)
      const consultationId = uploadResponse.consultationId

      setProcessingSteps((prev) =>
        prev.map((step) => (step.id === '1' ? { ...step, status: 'completed' as const, progress: 100 } : step))
      )

      // Step 2: Start analysis
      setProcessingSteps((prev) =>
        prev.map((step) =>
          step.id === '2' ? { ...step, status: 'processing' as const, progress: 50 } : step
        )
      )

      // Simulate progressive processing with real-time updates
      const processingInterval = setInterval(() => {
        setProcessingSteps((prev) => {
          const updated = [...prev]
          let allCompleted = true

          for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'pending' && i > 0 && updated[i - 1].status === 'completed') {
              updated[i].status = 'processing'
              updated[i].progress = Math.min(updated[i].progress + 15, 90)
            } else if (updated[i].status === 'processing') {
              updated[i].progress = Math.min(updated[i].progress + 20, 95)

              if (updated[i].progress >= 95 && Math.random() > 0.3) {
                updated[i].status = 'completed'
                updated[i].progress = 100
                updated[i].endTime = new Date()
              }
            }

            if (updated[i].status !== 'completed') {
              allCompleted = false
            }
          }

          return updated
        })
      }, 400)

      // Wait for analysis to complete
      const analysisResponse = await apiClient.analyzeAudio(consultationId)

      clearInterval(processingInterval)

      setProcessingSteps((prev) =>
        prev.map((step) => ({
          ...step,
          status: 'completed' as const,
          progress: 100,
          endTime: new Date(),
        }))
      )

      if (analysisResponse.consultation) {
        setConsultation(analysisResponse.consultation)
      }

      return consultationId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed'
      setError(errorMessage)
      setProcessingSteps((prev) =>
        prev.map((step) => (step.status === 'processing' ? { ...step, status: 'failed' as const } : step))
      )
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getConsultation = useCallback(async (id: string): Promise<Consultation> => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getConsultation(id)
      setConsultation(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch consultation'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteConsultation = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.deleteConsultation(id)
      if (consultation?.id === id) {
        setConsultation(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete consultation'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [consultation?.id])

  const resetState = useCallback(() => {
    setConsultation(null)
    setLoading(false)
    setError(null)
    setProcessingSteps([])
  }, [])

  return {
    consultation,
    loading,
    error,
    processingSteps,
    uploadAndAnalyze,
    getConsultation,
    deleteConsultation,
    resetState,
  }
}
