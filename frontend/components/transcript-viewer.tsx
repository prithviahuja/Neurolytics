'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Consultation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import { motion } from 'framer-motion'

interface TranscriptViewerProps {
  consultation: Consultation
}

export function TranscriptViewer({ consultation }: TranscriptViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const speakerColors = {
    doctor: 'bg-blue-50 border-l-4 border-primary',
    patient: 'bg-amber-50 border-l-4 border-warning',
  }

  const speakerBadgeColors = {
    doctor: 'bg-primary/10 text-primary',
    patient: 'bg-warning/10 text-warning',
  }

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      <Card className="p-6 border border-border/50">
        <h3 className="font-semibold text-lg mb-4">Consultation Audio</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </Button>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(currentTime / consultation.duration) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.floor(currentTime)}s / {Math.floor(consultation.duration)}s
            </span>
          </div>
        </div>
      </Card>

      {/* Transcript */}
      <Card className="p-6 border border-border/50">
        <h3 className="font-semibold text-lg mb-4">Diarized Transcript</h3>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {consultation.transcript.map((segment, idx) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-lg ${speakerColors[segment.speaker]}`}
            >
              <div className="flex items-start gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${speakerBadgeColors[segment.speaker]}`}>
                  {segment.speakerName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.floor(segment.startTime)}s - {Math.floor(segment.endTime)}s
                </span>
              </div>
              <p className="text-sm leading-relaxed">{segment.text}</p>
              {segment.emotionalState && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Emotional state: {segment.emotionalState}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  )
}
