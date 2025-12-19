'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { parseAvatarUrl, ANIMATED_EMOJIS, getAnimationClass } from '@/components/AnimatedAvatarPicker'

// Animation styles - injected once when component mounts
const animationStyles = `
  @keyframes avatar-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes avatar-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  @keyframes avatar-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes avatar-shake {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-3px) rotate(-5deg); }
    75% { transform: translateX(3px) rotate(5deg); }
  }
  @keyframes avatar-wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    75% { transform: rotate(10deg); }
  }
  @keyframes avatar-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes avatar-heartbeat {
    0%, 100% { transform: scale(1); }
    14% { transform: scale(1.2); }
    28% { transform: scale(1); }
    42% { transform: scale(1.2); }
    70% { transform: scale(1); }
  }
  @keyframes avatar-wave {
    0%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(14deg); }
    20% { transform: rotate(-8deg); }
    30% { transform: rotate(14deg); }
    40% { transform: rotate(-4deg); }
    50% { transform: rotate(10deg); }
    60% { transform: rotate(0deg); }
  }

  .animate-avatar-bounce { animation: avatar-bounce 0.8s ease-in-out infinite; }
  .animate-avatar-pulse { animation: avatar-pulse 1.2s ease-in-out infinite; }
  .animate-avatar-spin { animation: avatar-spin 3s linear infinite; }
  .animate-avatar-shake { animation: avatar-shake 0.5s ease-in-out infinite; }
  .animate-avatar-wiggle { animation: avatar-wiggle 0.8s ease-in-out infinite; }
  .animate-avatar-float { animation: avatar-float 2s ease-in-out infinite; }
  .animate-avatar-heartbeat { animation: avatar-heartbeat 1.5s ease-in-out infinite; }
  .animate-avatar-wave { animation: avatar-wave 1.8s ease-in-out infinite; }
`

// Size configurations
const sizeConfig = {
  xs: { container: 'w-6 h-6', image: 24, emoji: 'text-sm', icon: 'w-3 h-3' },
  sm: { container: 'w-8 h-8', image: 32, emoji: 'text-lg', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', image: 40, emoji: 'text-xl', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', image: 48, emoji: 'text-2xl', icon: 'w-6 h-6' },
  xl: { container: 'w-16 h-16', image: 64, emoji: 'text-3xl', icon: 'w-8 h-8' },
  '2xl': { container: 'w-20 h-20', image: 80, emoji: 'text-4xl', icon: 'w-10 h-10' },
}

export interface AvatarProps {
  src?: string | null
  alt?: string
  size?: keyof typeof sizeConfig
  animate?: boolean
  className?: string
  showOnlineIndicator?: boolean
  isOnline?: boolean
  fallbackIcon?: React.ReactNode
}

export const Avatar = ({
  src,
  alt = 'Avatar',
  size = 'md',
  animate = true,
  className = '',
  showOnlineIndicator = false,
  isOnline = false,
  fallbackIcon,
}: AvatarProps) => {
  // Inject animation styles on mount
  useEffect(() => {
    const styleId = 'avatar-component-styles'
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = animationStyles
      document.head.appendChild(styleElement)
    }
  }, [])

  const config = sizeConfig[size]
  const parsed = parseAvatarUrl(src)

  // Online indicator size based on avatar size
  const onlineIndicatorSize = {
    xs: 'w-2 h-2 border',
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
    '2xl': 'w-5 h-5 border-2',
  }

  const renderContent = () => {
    // Animated emoji avatar
    if (parsed.type === 'animated-emoji' && parsed.emoji) {
      const emoji = parsed.emoji
      return (
        <div
          className={`${config.container} rounded-full flex items-center justify-center overflow-hidden`}
          style={{ backgroundColor: emoji.color + '30' }}
        >
          <span
            className={`${config.emoji} ${animate ? getAnimationClass(emoji.animation) : ''}`}
          >
            {emoji.emoji}
          </span>
        </div>
      )
    }

    // Regular image avatar
    if (parsed.type === 'image' && src) {
      return (
        <div className={`${config.container} rounded-full overflow-hidden bg-gray-100`}>
          <Image
            src={src}
            alt={alt}
            width={config.image}
            height={config.image}
            className="object-cover w-full h-full"
            unoptimized
          />
        </div>
      )
    }

    // Fallback - no avatar
    return (
      <div className={`${config.container} rounded-full bg-gray-100 flex items-center justify-center`}>
        {fallbackIcon || <User className={`${config.icon} text-gray-400`} />}
      </div>
    )
  }

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {renderContent()}

      {/* Online indicator */}
      {showOnlineIndicator && (
        <div
          className={`absolute bottom-0 right-0 ${onlineIndicatorSize[size]} rounded-full border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
        />
      )}
    </div>
  )
}

// Group avatar component for rooms/groups
export interface GroupAvatarProps {
  members?: Array<{ avatar_url?: string | null; display_name?: string }>
  roomAvatar?: string | null
  roomName?: string
  size?: keyof typeof sizeConfig
  className?: string
}

export const GroupAvatar = ({
  members = [],
  roomAvatar,
  roomName = 'Group',
  size = 'md',
  className = '',
}: GroupAvatarProps) => {
  const config = sizeConfig[size]

  // If room has its own avatar, use it
  if (roomAvatar) {
    return (
      <Avatar
        src={roomAvatar}
        alt={roomName}
        size={size}
        className={className}
      />
    )
  }

  // If no room avatar, show stacked member avatars (up to 3)
  const displayMembers = members.slice(0, 3)

  if (displayMembers.length === 0) {
    return (
      <Avatar
        alt={roomName}
        size={size}
        className={className}
      />
    )
  }

  if (displayMembers.length === 1) {
    return (
      <Avatar
        src={displayMembers[0].avatar_url}
        alt={displayMembers[0].display_name || roomName}
        size={size}
        className={className}
      />
    )
  }

  // Multiple members - show stacked avatars
  const miniSize = size === 'xs' || size === 'sm' ? 'xs' : 'sm'
  const overlap = size === 'xs' || size === 'sm' ? '-ml-2' : '-ml-3'

  return (
    <div className={`${config.container} flex items-center justify-center ${className}`}>
      <div className="flex">
        {displayMembers.map((member, index) => (
          <div
            key={index}
            className={`relative ${index > 0 ? overlap : ''}`}
            style={{ zIndex: displayMembers.length - index }}
          >
            <Avatar
              src={member.avatar_url}
              alt={member.display_name}
              size={miniSize}
            />
          </div>
        ))}
        {members.length > 3 && (
          <div
            className={`relative ${overlap} w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600`}
            style={{ zIndex: 0 }}
          >
            +{members.length - 3}
          </div>
        )}
      </div>
    </div>
  )
}

export default Avatar
