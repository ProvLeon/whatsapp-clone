'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from './supabase'
import { initializeSocket, disconnectSocket, isSocketConnected } from './socket'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  socketConnected: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  socketConnected: false,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)

  // Use refs to prevent duplicate initializations
  const initializingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const connectSocket = async (accessToken: string) => {
      // Prevent duplicate connection attempts
      if (initializingRef.current || isSocketConnected()) {
        return
      }

      initializingRef.current = true

      try {
        const socket = await initializeSocket(accessToken)

        if (!mountedRef.current) {
          // Component unmounted during connection, disconnect
          disconnectSocket()
          return
        }

        setSocketConnected(true)

        // Remove any existing listener before adding new one
        socket.off('authenticated')
        socket.on('authenticated', (data: { profile: Profile }) => {
          if (mountedRef.current) {
            setProfile(data.profile)
          }
        })

        // Handle disconnect/reconnect events
        socket.off('disconnect')
        socket.on('disconnect', () => {
          if (mountedRef.current) {
            setSocketConnected(false)
          }
        })

        socket.off('connect')
        socket.on('connect', () => {
          if (mountedRef.current) {
            setSocketConnected(true)
          }
        })
      } catch (error) {
        console.error('Socket connection failed:', error)
      } finally {
        initializingRef.current = false
      }
    }

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mountedRef.current) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.access_token) {
        await connectSocket(session.access_token)
      }

      if (mountedRef.current) {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (!mountedRef.current) return

        console.log('Auth event:', event)
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_OUT') {
          disconnectSocket()
          setSocketConnected(false)
          setProfile(null)
        } else if (session?.access_token && !isSocketConnected()) {
          await connectSocket(session.access_token)
        }

        if (mountedRef.current) {
          setLoading(false)
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      // Only disconnect if we're truly unmounting (not just re-rendering)
      // In production, the AuthProvider shouldn't remount
      disconnectSocket()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, socketConnected }}>
      {children}
    </AuthContext.Provider>
  )
}
