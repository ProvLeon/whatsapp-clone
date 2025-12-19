import { io, Socket } from 'socket.io-client'
import { Profile, Room, Message } from './supabase'

let socket: Socket | null = null

export interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  created_at: string
  other_user?: Profile
}

export const getSocket = (): Socket | null => socket

export const initializeSocket = (token: string): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket)
      return
    }

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

    socket = io(serverUrl, {
      auth: { token },
    })

    socket.on('connect', () => {
      console.log('Connected to server:', socket?.id)
      resolve(socket!)
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message)
      reject(error)
    })
  })
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// =====================================================
// PROFILE OPERATIONS
// =====================================================

export const getProfile = (userId: string): Promise<Profile | null> => {
  return new Promise((resolve) => {
    socket?.emit('get_profile', userId, (response: { profile: Profile | null }) => {
      resolve(response.profile)
    })
  })
}

export const updateProfile = (updates: Partial<Profile>): Promise<Profile | null> => {
  return new Promise((resolve) => {
    socket?.emit('update_profile', updates, (response: { profile: Profile | null }) => {
      resolve(response.profile)
    })
  })
}

export const searchUsers = (query: string): Promise<Profile[]> => {
  return new Promise((resolve) => {
    socket?.emit('search_users', query, (response: { users: Profile[] }) => {
      resolve(response.users)
    })
  })
}

// =====================================================
// ROOM OPERATIONS
// =====================================================

export const createRoom = (name: string, description?: string, isPrivate?: boolean): Promise<Room | null> => {
  return new Promise((resolve) => {
    socket?.emit('create_room', { name, description, isPrivate }, (response: { room: Room | null }) => {
      resolve(response.room)
    })
  })
}

export const searchRooms = (query: string): Promise<Room[]> => {
  return new Promise((resolve) => {
    socket?.emit('search_rooms', query, (response: { rooms: Room[] }) => {
      resolve(response.rooms)
    })
  })
}

export const joinRoom = (roomId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    socket?.emit('join_room', roomId, (response: { success: boolean }) => {
      resolve(response.success)
    })
  })
}

export const leaveRoom = (roomId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    socket?.emit('leave_room', roomId, (response: { success: boolean }) => {
      resolve(response.success)
    })
  })
}

export const getRooms = (): Promise<Room[]> => {
  return new Promise((resolve) => {
    socket?.emit('get_rooms', (response: { rooms: Room[] }) => {
      resolve(response.rooms)
    })
  })
}

export const inviteToRoom = (roomId: string, userId: string): Promise<{ success: boolean; error: string | null }> => {
  return new Promise((resolve) => {
    socket?.emit('invite_to_room', { roomId, userId }, (response: { success: boolean; error: string | null }) => {
      resolve(response)
    })
  })
}

// =====================================================
// CONVERSATION OPERATIONS
// =====================================================

export const startConversation = (otherUserId: string): Promise<string | null> => {
  return new Promise((resolve) => {
    socket?.emit('start_conversation', otherUserId, (response: { conversationId: string | null }) => {
      resolve(response.conversationId)
    })
  })
}

export const getConversations = (): Promise<Conversation[]> => {
  return new Promise((resolve) => {
    socket?.emit('get_conversations', (response: { conversations: Conversation[] }) => {
      resolve(response.conversations)
    })
  })
}

// =====================================================
// MESSAGE OPERATIONS
// =====================================================

export const sendMessage = (
  content: string,
  chatId: string,
  chatType: 'room' | 'conversation',
  options?: {
    messageType?: Message['message_type']
    mediaUrl?: string
    mediaType?: string
    mediaName?: string
    mediaSize?: number
    replyTo?: string
  }
): Promise<Message | null> => {
  return new Promise((resolve) => {
    socket?.emit('send_message', { content, chatId, chatType, ...options }, (response: { message: Message | null }) => {
      resolve(response.message)
    })
  })
}

export const getMessages = (
  chatType: 'room' | 'conversation',
  chatId: string,
  limit?: number,
  before?: string
): Promise<Message[]> => {
  return new Promise((resolve) => {
    socket?.emit('get_messages', { chatType, chatId, limit, before }, (response: { messages: Message[] }) => {
      resolve(response.messages)
    })
  })
}

// =====================================================
// AI AVATAR
// =====================================================

export const generateAvatar = (prompt?: string, style?: 'cartoon' | 'realistic' | 'anime' | 'minimalist'): Promise<{ imageUrl: string | null; error: string | null }> => {
  return new Promise((resolve) => {
    socket?.emit('generate_avatar', { prompt, style }, resolve)
  })
}

// =====================================================
// ACCOUNT MANAGEMENT
// =====================================================

export const clearAllMessages = (): Promise<boolean> => {
  return new Promise((resolve) => {
    socket?.emit('clear_all_messages', (response: { success: boolean }) => {
      resolve(response.success)
    })
  })
}

export const deleteAccount = (): Promise<boolean> => {
  return new Promise((resolve) => {
    socket?.emit('delete_account', (response: { success: boolean }) => {
      resolve(response.success)
    })
  })
}
