'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-background/95 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground mt-2">
            Password recovery is not yet implemented in this demo. Use your existing credentials or sign in again.
          </p>
        </div>

        <Card className="p-6 border border-border/50 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            If you need to return to the login page, use the button below.
          </p>
          <Link href="/login">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Button>
          </Link>
        </Card>
      </div>
    </main>
  )
}
