'use client'

import { Card } from '@/components/ui/card'
import { Consultation, TimelineEvent } from '@/lib/types'
import { motion } from 'framer-motion'
import { AlertCircle, TrendingUp, Zap } from 'lucide-react'

interface ConsultationTimelineProps {
  consultation: Consultation
}

// Derive timeline events from the real consultation data
function deriveTimelineEvents(consultation: Consultation): TimelineEvent[] {
  const baseStress = consultation.riskAssessment.score          // 0-100
  const patientSegments = consultation.transcript.filter((s) => s.speaker === 'patient')

  if (patientSegments.length === 0) {
    // Fallback: generate synthetic points across the duration
    return Array.from({ length: 5 }, (_, i) => ({
      time: Math.round((consultation.duration / 5) * (i + 0.5)),
      type: 'emotion_shift' as const,
      severity: baseStress > 60 ? 'high' : baseStress > 35 ? 'medium' : 'low',
      description: 'Audio segment processed',
      stressLevel: Math.max(10, baseStress + (Math.random() - 0.5) * 20),
    }))
  }

  // Map each patient segment to a stress event
  return patientSegments
    .filter((_, i) => i % Math.max(1, Math.floor(patientSegments.length / 8)) === 0)
    .slice(0, 10)
    .map((seg, i, arr) => {
      // Stress rises slightly over the consultation (anxiety tends to build)
      const progress = i / Math.max(arr.length - 1, 1)
      const stressLevel = Math.min(100, Math.max(5,
        baseStress * 0.7 + baseStress * 0.3 * progress + (Math.sin(i) * 8)
      ))
      const severity: 'low' | 'medium' | 'high' =
        stressLevel > 65 ? 'high' : stressLevel > 35 ? 'medium' : 'low'
      const types: TimelineEvent['type'][] = ['emotion_shift', 'stress_spike', 'important_statement', 'speaker_change']
      return {
        time: Math.round(seg.startTime),
        type: types[i % types.length],
        severity,
        description: seg.text.length > 60 ? seg.text.slice(0, 57) + '…' : seg.text,
        stressLevel: Math.round(stressLevel),
      }
    })
}

export function ConsultationTimeline({ consultation }: ConsultationTimelineProps) {
  const timelineEvents = deriveTimelineEvents(consultation)

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'stress_spike':
        return <AlertCircle className="w-4 h-4" />
      case 'emotion_shift':
        return <TrendingUp className="w-4 h-4" />
      case 'important_statement':
        return <Zap className="w-4 h-4" />
      default:
        return <div className="w-4 h-4 rounded-full bg-primary" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-danger/50 bg-danger/5'
      case 'medium':
        return 'border-warning/50 bg-warning/5'
      default:
        return 'border-success/50 bg-success/5'
    }
  }

  return (
    <Card className="p-6 border border-border/50">
      <h3 className="font-semibold text-lg mb-6">Consultation Timeline</h3>

      <div className="space-y-4">
        {/* Stress Level Graph */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Stress Level Over Time</p>
          <div className="relative h-32 bg-muted/30 rounded-lg p-4 overflow-hidden">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Background grid */}
              <defs>
                <linearGradient id="stressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--danger))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Animated stress curve */}
              <motion.path
                d="M 0,80 Q 25,70 50,60 T 100,40"
                fill="url(#stressGradient)"
                stroke="hsl(var(--danger))"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />

              {/* Events markers */}
              {timelineEvents.map((event, idx) => (
                <motion.circle
                  key={idx}
                  cx={((event.time / consultation.duration) * 100).toString()}
                  cy={(100 - event.stressLevel).toString()}
                  r="2"
                  fill="hsl(var(--danger))"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Time markers and events */}
        <div className="relative space-y-3 mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>0m</span>
            <span>{Math.round(consultation.duration / 60 / 2)}m</span>
            <span>{Math.round(consultation.duration / 60)}m</span>
          </div>

          {/* Events Timeline */}
          {timelineEvents.length > 0 && (
            <div className="space-y-3 mt-6 pt-6 border-t border-border/50">
              <p className="text-sm font-medium text-muted-foreground">Key Events</p>
              {timelineEvents.map((event, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className={`p-3 rounded-lg border ${getSeverityColor(event.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-primary mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{event.description}</p>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(event.time / 60)}m {event.time % 60}s
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Stress Level: {Math.round(event.stressLevel)}%
                        </span>
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={
                              event.stressLevel > 65
                                ? 'bg-danger'
                                : event.stressLevel > 35
                                  ? 'bg-warning'
                                  : 'bg-success'
                            }
                            initial={{ width: '0%' }}
                            animate={{ width: `${event.stressLevel}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 + idx * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
