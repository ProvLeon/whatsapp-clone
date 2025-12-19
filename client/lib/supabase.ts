import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.error('Please create a .env.local file with:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your-supabase-url')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  status: string | null
  is_online: boolean
  last_seen: string
  created_at: string
}

export interface Room {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  is_private: boolean
  created_by: string | null
  created_at: string
}

export interface Message {
  id: string
  sender_id: string | null
  room_id: string | null
  conversation_id: string | null
  content: string | null
  message_type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'system'
  media_url: string | null
  media_type: string | null
  media_name: string | null
  media_size: number | null
  reply_to: string | null
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  sender?: Profile
}

// =====================================================
// AUTH HELPERS
// =====================================================

export const signUp = async (email: string, password: string, username: string) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: username } },
  })
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const getSession = async () => {
  return await supabase.auth.getSession()
}
