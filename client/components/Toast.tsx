'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, MessageCircle } from 'lucide-react'

export interface ToastNotification {
  id: string
  type: 'message' | 'room_invite' | 'info' | 'success' | 'error'
  title: string
  message: string
  avatar?: string
  onClick?: () => void
  duration?: number // ms, default 5000
}

interface ToastProps {
  notification: ToastNotification
  onDismiss: (id: string) => void
}

export function Toast({ notification, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = notification.duration || 5000
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300) // Start exit animation 300ms before removal

    const removeTimer = setTimeout(() => {
      onDismiss(notification.id)
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [notification.id, notification.duration, onDismiss])

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick()
      onDismiss(notification.id)
    }
  }

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'message':
        return 'bg-white border-l-4 border-l-primary'
      case 'room_invite':
        return 'bg-white border-l-4 border-l-blue-500'
      case 'success':
        return 'bg-white border-l-4 border-l-green-500'
      case 'error':
        return 'bg-white border-l-4 border-l-red-500'
      default:
        return 'bg-white border-l-4 border-l-gray-400'
    }
  }

  return (
    <div
      className={`
        ${getTypeStyles()}
        rounded-lg shadow-lg p-4 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${notification.onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar or Icon */}
        <div className="flex-shrink-0">
          {notification.avatar ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
              <Image
                src={notification.avatar}
                alt=""
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {notification.title}
          </p>
          <p className="text-gray-600 text-sm line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(notification.id)
          }}
          className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  notifications: ToastNotification[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ notifications, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
