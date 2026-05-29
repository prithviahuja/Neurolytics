'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Activity, Brain, TrendingUp, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  }

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced machine learning detects stress and anxiety patterns from clinical dialogue',
    },
    {
      icon: Activity,
      title: 'Real-Time Processing',
      description: 'Live processing visualization with step-by-step analysis progress',
    },
    {
      icon: TrendingUp,
      title: 'Comprehensive Metrics',
      description: 'Acoustic and NLP analysis with detailed consultation timeline',
    },
    {
      icon: Shield,
      title: 'HIPAA Compliant',
      description: 'Enterprise-grade security with patient data protection',
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Neurolytics</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
              <span>✨ AI-Powered Clinical Insights</span>
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl font-bold tracking-tight text-balance">
            Detect Stress & Anxiety in Clinical Consultations
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced AI analysis of doctor-patient conversations to identify stress indicators and risk factors with
            real-time processing and comprehensive insights.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In to Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="px-4 sm:px-6 lg:px-8 py-20 border-t border-border/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <div className="mx-auto max-w-6xl">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need for clinical dialogue analysis</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="h-full p-6 border border-border/50 hover:border-primary/50 transition-colors">
                    <Icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        className="px-4 sm:px-6 lg:px-8 py-20 border-t border-border/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <div className="mx-auto max-w-4xl">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          </motion.div>

          <div className="space-y-8">
            {[
              { step: '1', title: 'Upload Audio', desc: 'Record or upload your clinical consultation' },
              { step: '2', title: 'Real-Time Processing', desc: 'Watch AI analyze speech patterns and content' },
              { step: '3', title: 'Get Insights', desc: 'Receive comprehensive risk assessment and metrics' },
              { step: '4', title: 'Take Action', desc: 'Review detailed reports and recommendations' },
            ].map((item, idx) => (
              <motion.div key={idx} variants={itemVariants} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-primary font-semibold">{item.step}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="px-4 sm:px-6 lg:px-8 py-20 border-t border-border/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <div className="mx-auto max-w-2xl text-center space-y-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-12 border border-primary/20">
          <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold">
            Ready to Get Started?
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground">
            Join healthcare providers using AI-powered analysis to improve patient care.
          </motion.p>
          <motion.div variants={itemVariants}>
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Create Your Account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>© 2024 Neurolytics. HIPAA Compliant. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
