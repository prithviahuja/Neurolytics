'use client'

import { Card } from '@/components/ui/card'
import { Consultation } from '@/lib/types'
import { motion } from 'framer-motion'

interface AcousticMetricsSectionProps {
  consultation: Consultation
}

export function AcousticMetricsSection({ consultation }: AcousticMetricsSectionProps) {
  const { acousticMetrics } = consultation

  const metrics = [
    {
      label: 'Speech Rate',
      value: acousticMetrics.speechRate,
      unit: 'wpm',
      description: 'Words per minute',
      normal: { min: 100, max: 120 },
      color: acousticMetrics.speechRate > 130 ? 'text-danger' : 'text-foreground',
    },
    {
      label: 'Pause Duration',
      value: acousticMetrics.pauseDuration.toFixed(1),
      unit: 's',
      description: 'Average pause length',
      normal: { min: 0.5, max: 1 },
      color: acousticMetrics.pauseDuration > 1.5 ? 'text-danger' : 'text-foreground',
    },
    {
      label: 'Hesitation Frequency',
      value: acousticMetrics.hesitationFrequency,
      unit: '/min',
      description: 'Hesitations per minute',
      normal: { min: 0, max: 3 },
      color: acousticMetrics.hesitationFrequency > 6 ? 'text-danger' : 'text-foreground',
    },
    {
      label: 'Speech Quality',
      value: acousticMetrics.speechQuality,
      unit: '%',
      description: 'Audio quality score',
      normal: { min: 85, max: 100 },
      color: acousticMetrics.speechQuality > 75 ? 'text-foreground' : 'text-warning',
    },
  ]

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
      <motion.div variants={itemVariants}>
        <Card className="p-6 border border-border/50">
          <h3 className="font-semibold text-lg mb-6">Acoustic Analysis</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Detailed speech pattern analysis extracted from the consultation audio
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                variants={itemVariants}
                className="p-4 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{metric.label}</p>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                </div>

                <div className={`text-3xl font-bold ${metric.color}`}>
                  {metric.value}
                  <span className="text-lg ml-1">{metric.unit}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Time Distribution */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 border border-border/50">
          <h3 className="font-semibold text-lg mb-6">Speaking Time Distribution</h3>

          <div className="space-y-4">
            {[
              {
                label: 'Patient Speaking',
                value: acousticMetrics.speakingTime,
                total: consultation.duration,
                color: 'bg-warning',
              },
              {
                label: 'Silence',
                value: acousticMetrics.silenceTime,
                total: consultation.duration,
                color: 'bg-muted',
              },
            ].map((item) => {
              const percentage = (item.value / item.total) * 100
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(item.value)}s ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={item.color}
                      initial={{ width: '0%' }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Duration</p>
              <p className="text-xl font-bold">{Math.round(consultation.duration)}s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Speaking Time</p>
              <p className="text-xl font-bold">{Math.round(acousticMetrics.speakingTime)}s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Silence Time</p>
              <p className="text-xl font-bold">{Math.round(acousticMetrics.silenceTime)}s</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Interpretation */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 border border-border/50 bg-primary/5">
          <h3 className="font-semibold text-lg mb-4">Clinical Interpretation</h3>
          <div className="space-y-3 text-sm">
            {acousticMetrics.speechRate > 130 && (
              <p className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>
                  <strong>Elevated Speech Rate:</strong> The patient&apos;s speech rate ({acousticMetrics.speechRate} wpm) is
                  above normal range, suggesting possible anxiety or urgency.
                </span>
              </p>
            )}
            {acousticMetrics.pauseDuration > 1.5 && (
              <p className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>
                  <strong>Frequent Hesitations:</strong> Average pause duration of {acousticMetrics.pauseDuration.toFixed(1)}s
                  indicates difficulty expressing thoughts, potentially due to anxiety.
                </span>
              </p>
            )}
            {acousticMetrics.hesitationFrequency > 6 && (
              <p className="flex gap-2">
                <span className="text-primary">✓</span>
                <span>
                  <strong>High Hesitation Frequency:</strong> {acousticMetrics.hesitationFrequency} hesitations per minute is
                  elevated and may correlate with stress levels.
                </span>
              </p>
            )}
            {acousticMetrics.speechQuality < 75 && (
              <p className="flex gap-2">
                <span className="text-warning">⚠</span>
                <span>
                  <strong>Audio Quality:</strong> The recording quality score is {acousticMetrics.speechQuality}%, which may
                  affect analysis accuracy.
                </span>
              </p>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
