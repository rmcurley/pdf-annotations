import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This route requires the Supabase service role key to create users
export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create client to verify current user using SSR helper
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get the email from request body
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Check if service role key is configured
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set' },
        { status: 500 }
      )
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    // Send invitation email
    // This sends an invitation email. The user will only be created after they accept
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        // You can add custom metadata here if needed
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      },
      redirectTo: `${appUrl}/auth/callback`
    })

    if (error) {
      console.error('Error inviting user:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: error.message || 'Failed to send invitation', details: error },
        { status: 400 }
      )
    }

    // Note: The user record in auth.users is created immediately, but won't be confirmed
    // until they click the link and set their password. The trigger will create the
    // public.users record when they complete signup.

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      user: data.user
    })

  } catch (error) {
    console.error('Unexpected error in invite-user route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
