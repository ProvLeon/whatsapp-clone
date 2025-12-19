'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ToastNotification, ToastContainer } from '@/components/Toast'

// Unread counts per chat
interface UnreadCounts {
  [chatId: string]: number
}

interface NotificationContextType {
  // Toast notifications
  notifications: ToastNotification[]
  addNotification: (notification: Omit<ToastNotification, 'id'>) => void
  dismissNotification: (id: string) => void
  clearAllNotifications: () => void

  // Unread message counts
  unreadCounts: UnreadCounts
  incrementUnread: (chatId: string) => void
  clearUnread: (chatId: string) => void
  getTotalUnread: () => number

  // Browser notification permission
  notificationPermission: NotificationPermission | 'default'
  requestNotificationPermission: () => Promise<boolean>

  // Sound settings
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([])
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({})
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification_sound_enabled')
      if (saved !== null) {
        return saved === 'true'
      }
    }
    return true
  })

  // Save sound preference
  const handleSetSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification_sound_enabled', String(enabled))
    }
  }, [])

  // Add a toast notification
  const addNotification = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(7)}`
    setNotifications((prev) => [...prev, { ...notification, id }])

    // Play notification sound if enabled
    if (soundEnabled && typeof window !== 'undefined') {
      try {
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {
          // Ignore audio play errors (e.g., user hasn't interacted with page yet)
        })
      } catch {
        // Audio not supported
      }
    }
  }, [soundEnabled])

  // Dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Increment unread count for a chat
  const incrementUnread = useCallback((chatId: string) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || 0) + 1,
    }))
  }, [])

  // Clear unread count for a chat
  const clearUnread = useCallback((chatId: string) => {
    setUnreadCounts((prev) => {
      const next = { ...prev }
      delete next[chatId]
      return next
    })
  }, [])

  // Get total unread count
  const getTotalUnread = useCallback(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
  }, [unreadCounts])

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted')
      return true
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission === 'granted'
    } catch {
      return false
    }
  }, [])

  const value: NotificationContextType = {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    unreadCounts,
    incrementUnread,
    clearUnread,
    getTotalUnread,
    notificationPermission,
    requestNotificationPermission,
    soundEnabled,
    setSoundEnabled: handleSetSoundEnabled,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer notifications={notifications} onDismiss={dismissNotification} />
    </NotificationContext.Provider>
  )
}

// Helper function to show browser notification
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void }
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (Notification.permission !== 'granted') {
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: '/icon-192.png', // App icon
      badge: '/icon-192.png',
      ...options,
    })

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus()
        options.onClick?.()
        notification.close()
      }
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)

    return notification
  } catch {
    return null
  }
}
