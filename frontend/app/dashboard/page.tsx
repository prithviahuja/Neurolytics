'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { Consultation, PaginatedResponse } from '@/lib/types'
import { ArrowUpRight, BarChart3, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await apiClient.getConsultationHistory(1, 6)
        setConsultations(response.data)
      } catch (error) {
        console.error('[v0] Failed to fetch consultations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConsultations()
  }, [])

  // Calculate dashboard metrics
  const totalConsultations = consultations.length
  const highRiskCount = consultations.filter((c) => c.riskAssessment.level === 'high').length
  const avgRiskScore = Math.round(
    consultations.reduce((acc, c) => acc + c.riskAssessment.score, 0) / consultations.length || 0
  )

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
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome to your clinical analysis dashboard</p>
          </div>
          <Link href="/dashboard/analyze">
            <Button className="gap-2">
              <span>New Analysis</span>
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        className="grid md:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="p-6 border border-border/50 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Consultations</p>
                <p className="text-3xl font-bold mt-2">{totalConsultations}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6 border border-border/50 hover:border-danger/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Risk Cases</p>
                <p className="text-3xl font-bold mt-2 text-danger">{highRiskCount}</p>
              </div>
              <div className="p-3 bg-danger/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-danger" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6 border border-border/50 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                <p className="text-3xl font-bold mt-2">{avgRiskScore}%</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Clock className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent Consultations */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Consultations</h2>
          <Link href="/dashboard/history">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center text-muted-foreground">Loading consultations...</Card>
          ) : consultations.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No consultations yet. Upload your first consultation to get started.</p>
              <Link href="/dashboard/analyze" className="mt-4">
                <Button variant="outline">Upload Consultation</Button>
              </Link>
            </Card>
          ) : (
            consultations.map((consultation, idx) => {
              const riskColors = {
                low: 'text-green-600 bg-green-50 border-green-200',
                moderate: 'text-amber-600 bg-amber-50 border-amber-200',
                high: 'text-red-600 bg-red-50 border-red-200',
              }
              return (
                <motion.div
                  key={consultation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/dashboard/results/${consultation.id}`}>
                    <Card className="p-4 border border-border/50 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{consultation.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {consultation.providerName} • {new Date(consultation.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${riskColors[consultation.riskAssessment.level]}`}
                        >
                          {consultation.riskAssessment.level.toUpperCase()} RISK
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}
