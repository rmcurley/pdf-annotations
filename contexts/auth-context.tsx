'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Timeout constants
const PROFILE_FETCH_TIMEOUT = 10000 // 10 seconds for individual profile fetch
const MAX_LOADING_TIME = 15000 // 15 seconds max before giving up on loading
const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache TTL

// Utility to add timeout to promises
const withTimeout = <T,>(promiseOrThenable: Promise<T> | PromiseLike<T>, ms: number, operationName: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${operationName} timed out after ${ms}ms`)), ms)
  )
  // Ensure we're working with a proper Promise
  const promise = Promise.resolve(promiseOrThenable)
  return Promise.race([promise, timeout])
}

// Debug logging with timestamps
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[Auth ${timestamp}] ${message}`, data)
  } else {
    console.log(`[Auth ${timestamp}] ${message}`)
  }
}

// Performance timing utility
const logTiming = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime
  debugLog(`⏱️ ${operation} took ${duration}ms`)
  return duration
}

// Profile cache utilities
type CachedProfile = {
  profile: {
    first_name: string | null
    last_name: string | null
    role: string
    avatar_url: string | null
  }
  timestamp: number
}

const getCachedProfile = (userId: string): CachedProfile | null => {
  try {
    const cached = localStorage.getItem(`profile_${userId}`)
    if (!cached) return null

    const data = JSON.parse(cached) as CachedProfile
    const age = Date.now() - data.timestamp

    if (age > PROFILE_CACHE_TTL) {
      debugLog('Profile cache expired', { userId, age })
      localStorage.removeItem(`profile_${userId}`)
      return null
    }

    debugLog('Profile cache hit', { userId, age })
    return data
  } catch (error) {
    debugLog('Error reading profile cache:', error)
    return null
  }
}

const setCachedProfile = (userId: string, profile: CachedProfile['profile']) => {
  try {
    const data: CachedProfile = {
      profile,
      timestamp: Date.now()
    }
    localStorage.setItem(`profile_${userId}`, JSON.stringify(data))
    debugLog('Profile cached', { userId })
  } catch (error) {
    debugLog('Error caching profile:', error)
  }
}

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
  const loadingRef = useRef(true) // Ref to track loading state for timeout callback
  const supabase = createClient()

  const fetchUserProfile = useCallback(async (authUser: User): Promise<ExtendedUser> => {
    const overallStart = Date.now()

    try {
      debugLog('Fetching profile for user:', authUser.id)

      // Check cache first
      const cached = getCachedProfile(authUser.id)
      if (cached) {
        logTiming('Total (from cache)', overallStart)
        return {
          ...authUser,
          profile: cached.profile,
        }
      }

      // Time the database query
      debugLog('Cache miss, querying database')
      const queryStart = Date.now()

      const { data: profile, error } = await withTimeout(
        supabase
          .from('users')
          .select('first_name, last_name, role, avatar_url')
          .eq('id', authUser.id)
          .single(),
        PROFILE_FETCH_TIMEOUT,
        'Profile fetch'
      ) as { data: { first_name: string | null; last_name: string | null; role: string; avatar_url: string | null } | null; error: any }

      const queryDuration = logTiming('Database query', queryStart)

      if (error) {
        debugLog('Error fetching user profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          queryDuration
        })

        // If user profile doesn't exist, create it from auth metadata
        if (error.code === 'PGRST116') {
          debugLog('User profile not found, creating from auth metadata...')
          const insertStart = Date.now()

          const { data: newProfile, error: insertError } = await withTimeout(
            supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: authUser.email || '',
                first_name: authUser.user_metadata?.first_name || '',
                last_name: authUser.user_metadata?.last_name || '',
                role: authUser.user_metadata?.role || 'user',
                avatar_url: authUser.user_metadata?.avatar_url || '',
              })
              .select('first_name, last_name, role, avatar_url')
              .single(),
            PROFILE_FETCH_TIMEOUT,
            'Profile creation'
          ) as { data: { first_name: string | null; last_name: string | null; role: string; avatar_url: string | null } | null; error: any }

          logTiming('Profile insert', insertStart)

          if (insertError) {
            debugLog('Error creating user profile:', insertError)
            logTiming('Total (with error)', overallStart)
            return authUser
          }

          debugLog('Profile created successfully:', newProfile)

          if (newProfile) {
            setCachedProfile(authUser.id, newProfile)
          }

          logTiming('Total (created new profile)', overallStart)
          return {
            ...authUser,
            profile: newProfile || undefined,
          }
        }

        logTiming('Total (with error)', overallStart)
        return authUser
      }

      debugLog('Profile fetched successfully:', profile)

      if (profile) {
        setCachedProfile(authUser.id, profile)
      }

      logTiming('Total (from database)', overallStart)
      return {
        ...authUser,
        profile: profile || undefined,
      }
    } catch (error) {
      const totalDuration = logTiming('Total (exception)', overallStart)
      debugLog('Exception fetching user profile (may be timeout):', { error, totalDuration })
      // Return user without profile - app can still function
      return authUser
    }
  }, [supabase])

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // Clear cached profile to force fresh fetch
      try {
        localStorage.removeItem(`profile_${session.user.id}`)
        debugLog('Profile cache cleared for refresh')
      } catch (error) {
        debugLog('Error clearing profile cache:', error)
      }

      const extendedUser = await fetchUserProfile(session.user)
      setUser(extendedUser)
    }
  }

  useEffect(() => {
    let isMounted = true
    let loadingTimeoutId: NodeJS.Timeout | null = null

    // Safety net: if loading takes too long, force it to complete
    loadingTimeoutId = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        debugLog('MAX_LOADING_TIME exceeded, forcing loading to complete')
        loadingRef.current = false
        setLoading(false)
      }
    }, MAX_LOADING_TIME)

    // Get initial session
    const initAuth = async () => {
      debugLog('Starting auth initialization')

      try {
        const sessionPromise = supabase.auth.getSession()
        const { data: { session } } = await withTimeout(
          sessionPromise,
          PROFILE_FETCH_TIMEOUT,
          'getSession'
        )

        debugLog('Session retrieved:', session ? 'User logged in' : 'No session')

        if (!isMounted) return

        if (session?.user) {
          const extendedUser = await fetchUserProfile(session.user)
          if (isMounted) {
            setUser(extendedUser)
          }
        } else {
          if (isMounted) {
            setUser(null)
          }
        }
      } catch (error: any) {
        debugLog('Auth initialization failed:', error)
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          debugLog('Auth initialization complete')
          loadingRef.current = false
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: Session | null) => {
      debugLog('Auth state changed:', _event)

      if (!isMounted) return

      try {
        if (session?.user) {
          const extendedUser = await fetchUserProfile(session.user)
          if (isMounted) {
            setUser(extendedUser)
          }
        } else {
          if (isMounted) {
            setUser(null)
          }
        }
      } catch (error: any) {
        debugLog('Auth state change handler failed:', error)
        if (isMounted) {
          setUser(session?.user || null)
        }
      } finally {
        if (isMounted) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId)
      }
      subscription.unsubscribe()
      debugLog('Auth context cleanup')
    }
  // Note: loading is intentionally NOT in deps - we only want this to run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
