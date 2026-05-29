'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAnalysis } from '@/hooks/use-analysis'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Consultation } from '@/lib/types'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TranscriptViewer } from '@/components/transcript-viewer'
import { RiskAssessmentSection } from '@/components/risk-assessment'
import { AIInsightsPanel } from '@/components/ai-insights-panel'
import { ConsultationTimeline } from '@/components/consultation-timeline'
import { AcousticMetricsSection } from '@/components/acoustic-metrics'

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const consultationId = params.id as string
  const { consultation, getConsultation, loading, error } = useAnalysis()
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'metrics' | 'insights' | 'risk'>('overview')

  useEffect(() => {
    if (consultationId) {
      getConsultation(consultationId).catch((err) => {
        console.error('[v0] Failed to fetch consultation:', err)
      })
    }
  }, [consultationId, getConsultation])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading consultation...</p>
        </div>
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 max-w-md border border-destructive/50">
          <h2 className="font-semibold text-lg text-destructive mb-2">Failed to Load Consultation</h2>
          <p className="text-sm text-muted-foreground mb-6">{error || 'Consultation not found'}</p>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'insights', label: 'AI Insights' },
    { id: 'risk', label: 'Risk Assessment' },
  ]

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{consultation.patientName}</h1>
            <p className="text-muted-foreground mt-1">
              {consultation.providerName} • {new Date(consultation.date).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </motion.div>

      {/* Report Header Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Consultation Duration</p>
              <p className="text-2xl font-bold mt-2">{Math.round(consultation.duration / 60)}m</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Overall Risk Level</p>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    consultation.riskAssessment.level === 'high'
                      ? 'bg-danger'
                      : consultation.riskAssessment.level === 'moderate'
                        ? 'bg-warning'
                        : 'bg-success'
                  }`}
                />
                <p className="text-2xl font-bold uppercase">{consultation.riskAssessment.level}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Risk Score</p>
              <p className="text-2xl font-bold mt-2">{Math.round(consultation.riskAssessment.score)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Confidence</p>
              <p className="text-2xl font-bold mt-2">{Math.round(consultation.riskAssessment.confidence)}%</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="flex gap-2 border-b border-border/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={activeTab}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AIInsightsPanel consultation={consultation} />
            <ConsultationTimeline consultation={consultation} />
          </div>
        )}

        {activeTab === 'transcript' && <TranscriptViewer consultation={consultation} />}

        {activeTab === 'metrics' && <AcousticMetricsSection consultation={consultation} />}

        {activeTab === 'insights' && <AIInsightsPanel consultation={consultation} />}

        {activeTab === 'risk' && <RiskAssessmentSection consultation={consultation} />}
      </motion.div>
    </div>
  )
}
