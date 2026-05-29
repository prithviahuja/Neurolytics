'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api-client'
import { Consultation } from '@/lib/types'
import { Search, Trash2, Download } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HistoryPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await apiClient.getConsultationHistory(1, 50)
        setConsultations(response.data)
      } catch (error) {
        console.error('[v0] Failed to fetch consultations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConsultations()
  }, [])

  const filteredConsultations = searchQuery
    ? consultations.filter(
        (c) =>
          c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.providerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : consultations

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this consultation?')) {
      try {
        await apiClient.deleteConsultation(id)
        setConsultations(consultations.filter((c) => c.id !== id))
      } catch (error) {
        console.error('[v0] Failed to delete consultation:', error)
      }
    }
  }

  const riskColors = {
    low: 'text-green-600 bg-green-50 border-green-200',
    moderate: 'text-amber-600 bg-amber-50 border-amber-200',
    high: 'text-red-600 bg-red-50 border-red-200',
  }

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-3xl font-bold">Consultation History</h1>
          <p className="text-muted-foreground mt-1">Browse and manage your past consultations</p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Consultations List */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Loading consultations...</p>
          </Card>
        ) : filteredConsultations.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? 'No consultations match your search' : 'No consultations yet'}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/analyze">
                <Button>Upload Your First Consultation</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConsultations.map((consultation, idx) => (
              <motion.div
                key={consultation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/dashboard/results/${consultation.id}`}>
                  <Card className="p-4 border border-border/50 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-lg">{consultation.patientName}</p>
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${riskColors[consultation.riskAssessment.level]}`}
                          >
                            {consultation.riskAssessment.level.toUpperCase()}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>{consultation.providerName}</span>
                          <span>•</span>
                          <span>{new Date(consultation.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{Math.round(consultation.duration / 60)}m duration</span>
                          <span>•</span>
                          <span>Risk Score: {Math.round(consultation.riskAssessment.score)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => {
                            e.preventDefault()
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault()
                            handleDelete(consultation.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
