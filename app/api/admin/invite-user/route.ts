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

    // Get the data from request body
    const { email, firstName, lastName, role, projectIds } = await request.json()

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
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        first_name: firstName,
        last_name: lastName,
        role: role || 'user',
      },
      redirectTo: `${appUrl}/auth/callback`
    })

    if (error) {
      console.error('Error inviting user:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))

      // Check if user exists in public.users but invitation failed
      const { data: existingProfile } = await adminClient
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single()

      if (existingProfile) {
        return NextResponse.json(
          { error: 'A user with this email has already been invited. They may need to check their email to accept the invitation.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: error.message || 'Failed to send invitation', details: error },
        { status: 400 }
      )
    }

    // The invited user ID from auth.users
    const invitedUserId = data.user?.id

    if (!invitedUserId) {
      return NextResponse.json(
        { error: 'Failed to get invited user ID' },
        { status: 500 }
      )
    }

    // Create the user profile in public.users table immediately
    // This allows us to assign projects right away
    const { error: profileError } = await adminClient
      .from('users')
      .insert({
        id: invitedUserId,
        email: email,
        first_name: firstName || null,
        last_name: lastName || null,
        role: role || 'user',
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Check if it's a duplicate key error (user already exists in public.users)
      if (profileError.code === '23505') {
        // User already exists in public.users, update instead
        const { error: updateError } = await adminClient
          .from('users')
          .update({
            first_name: firstName || null,
            last_name: lastName || null,
            role: role || 'user',
          })
          .eq('id', invitedUserId)

        if (updateError) {
          console.error('Error updating existing user profile:', updateError)
        }
      }
    }

    // Create project memberships if projects were selected
    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      const memberships = projectIds.map(projectId => ({
        project_id: projectId,
        user_id: invitedUserId,
        role: 'member',
      }))

      const { error: membershipError } = await adminClient
        .from('project_members')
        .insert(memberships)

      if (membershipError) {
        console.error('Error creating project memberships:', membershipError)
        // Don't fail the whole operation, but log it
      }
    }

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
