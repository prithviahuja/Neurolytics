'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { Activity } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const router = useRouter()
  const { signup, loading, error } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    try {
      await signup(email, password, name)
      router.push('/dashboard')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Signup failed')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-background/95 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">Neurolytics</span>
            </div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-muted-foreground mt-2">Join us to start analyzing clinical consultations</p>
          </div>

          <Card className="p-6 border border-border/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {(error || localError) && (
                <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-md text-sm text-destructive">
                  {error || localError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </main>
  )
}
