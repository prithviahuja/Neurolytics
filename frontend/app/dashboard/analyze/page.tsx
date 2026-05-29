'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAnalysis } from '@/hooks/use-analysis'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AnalyzePage() {
  const router = useRouter()
  const { uploadAndAnalyze, loading, error, processingSteps } = useAnalysis()
  const [patientName, setPatientName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState('')

  const handleFileSelect = (file: File) => {
    // Validate file type and size
    if (!file.type.startsWith('audio/')) {
      setLocalError('Please select an audio file')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      setLocalError('File size must be less than 100MB')
      return
    }
    setSelectedFile(file)
    setLocalError('')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('border-primary/50', 'bg-primary/5')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-primary/50', 'bg-primary/5')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-primary/50', 'bg-primary/5')
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!patientName.trim()) {
      setLocalError('Please enter patient name')
      return
    }

    if (!selectedFile) {
      setLocalError('Please select an audio file')
      return
    }

    try {
      const consultationId = await uploadAndAnalyze(selectedFile, patientName)
      // Redirect to results page
      setTimeout(() => {
        router.push(`/dashboard/results/${consultationId}`)
      }, 1000)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-3xl font-bold">New Analysis</h1>
          <p className="text-muted-foreground mt-1">Upload and analyze a clinical consultation</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Main Form Card */}
        <Card className="p-8 border border-border/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Name */}
            <div className="space-y-2">
              <Label htmlFor="patient-name" className="text-base font-semibold">
                Patient Name
              </Label>
              <Input
                id="patient-name"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* File Upload Area */}
            <div
              className="space-y-2 border-2 border-dashed border-border/50 rounded-lg p-8 transition-colors"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={loading}
              />

              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {selectedFile ? 'File Selected' : 'Upload Audio File'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {selectedFile ? (
                    <span>
                      <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  ) : (
                    <span>Drag and drop your audio file here or click to browse</span>
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={loading}
                  size="sm"
                >
                  Choose File
                </Button>
              </div>
            </div>

            {/* Error Messages */}
            {(error || localError) && (
              <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-sm text-destructive flex gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error || localError}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={!patientName || !selectedFile || loading} className="w-full h-11">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Processing Steps */}
        {loading && processingSteps.length > 0 && (
          <Card className="p-8 border border-border/50">
            <h3 className="font-semibold text-lg mb-6">Analysis Progress</h3>
            <div className="space-y-4">
              {processingSteps.map((step, idx) => {
                const isActive = step.status === 'processing'
                const isCompleted = step.status === 'completed'

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-shrink-0 w-8 h-8">
                      {isCompleted ? (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 border border-green-300">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      ) : isActive ? (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/50">
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 border border-border/50">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{step.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.message}</p>
                    </div>

                    {isActive && (
                      <div className="flex-shrink-0 w-12">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${step.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right mt-1">{Math.round(step.progress)}%</p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
