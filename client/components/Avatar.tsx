'use client'

import Image from 'next/image'
import { User } from 'lucide-react'
import { parseAvatarUrl } from '@/components/AnimatedAvatarPicker'

// Size configurations
const sizeConfig = {
  xs: { container: 'w-6 h-6', image: 24, icon: 'w-3 h-3' },
  sm: { container: 'w-8 h-8', image: 32, icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10', image: 40, icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12', image: 48, icon: 'w-6 h-6' },
  xl: { container: 'w-16 h-16', image: 64, icon: 'w-8 h-8' },
  '2xl': { container: 'w-20 h-20', image: 80, icon: 'w-10 h-10' },
}

export interface AvatarProps {
  src?: string | null
  alt?: string
  size?: keyof typeof sizeConfig
  className?: string
  showOnlineIndicator?: boolean
  isOnline?: boolean
  fallbackIcon?: React.ReactNode
}

export const Avatar = ({
  src,
  alt = 'Avatar',
  size = 'md',
  className = '',
  showOnlineIndicator = false,
  isOnline = false,
  fallbackIcon,
}: AvatarProps) => {
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
    // Animated emoji avatar (Telegram animated emoji)
    if (parsed.type === 'animated-emoji' && parsed.emojiUrl) {
      return (
        <div className={`${config.container} rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100`}>
          <Image
            src={parsed.emojiUrl}
            alt={alt}
            width={config.image}
            height={config.image}
            className="object-contain"
            unoptimized
          />
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
