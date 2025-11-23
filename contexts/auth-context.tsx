'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Extended user type that includes profile data from users table
export type ExtendedUser = User & {
  profile?: {
    first_name: string | null
    last_name: string | null
    role: string
    avatar_url: string | null
  }
}

type AuthContextType = {
  user: ExtendedUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUserProfile = useCallback(async (authUser: User): Promise<ExtendedUser> => {
    try {
      console.log('Fetching profile for user:', authUser.id)
      const { data: profile, error } = await supabase
        .from('users')
        .select('first_name, last_name, role, avatar_url')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })

        // If user profile doesn't exist, create it from auth metadata
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating from auth metadata...')
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              first_name: authUser.user_metadata?.first_name || '',
              last_name: authUser.user_metadata?.last_name || '',
              role: authUser.user_metadata?.role || 'member',
              avatar_url: authUser.user_metadata?.avatar_url || '',
            })
            .select('first_name, last_name, role, avatar_url')
            .single()

          if (insertError) {
            console.error('Error creating user profile:', insertError)
            return authUser
          }

          console.log('Profile created successfully:', newProfile)
          return {
            ...authUser,
            profile: newProfile || undefined,
          }
        }

        return authUser
      }

      console.log('Profile fetched successfully:', profile)
      return {
        ...authUser,
        profile: profile || undefined,
      }
    } catch (error) {
      console.error('Exception fetching user profile:', error)
      return authUser
    }
  }, [supabase])

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const extendedUser = await fetchUserProfile(session.user)
      setUser(extendedUser)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }: { data: { session: Session | null } }) => {
        if (session?.user) {
          const extendedUser = await fetchUserProfile(session.user)
          setUser(extendedUser)
        } else {
          setUser(null)
        }
      })
      .catch((error: any) => {
        console.error('auth getSession failed:', error)
        setUser(null)
      })
      .finally(() => setLoading(false))

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: Session | null) => {
      try {
        if (session?.user) {
          const extendedUser = await fetchUserProfile(session.user)
          setUser(extendedUser)
        } else {
          setUser(null)
        }
      } catch (error: any) {
        console.error('auth state change failed:', error)
        setUser(session?.user || null)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUserProfile, supabase])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      // Force redirect even if signOut fails
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
