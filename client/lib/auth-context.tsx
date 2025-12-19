'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from './supabase'
import { initializeSocket, disconnectSocket, getSocket } from './socket'

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

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.access_token) {
        try {
          const socket = await initializeSocket(session.access_token)
          setSocketConnected(true)

          // Listen for authenticated event to get profile
          socket.on('authenticated', (data: { profile: Profile }) => {
            setProfile(data.profile)
          })
        } catch (error) {
          console.error('Socket connection failed:', error)
        }
      }

      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_OUT') {
          disconnectSocket()
          setSocketConnected(false)
          setProfile(null)
        } else if (session?.access_token && !getSocket()?.connected) {
          try {
            const socket = await initializeSocket(session.access_token)
            setSocketConnected(true)

            socket.on('authenticated', (data: { profile: Profile }) => {
              setProfile(data.profile)
            })
          } catch (error) {
            console.error('Socket connection failed:', error)
          }
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      disconnectSocket()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, socketConnected }}>
      {children}
    </AuthContext.Provider>
  )
}
