'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleTokens = async () => {
      // Get the hash fragment from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && refreshToken) {
        // Set the session using the tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('Error setting session:', error)
          router.push('/auth/auth-code-error')
          return
        }

        // If this is an invite, redirect to password setup (required)
        // Otherwise redirect to projects
        if (type === 'invite') {
          router.push('/setup-password')
        } else {
          router.push('/projects')
        }
      } else {
        // No tokens found, redirect to error page
        router.push('/auth/auth-code-error')
      }
    }

    handleTokens()
  }, [router, supabase.auth])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Confirming your account...</h1>
        <p className="text-muted-foreground">Please wait while we complete your sign in.</p>
      </div>
    </div>
  )
}
