'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Check if user has a valid session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidSession(!!session)
      setIsCheckingSession(false)

      if (!session) {
        toast.error('You must be logged in to set up your password')
        setTimeout(() => router.push('/login'), 2000)
      }
    }

    checkSession()
  }, [supabase.auth, router])

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
      } else {
        toast.success('Password created successfully!')
        // Redirect to projects after brief delay
        setTimeout(() => router.push('/projects'), 1000)
      }
    } catch (error) {
      console.error('Password setup failed:', error)
      toast.error('An unexpected error occurred')
      setLoading(false)
    }
  }

  // Loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Loading...</CardTitle>
            <CardDescription className="text-center">
              Please wait a moment
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Session Required</CardTitle>
            <CardDescription className="text-center">
              You must be logged in to set up your password
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome! Set up your password</CardTitle>
          <CardDescription>
            Before you can access the app, please create a secure password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating password...' : 'Create password and continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
