'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { useNotifications, showBrowserNotification } from '@/lib/notifications'
import { Profile, Room, Message } from '@/lib/supabase'
import {
  getSocket,
  getRooms,
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  searchRooms,
  searchUsers,
  joinRoom,
  leaveRoom,
  createRoom,
  inviteToRoom,
  Conversation,
} from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/EmojiPicker'
import { EmojiSuggestions } from '@/components/EmojiSuggestions'
import { MessageContent } from '@/components/MessageContent'
import { MediaMessage } from '@/components/MediaMessage'
import { SettingsPanel } from '@/components/SettingsPanel'
import { RichMessageInput, RichMessageInputRef } from '@/components/RichMessageInput'
import { Emoji, parseEmojisInMessage } from '@/lib/emoji-data'
import {
  SendHorizonal,
  Smile,
  Search,
  Plus,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  Paperclip,
  Loader2,
  ChevronLeft,
  UserPlus,
  DoorOpen,
  MoreVertical,
  Hash,
  UserPlus2,
  X,
} from 'lucide-react'

type ChatType = 'room' | 'conversation' | null
type SidebarView = 'chats' | 'search-users' | 'search-rooms' | 'create-room' | 'settings'

interface ActiveChat {
  type: ChatType
  id: string
  name: string
  avatar?: string | null
  isOnline?: boolean
}

