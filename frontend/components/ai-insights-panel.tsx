'use client'

import { Card } from '@/components/ui/card'
import { Consultation } from '@/lib/types'
import { Brain, Zap, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

interface AIInsightsPanelProps {
  consultation: Consultation
}

export function AIInsightsPanel({ consultation }: AIInsightsPanelProps) {
  const { riskAssessment } = consultation
  const riskLevelColors = {
    low: 'from-green-50 to-green-100 border-green-200 text-green-900',
    moderate: 'from-amber-50 to-amber-100 border-amber-200 text-amber-900',
    high: 'from-red-50 to-red-100 border-red-200 text-red-900',
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Main Insights Header */}
      <motion.div variants={itemVariants}>
        <Card className={`p-6 border-2 bg-gradient-to-br ${riskLevelColors[riskAssessment.level]}`}>
          <div className="flex items-start gap-4">
            <Brain className="w-8 h-8 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">AI Clinical Insights</h2>
              <p className="opacity-90">
                Analysis of {consultation.transcript.length} transcript segments with{' '}
                {Math.round(riskAssessment.confidence)}% confidence
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Why This Risk Level */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 border border-border/50">
          <h3 className="font-semibold text-lg mb-4">Why {riskAssessment.level.toUpperCase()} Risk?</h3>
          <p className="text-muted-foreground mb-4">
            This consultation exhibits stress and anxiety indicators across both speech patterns and linguistic content.
            The classification is based on comprehensive analysis of the following evidence:
          </p>
        </Card>
      </motion.div>

      {/* Speech Evidence */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 border border-border/50">
          <div className="flex items-start gap-3 mb-4">
            <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-base">{riskAssessment.speechEvidence.title}</h4>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{riskAssessment.speechEvidence.description}</p>

          {/* Supporting Metrics */}
          <div className="space-y-2 mb-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Speech Pattern Indicators:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>
                  <strong>Speech Rate:</strong> {consultation.acousticMetrics.speechRate} wpm
                  {consultation.acousticMetrics.speechRate > 130 && ' (elevated)'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>
                  <strong>Pause Duration:</strong> {consultation.acousticMetrics.pauseDuration.toFixed(1)}s average
                  {consultation.acousticMetrics.pauseDuration > 1.5 && ' (frequent hesitations)'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>
                  <strong>Hesitation Frequency:</strong> {consultation.acousticMetrics.hesitationFrequency} per minute
                </span>
              </li>
            </ul>
          </div>

          {/* Supporting Quotes */}
          {riskAssessment.speechEvidence.supportingQuotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Supporting Quotes:</p>
              {riskAssessment.speechEvidence.supportingQuotes.map((quote, idx) => (
                <div key={idx} className="p-3 bg-primary/5 border-l-2 border-primary rounded italic text-sm">
                  &quot;{quote}&quot;
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* NLP Evidence */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 border border-border/50">
          <div className="flex items-start gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-base">{riskAssessment.nlpEvidence.title}</h4>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{riskAssessment.nlpEvidence.description}</p>

          {/* NLP Patterns */}
          {riskAssessment.nlpEvidence.patterns.length > 0 && (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Detected Patterns:</p>
              <div className="flex flex-wrap gap-2">
                {riskAssessment.nlpEvidence.patterns.map((pattern, idx) => (
                  <div key={idx} className="px-3 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
                    {pattern}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotion Breakdown */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Emotion Scores:</p>
            <div className="space-y-2">
              {Object.entries(consultation.emotions.breakdown).map(([emotion, score]) => (
                <div key={emotion} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-24 capitalize">{emotion}:</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
                        score > 60
                          ? 'bg-danger'
                          : score > 30
                            ? 'bg-warning'
                            : 'bg-success'
                      }`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recommendations */}
      {riskAssessment.recommendations.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-6 border border-border/50 bg-primary/5">
            <h4 className="font-semibold text-base mb-4">Clinical Recommendations</h4>
            <ul className="space-y-2">
              {riskAssessment.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="text-primary font-bold mt-0.5">✓</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
