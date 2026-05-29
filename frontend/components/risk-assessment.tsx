'use client'

import { Card } from '@/components/ui/card'
import { Consultation } from '@/lib/types'
import { motion } from 'framer-motion'

interface RiskAssessmentSectionProps {
  consultation: Consultation
}

export function RiskAssessmentSection({ consultation }: RiskAssessmentSectionProps) {
  const { riskAssessment } = consultation

  const riskColorMap = {
    low: 'from-green-50 to-green-100 border-green-200',
    moderate: 'from-amber-50 to-amber-100 border-amber-200',
    high: 'from-red-50 to-red-100 border-red-200',
  }

  const riskTextColorMap = {
    low: 'text-green-900',
    moderate: 'text-amber-900',
    high: 'text-red-900',
  }

  // Circular gauge SVG
  const drawGauge = (percentage: number) => {
    const radius = 70
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="8"
          className={
            percentage > 65
              ? 'text-danger'
              : percentage > 35
                ? 'text-warning'
                : 'text-success'
          }
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Risk Gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className={`p-8 border-2 bg-gradient-to-br ${riskColorMap[riskAssessment.level]}`}>
          <div className="flex flex-col items-center justify-center">
            <h3 className={`font-bold text-4xl mb-4 uppercase ${riskTextColorMap[riskAssessment.level]}`}>
              {riskAssessment.level} RISK
            </h3>
            <div className="relative w-[180px] h-[180px] flex items-center justify-center mb-6">
              {drawGauge(riskAssessment.score)}
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold">{Math.round(riskAssessment.score)}</span>
                <span className="text-xs text-muted-foreground">Risk Score</span>
              </div>
            </div>
            <p className={`text-sm font-medium ${riskTextColorMap[riskAssessment.level]}`}>
              Confidence: {Math.round(riskAssessment.confidence)}%
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Detailed Metrics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-6 border border-border/50">
          <h3 className="font-semibold text-lg mb-6">Risk Assessment Details</h3>

          <div className="space-y-6">
            {/* Speech Evidence */}
            <div>
              <h4 className="font-semibold mb-3 text-primary">Speech Pattern Evidence</h4>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">{riskAssessment.speechEvidence.description}</p>
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Key Indicators:</p>
                  <ul className="space-y-1 text-sm">
                    {[
                      `Speech Rate: ${consultation.acousticMetrics.speechRate} wpm`,
                      `Pause Duration: ${consultation.acousticMetrics.pauseDuration.toFixed(1)}s`,
                      `Hesitation Frequency: ${consultation.acousticMetrics.hesitationFrequency}/min`,
                      `Speech Quality Score: ${consultation.acousticMetrics.speechQuality}%`,
                    ].map((indicator, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* NLP Evidence */}
            <div>
              <h4 className="font-semibold mb-3 text-accent">Natural Language Evidence</h4>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">{riskAssessment.nlpEvidence.description}</p>
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Stress Indicators:</p>
                  <div className="flex flex-wrap gap-2">
                    {consultation.nlpMetrics.stressIndicators.map((indicator, idx) => (
                      <div key={idx} className="px-2 py-1 bg-danger/10 text-danger rounded text-xs font-medium">
                        {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Metrics */}
            <div>
              <h4 className="font-semibold mb-3">Overall Assessment Metrics</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { label: 'Anxiety Score', value: consultation.nlpMetrics.anxietyScore, unit: '%' },
                  { label: 'Confidence Level', value: consultation.nlpMetrics.confidenceLevel, unit: '%' },
                  { label: 'Overall Emotion', value: consultation.emotions.overall, unit: '' },
                  { label: 'Speech Quality', value: consultation.acousticMetrics.speechQuality, unit: '%' },
                ].map((metric, idx) => (
                  <div key={idx} className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{metric.label}</p>
                    <p className="text-2xl font-bold">
                      {metric.value}
                      {metric.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recommendations */}
      {riskAssessment.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 border border-primary/50 bg-primary/5">
            <h3 className="font-semibold text-lg mb-4">Recommended Actions</h3>
            <ul className="space-y-3">
              {riskAssessment.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-primary font-bold mt-0.5 flex-shrink-0">→</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