export default function Home() {
  const router = useRouter()
  const { user, profile, loading: authLoading, socketConnected } = useAuth()
  const {
    addNotification,
    incrementUnread,
    clearUnread,
    unreadCounts,
    requestNotificationPermission,
  } = useNotifications()

  // Chat state
  const [rooms, setRooms] = useState<Room[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null)
  const [message, setMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingChats, setLoadingChats] = useState(true)

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UI state
  const [sidebarView, setSidebarView] = useState<SidebarView>('chats')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<(Profile | Room)[]>([])
  const [searching, setSearching] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Media upload
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Room creation
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  // Room invite modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSearchQuery, setInviteSearchQuery] = useState('')
  const [inviteSearchResults, setInviteSearchResults] = useState<Profile[]>([])
  const [inviteSearching, setInviteSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)

  const inputRef = useRef<RichMessageInputRef>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  // Shortcode detection for emoji suggestions
  const shortcodeMatch = useMemo(() => {
    const match = message.match(/:([a-zA-Z0-9_]*)$/)
    if (match && match[1].length > 0) {
      return { query: match[1], startIndex: message.lastIndexOf(':' + match[1]) }
    }
    return null
  }, [message])

  // Get typing indicator text
  const typingIndicator = useMemo(() => {
    if (!activeChat) return null
    const users = Array.from(typingUsers.values())
    if (users.length === 0) return null
    if (users.length === 1) return `${users[0]} is typing...`
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`
    return `${users.length} people are typing...`
  }, [typingUsers, activeChat])

  // Calculate total unread count
  const totalUnread = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
  }, [unreadCounts])

  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'WhatsApp Annex'
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`
    } else {
      document.title = baseTitle
    }
  }, [totalUnread])

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingIndicator])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  // Load rooms and conversations when socket connects
  useEffect(() => {
    if (!socketConnected) return

    const loadChats = async () => {
      setLoadingChats(true)
      const [roomsData, convsData] = await Promise.all([
        getRooms(),
        getConversations(),
      ])
      setRooms(roomsData)
      setConversations(convsData)
      setLoadingChats(false)
    }

    loadChats()
  }, [socketConnected])

  // Request notification permission on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      requestNotificationPermission()
      document.removeEventListener('click', handleFirstInteraction)
    }
    document.addEventListener('click', handleFirstInteraction)
    return () => document.removeEventListener('click', handleFirstInteraction)
  }, [requestNotificationPermission])

  // Set up socket event listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Receive messages
    const handleReceiveMessage = (msg: Message) => {
      const isActiveRoomMessage = activeChat?.type === 'room' && msg.room_id === activeChat.id
      const isActiveConvMessage = activeChat?.type === 'conversation' && msg.conversation_id === activeChat.id
      const isInActiveChat = isActiveRoomMessage || isActiveConvMessage
      const isOwnMessage = msg.sender_id === user?.id

      if (isInActiveChat) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }

      // Show notification for messages not in active chat and not from self
      if (!isInActiveChat && !isOwnMessage && msg.message_type !== 'system') {
        const chatId = msg.room_id || msg.conversation_id || ''
        const senderName = msg.sender?.display_name || msg.sender?.username || 'Someone'
        const senderAvatar = msg.sender?.avatar_url ?? undefined

        // Find chat name
        let chatName = senderName
        if (msg.room_id) {
          const room = rooms.find((r) => r.id === msg.room_id)
          chatName = room?.name || 'Room'
        }

        // Increment unread count
        incrementUnread(chatId)

        // Show in-app toast notification
        addNotification({
          type: 'message',
          title: chatName,
          message: msg.content || (msg.media_type ? `Sent ${msg.media_type}` : 'New message'),
          avatar: senderAvatar || undefined,
          onClick: () => {
            // Navigate to the chat when clicked
            if (msg.room_id) {
              const room = rooms.find((r) => r.id === msg.room_id)
              if (room) {
                setActiveChat({
                  type: 'room',
                  id: room.id,
                  name: room.name,
                  avatar: room.avatar_url,
                })
                setShowMobileChat(true)
              }
            } else if (msg.conversation_id) {
              const conv = conversations.find((c) => c.id === msg.conversation_id)
              if (conv) {
                setActiveChat({
                  type: 'conversation',
                  id: conv.id,
                  name: conv.other_user?.display_name || conv.other_user?.username || 'User',
                  avatar: conv.other_user?.avatar_url,
                  isOnline: conv.other_user?.is_online,
                })
                setShowMobileChat(true)
              }
            }
          },
        })

        // Show browser notification if page is not focused
        if (document.hidden) {
          showBrowserNotification(chatName, {
            body: msg.content || 'New message',
            icon: senderAvatar || '/icon-192.png',
            tag: chatId, // Prevents duplicate notifications for same chat
            onClick: () => {
              window.focus()
            },
          })
        }
      }
    }

    // Typing indicator
    const handleUserTyping = (data: { username: string; userId: string; chatId: string; isTyping: boolean }) => {
      if (data.chatId !== activeChat?.id) return

      setTypingUsers((prev) => {
        const next = new Map(prev)
        if (data.isTyping) {
          next.set(data.userId, data.username)
        } else {
          next.delete(data.userId)
        }
        return next
      })
    }

    // User joined room
    const handleUserJoinedRoom = (data: { roomId: string; user: Profile }) => {
      if (activeChat?.id === data.roomId) {
        // Add system message
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            sender_id: null,
            room_id: data.roomId,
            conversation_id: null,
            content: `${data.user.display_name || data.user.username} joined the room`,
            message_type: 'system',
            media_url: null,
            media_type: null,
            media_name: null,
            media_size: null,
            reply_to: null,
            is_edited: false,
            is_deleted: false,
            created_at: new Date().toISOString(),
          },
        ])
      }
    }

    // User left room
    const handleUserLeftRoom = (data: { roomId: string; user: Profile }) => {
      if (activeChat?.id === data.roomId) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            sender_id: null,
            room_id: data.roomId,
            conversation_id: null,
            content: `${data.user.display_name || data.user.username} left the room`,
            message_type: 'system',
            media_url: null,
            media_type: null,
            media_name: null,
            media_size: null,
            reply_to: null,
            is_edited: false,
            is_deleted: false,
            created_at: new Date().toISOString(),
          },
        ])
      }
    }

    // New conversation started by another user - add it to the list
    const handleNewConversation = (data: { conversationId: string; other_user: Profile }) => {
      setConversations((prev) => {
        // Avoid duplicates
        if (prev.some((c) => c.id === data.conversationId)) return prev
        return [
          ...prev,
          {
            id: data.conversationId,
            participant_1: data.other_user.id,
            participant_2: profile?.id || '',
            created_at: new Date().toISOString(),
            other_user: data.other_user,
          },
        ]
      })

      // Show notification for new conversation
      const senderName = data.other_user.display_name || data.other_user.username
      addNotification({
        type: 'message',
        title: 'New Chat',
        message: `${senderName} started a conversation with you`,
        avatar: data.other_user.avatar_url ?? undefined,
        onClick: () => {
          setActiveChat({
            type: 'conversation',
            id: data.conversationId,
            name: senderName,
            avatar: data.other_user.avatar_url,
            isOnline: data.other_user.is_online,
          })
          setShowMobileChat(true)
        },
      })

      // Browser notification if page not focused
      if (document.hidden) {
        showBrowserNotification('New Chat', {
          body: `${senderName} started a conversation with you`,
          icon: data.other_user.avatar_url || '/icon-192.png',
          tag: `new-conv-${data.conversationId}`,
        })
      }
    }

    // Room invitation received - add room to list
    const handleRoomInvitation = (data: { room: Room; invitedBy: Profile }) => {
      setRooms((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.id === data.room.id)) return prev
        return [...prev, data.room]
      })

      // Show notification for room invitation
      const inviterName = data.invitedBy.display_name || data.invitedBy.username
      addNotification({
        type: 'room_invite',
        title: 'Room Invitation',
        message: `${inviterName} invited you to "${data.room.name}"`,
        avatar: data.invitedBy.avatar_url ?? undefined,
        onClick: () => {
          setActiveChat({
            type: 'room',
            id: data.room.id,
            name: data.room.name,
            avatar: data.room.avatar_url,
          })
          setShowMobileChat(true)
        },
      })

      // Browser notification if page not focused
      if (document.hidden) {
        showBrowserNotification('Room Invitation', {
          body: `${inviterName} invited you to "${data.room.name}"`,
          icon: data.invitedBy.avatar_url || '/icon-192.png',
          tag: `room-invite-${data.room.id}`,
        })
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('user_typing', handleUserTyping)
    socket.on('user_joined_room', handleUserJoinedRoom)
    socket.on('user_left_room', handleUserLeftRoom)
    socket.on('new_conversation', handleNewConversation)
    socket.on('room_invitation', handleRoomInvitation)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('user_typing', handleUserTyping)
      socket.off('user_joined_room', handleUserJoinedRoom)
      socket.off('user_left_room', handleUserLeftRoom)
      socket.off('new_conversation', handleNewConversation)
      socket.off('room_invitation', handleRoomInvitation)
    }
  }, [activeChat, profile?.id, user?.id, rooms, conversations, addNotification, incrementUnread])

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat || !socketConnected) return

    // Clear unread count for this chat
    clearUnread(activeChat.id)

    const loadMessages = async () => {
      setLoadingMessages(true)
      setTypingUsers(new Map())
      const msgs = await getMessages(activeChat.type!, activeChat.id)
      setMessages(msgs)
      setLoadingMessages(false)
    }

    loadMessages()
  }, [activeChat, socketConnected, clearUnread])

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !socketConnected) {
      setSearchResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setSearching(true)
      if (sidebarView === 'search-users') {
        const users = await searchUsers(searchQuery)
        setSearchResults(users)
      } else if (sidebarView === 'search-rooms') {
        const rooms = await searchRooms(searchQuery)
        setSearchResults(rooms)
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchQuery, sidebarView, socketConnected])

  const handleTyping = useCallback((val: string) => {
    setMessage(val)

    const socket = getSocket()
    if (socket && activeChat) {
      socket.emit('typing', {
        chatId: activeChat.id,
        chatType: activeChat.type,
        isTyping: true,
      })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      getSocket()?.emit('typing', {
        chatId: activeChat?.id,
        chatType: activeChat?.type,
        isTyping: false,
      })
    }, 1000)
  }, [activeChat])

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !activeChat) return

    const parsedMessage = parseEmojisInMessage(message)
    setMessage('')
    setShowEmojiPicker(false)

    // Stop typing indicator
    const socket = getSocket()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    socket?.emit('typing', {
      chatId: activeChat.id,
      chatType: activeChat.type,
      isTyping: false,
    })

    await sendMessage(parsedMessage, activeChat.id, activeChat.type!)
  }, [message, activeChat])

  const handleEmojiSelect = useCallback((emoji: Emoji) => {
    const emojiMarker = `[[EMOJI:${emoji.url}]]`
    setMessage((prev) => prev + emojiMarker)
    // Focus after state update
    setTimeout(() => {
      inputRef.current?.focus()
    }, 10)
    setShowEmojiPicker(false)
  }, [])

  const handleEmojiSuggestionSelect = useCallback((emoji: Emoji) => {
    if (shortcodeMatch) {
      const beforeShortcode = message.slice(0, shortcodeMatch.startIndex)
      const emojiMarker = `[[EMOJI:${emoji.url}]]`
      setMessage(beforeShortcode + emojiMarker)
      // Focus after state update
      setTimeout(() => {
        inputRef.current?.focus()
      }, 10)
    }
  }, [shortcodeMatch, message])

  const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return

    setUploading(true)

    try {
      const socket = getSocket()

      // Get signed upload URL from server
      socket?.emit('get_upload_url',
        { bucket: 'media', fileName: file.name },
        async (response: { signedUrl: string; path: string; publicUrl: string; error: string | null }) => {
          if (response.error) {
            console.error('Upload URL error:', response.error)
            setUploading(false)
            return
          }

          // Upload file directly to Supabase storage
          const uploadResponse = await fetch(response.signedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })

          if (!uploadResponse.ok) {
            console.error('Upload failed')
            setUploading(false)
            return
          }

          // Determine message type
          const messageType = file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
              ? 'video'
              : file.type.startsWith('audio/')
                ? 'audio'
                : 'file'

          // Send message with media
          await sendMessage('', activeChat.id, activeChat.type!, {
            messageType,
            mediaUrl: response.publicUrl,
            mediaType: file.type,
            mediaName: file.name,
            mediaSize: file.size,
          })

          setUploading(false)
        }
      )
    } catch (error) {
      console.error('Upload failed:', error)
      setUploading(false)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [activeChat])

  const handleStartConversation = useCallback(async (otherUser: Profile) => {
    const convId = await startConversation(otherUser.id)
    if (convId) {
      setActiveChat({
        type: 'conversation',
        id: convId,
        name: otherUser.display_name || otherUser.username,
        avatar: otherUser.avatar_url,
        isOnline: otherUser.is_online,
      })
      setSidebarView('chats')
      setSearchQuery('')
      setShowMobileChat(true)

      // Refresh conversations list
      const convs = await getConversations()
      setConversations(convs)
    }
  }, [])

  const handleJoinRoom = useCallback(async (room: Room) => {
    const success = await joinRoom(room.id)
    if (success) {
      setActiveChat({
        type: 'room',
        id: room.id,
        name: room.name,
        avatar: room.avatar_url,
      })
      setSidebarView('chats')
      setSearchQuery('')
      setShowMobileChat(true)

      // Refresh rooms list
      const roomsData = await getRooms()
      setRooms(roomsData)
    }
  }, [])

  const handleLeaveRoom = useCallback(async () => {
    if (!activeChat || activeChat.type !== 'room') return

    const success = await leaveRoom(activeChat.id)
    if (success) {
      setActiveChat(null)
      setShowMobileChat(false)

      const roomsData = await getRooms()
      setRooms(roomsData)
    }
  }, [activeChat])

  const handleCreateRoom = useCallback(async () => {
    if (!newRoomName.trim()) return

    setCreatingRoom(true)
    const room = await createRoom(newRoomName, newRoomDesc)

    if (room) {
      setActiveChat({
        type: 'room',
        id: room.id,
        name: room.name,
        avatar: room.avatar_url,
      })
      setNewRoomName('')
      setNewRoomDesc('')
      setSidebarView('chats')
      setShowMobileChat(true)

      const roomsData = await getRooms()
      setRooms(roomsData)
    }
    setCreatingRoom(false)
  }, [newRoomName, newRoomDesc])

  // Handle invite search
  useEffect(() => {
    if (!inviteSearchQuery.trim()) {
      setInviteSearchResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setInviteSearching(true)
      const users = await searchUsers(inviteSearchQuery)
      setInviteSearchResults(users)
      setInviteSearching(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [inviteSearchQuery])

  const handleInviteUser = useCallback(async (userToInvite: Profile) => {
    if (!activeChat || activeChat.type !== 'room') return

    setInviting(userToInvite.id)
    const result = await inviteToRoom(activeChat.id, userToInvite.id)

    if (result.success) {
      console.log(`Successfully invited ${userToInvite.username} to the room`)
      // Optionally close the modal or show success
      setInviteSearchQuery('')
      setInviteSearchResults([])
    } else {
      console.error('Failed to invite user:', result.error)
      alert(result.error || 'Failed to invite user')
    }
    setInviting(null)
  }, [activeChat])

  const handleSignOut = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase')
    await supabase.auth.signOut()
    router.push('/auth')
  }, [router])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 bg-white border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-primary font-semibold text-lg">
                  {profile.username[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <p className="font-semibold text-gray-900 text-sm">
                {profile.display_name || profile.username}
              </p>
              <p className="text-xs text-gray-500">@{profile.username}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarView('settings')}
              className="text-gray-600"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-gray-600"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarView === 'settings' ? (
            <SettingsPanel onBack={() => setSidebarView('chats')} />
          ) : sidebarView === 'chats' ? (
            <>
              {/* Action Buttons */}
              <div className="p-3 flex gap-2 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setSidebarView('search-users')}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> New Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setSidebarView('search-rooms')}
                >
                  <Users className="w-4 h-4 mr-1" /> Join Room
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => setSidebarView('create-room')}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Chats List */}
              <div className="flex-1 overflow-y-auto">
                {loadingChats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    {/* Rooms Section */}
                    {rooms.length > 0 && (
                      <div className="py-2">
                        <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                          Rooms ({rooms.length})
                        </p>
                        {rooms.map((room) => (
                          <button
                            key={room.id}
                            onClick={() => {
                              setActiveChat({
                                type: 'room',
                                id: room.id,
                                name: room.name,
                                avatar: room.avatar_url,
                              })
                              setShowMobileChat(true)
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition ${activeChat?.id === room.id ? 'bg-primary/5' : ''
                              }`}
                          >
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              {room.avatar_url ? (
                                <Image
                                  src={room.avatar_url}
                                  alt={room.name}
                                  width={48}
                                  height={48}
                                  className="object-cover w-full h-full rounded-full"
                                  unoptimized
                                />
                              ) : (
                                <Hash className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {room.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {room.description || 'Group chat'}
                              </p>
                            </div>
                            {/* Unread badge */}
                            {unreadCounts[room.id] > 0 && (
                              <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs font-semibold text-white">
                                  {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Conversations Section */}
                    {conversations.length > 0 && (
                      <div className="py-2">
                        <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                          Direct Messages ({conversations.length})
                        </p>
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              setActiveChat({
                                type: 'conversation',
                                id: conv.id,
                                name:
                                  conv.other_user?.display_name ||
                                  conv.other_user?.username ||
                                  'User',
                                avatar: conv.other_user?.avatar_url,
                                isOnline: conv.other_user?.is_online,
                              })
                              setShowMobileChat(true)
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition ${activeChat?.id === conv.id ? 'bg-primary/5' : ''
                              }`}
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                {conv.other_user?.avatar_url ? (
                                  <Image
                                    src={conv.other_user.avatar_url}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className="object-cover w-full h-full"
                                    unoptimized
                                  />
                                ) : (
                                  <span className="text-gray-600 font-semibold text-lg">
                                    {(conv.other_user?.username || 'U')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              {conv.other_user?.is_online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {conv.other_user?.display_name ||
                                  conv.other_user?.username}
                              </p>
                              <p className="text-xs text-gray-500">
                                @{conv.other_user?.username}
                              </p>
                            </div>
                            {/* Unread badge */}
                            {unreadCounts[conv.id] > 0 && (
                              <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs font-semibold text-white">
                                  {unreadCounts[conv.id] > 99 ? '99+' : unreadCounts[conv.id]}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Empty State */}
                    {rooms.length === 0 && conversations.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No chats yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Start a new chat or join a room
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : sidebarView === 'search-users' || sidebarView === 'search-rooms' ? (
            <>
              {/* Search Header */}
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSidebarView('chats')
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="font-semibold">
                    {sidebarView === 'search-users' ? 'Find Users' : 'Find Rooms'}
                  </h2>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={
                      sidebarView === 'search-users'
                        ? 'Search by username...'
                        : 'Search rooms...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result) =>
                      sidebarView === 'search-users' ? (
                        <button
                          key={(result as Profile).id}
                          onClick={() => handleStartConversation(result as Profile)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                              {(result as Profile).avatar_url ? (
                                <Image
                                  src={(result as Profile).avatar_url!}
                                  alt=""
                                  width={48}
                                  height={48}
                                  className="object-cover w-full h-full"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-gray-600 font-semibold">
                                  {(result as Profile).username[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            {(result as Profile).is_online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">
                              {(result as Profile).display_name ||
                                (result as Profile).username}
                            </p>
                            <p className="text-xs text-gray-500">
                              @{(result as Profile).username}
                            </p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-primary" />
                        </button>
                      ) : (
                        <button
                          key={(result as Room).id}
                          onClick={() => handleJoinRoom(result as Room)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition"
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Hash className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">
                              {(result as Room).name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {(result as Room).description || 'Public room'}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Join
                          </Button>
                        </button>
                      )
                    )}
                  </div>
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500">No results found</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Search className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500">
                      {sidebarView === 'search-users'
                        ? 'Search for users to start a conversation'
                        : 'Search for rooms to join'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : sidebarView === 'create-room' ? (
            <>
              {/* Create Room Header */}
              <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSidebarView('chats')
                      setNewRoomName('')
                      setNewRoomDesc('')
                    }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="font-semibold">Create Room</h2>
                </div>
              </div>

              {/* Create Room Form */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Room Name *
                  </label>
                  <Input
                    placeholder="Enter room name..."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Description (optional)
                  </label>
                  <Input
                    placeholder="What's this room about?"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim() || creatingRoom}
                >
                  {creatingRoom ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Room
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col bg-gray-50 ${!showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
      >
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {activeChat.avatar ? (
                      <Image
                        src={activeChat.avatar}
                        alt=""
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : activeChat.type === 'room' ? (
                      <Hash className="w-5 h-5 text-blue-600" />
                    ) : (
                      <span className="text-gray-600 font-semibold">
                        {activeChat.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  {activeChat.type === 'conversation' && activeChat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{activeChat.name}</p>
                  <p className="text-xs text-gray-500">
                    {activeChat.type === 'room'
                      ? 'Group chat'
                      : activeChat.isOnline
                        ? 'Online'
                        : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeChat.type === 'room' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLeaveRoom}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Leave Room"
                  >
                    <DoorOpen className="w-5 h-5" />
                  </Button>
                )}
                {activeChat.type === 'room' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInviteModal(true)}
                    title="Invite Users"
                  >
                    <UserPlus2 className="w-5 h-5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No messages yet</p>
                  <p className="text-sm text-gray-400">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => {
                    // console.log('Rendering message:', msg.sender_id, user?.id)
                    const isOwnMessage = msg.sender_id === user?.id
                    const isSystemMessage = msg.message_type === 'system'

                    if (isSystemMessage) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <p className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full">
                            {msg.content}
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg shadow-sm ${isOwnMessage
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-white rounded-bl-none'
                            }`}
                        >
                          {/* Sender name for group chats */}
                          {activeChat.type === 'room' && !isOwnMessage && msg.sender && (
                            <p
                              className={`text-xs font-semibold px-3 pt-2 ${isOwnMessage ? 'text-white/80' : 'text-primary'
                                }`}
                            >
                              {msg.sender.display_name || msg.sender.username}
                            </p>
                          )}

                          {/* Media content */}
                          {msg.media_url && (
                            <MediaMessage
                              type={msg.message_type}
                              url={msg.media_url}
                              name={msg.media_name}
                              size={msg.media_size}
                            />
                          )}

                          {/* Text content */}
                          {msg.content && (
                            <div className="px-3 py-2">
                              <div
                                className={`text-sm break-words ${isOwnMessage ? 'text-white' : 'text-gray-700'
                                  }`}
                              >
                                <MessageContent content={msg.content} />
                              </div>
                            </div>
                          )}

                          {/* Time */}
                          <p
                            className={`text-xs px-3 pb-2 text-right ${isOwnMessage ? 'text-white/70' : 'text-gray-400'
                              }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messageEndRef} />
                </div>
              )}

              {/* Typing Indicator */}
              {typingIndicator && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-sm text-gray-500 italic">{typingIndicator}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t">
              <div className="flex items-end gap-2 relative">
                {/* Emoji Picker */}
                <EmojiPicker
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                  onEmojiSelect={handleEmojiSelect}
                />

                {/* Emoji Suggestions */}
                <EmojiSuggestions
                  query={shortcodeMatch?.query || ''}
                  isVisible={!!shortcodeMatch && !showEmojiPicker}
                  onSelect={handleEmojiSuggestionSelect}
                  onClose={() => { }}
                />

                {/* Emoji Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={showEmojiPicker ? 'bg-primary/10 text-primary' : ''}
                >
                  <Smile className="w-5 h-5" />
                </Button>

                {/* Attachment Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  onChange={handleMediaUpload}
                />

                {/* Message Input */}
                <RichMessageInput
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={message}
                  onChange={handleTyping}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !shortcodeMatch) {
                      handleSendMessage()
                    }
                  }}
                  className="flex-1"
                />

                {/* Send Button */}
                <Button onClick={handleSendMessage} disabled={!message.trim()}>
                  <SendHorizonal className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to WhatsApp Annex
            </h2>
            <p className="text-gray-500 max-w-md">
              Select a chat from the sidebar or start a new conversation to begin messaging.
            </p>
          </div>
        )}
      </div>

      {/* Room Invite Modal */}
      {showInviteModal && activeChat?.type === 'room' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Invite to {activeChat.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteSearchQuery('')
                  setInviteSearchResults([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users to invite..."
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {inviteSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : inviteSearchResults.length > 0 ? (
                  <div className="space-y-2">
                    {inviteSearchResults.map((userResult) => (
                      <div
                        key={userResult.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {userResult.avatar_url ? (
                              <Image
                                src={userResult.avatar_url}
                                alt=""
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                                unoptimized
                              />
                            ) : (
                              <span className="text-gray-600 font-semibold">
                                {userResult.username[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {userResult.display_name || userResult.username}
                            </p>
                            <p className="text-xs text-gray-500">@{userResult.username}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleInviteUser(userResult)}
                          disabled={inviting === userResult.id}
                        >
                          {inviting === userResult.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Invite'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : inviteSearchQuery.trim() ? (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Search for users to invite to this room
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
