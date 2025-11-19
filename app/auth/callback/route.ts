import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const resolveBaseUrl = (request: Request) => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, "")

  const forwardedHost = request.headers.get("x-forwarded-host")
  if (forwardedHost) {
    const proto =
      request.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https")
    return `${proto}://${forwardedHost}`
  }

  return new URL(request.url).origin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const baseUrl = resolveBaseUrl(request)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        const origin = new URL(request.url).origin
        return NextResponse.redirect(`${origin}${next}`)
      }
      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // Handle token hash from invite/magic link (implicit flow)
  // Supabase sends tokens in the URL fragment for invites
  // We need to redirect to a page that can process the fragment on the client side
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error?error=${error}&description=${errorDescription}`)
  }

  // If there's no code but also no error, the tokens might be in the hash
  // Redirect to a client-side page that can extract them
  return NextResponse.redirect(`${baseUrl}/auth/confirm`)
}
