'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Animated emoji data - using animated SVGs and CSS animations
// Each emoji has an id, name, category, and animation configuration
export interface AnimatedEmoji {
  id: string
  emoji: string
  name: string
  category: 'smileys' | 'animals' | 'nature' | 'food' | 'activities' | 'objects' | 'symbols'
  color: string
  animation: 'bounce' | 'pulse' | 'spin' | 'shake' | 'wiggle' | 'float' | 'heartbeat' | 'wave'
}

export const ANIMATED_EMOJIS: AnimatedEmoji[] = [
  // Smileys
  { id: 'smile', emoji: '😊', name: 'Smiling Face', category: 'smileys', color: '#FFD93D', animation: 'bounce' },
  { id: 'grin', emoji: '😄', name: 'Grinning Face', category: 'smileys', color: '#FFD93D', animation: 'pulse' },
  { id: 'wink', emoji: '😉', name: 'Winking Face', category: 'smileys', color: '#FFD93D', animation: 'wiggle' },
  { id: 'cool', emoji: '😎', name: 'Cool Face', category: 'smileys', color: '#FFD93D', animation: 'pulse' },
  { id: 'love', emoji: '😍', name: 'Heart Eyes', category: 'smileys', color: '#FF6B6B', animation: 'heartbeat' },
  { id: 'kiss', emoji: '😘', name: 'Blowing Kiss', category: 'smileys', color: '#FF6B6B', animation: 'pulse' },
  { id: 'thinking', emoji: '🤔', name: 'Thinking Face', category: 'smileys', color: '#FFD93D', animation: 'wiggle' },
  { id: 'laugh', emoji: '😂', name: 'Laughing', category: 'smileys', color: '#FFD93D', animation: 'shake' },
  { id: 'star-eyes', emoji: '🤩', name: 'Star Eyes', category: 'smileys', color: '#FFD93D', animation: 'spin' },
  { id: 'party', emoji: '🥳', name: 'Party Face', category: 'smileys', color: '#9B59B6', animation: 'bounce' },
  { id: 'nerd', emoji: '🤓', name: 'Nerd Face', category: 'smileys', color: '#FFD93D', animation: 'wiggle' },
  { id: 'zany', emoji: '🤪', name: 'Zany Face', category: 'smileys', color: '#FFD93D', animation: 'shake' },

  // Animals
  { id: 'cat', emoji: '🐱', name: 'Cat', category: 'animals', color: '#F39C12', animation: 'wiggle' },
  { id: 'dog', emoji: '🐶', name: 'Dog', category: 'animals', color: '#8B4513', animation: 'bounce' },
  { id: 'fox', emoji: '🦊', name: 'Fox', category: 'animals', color: '#E67E22', animation: 'wiggle' },
  { id: 'lion', emoji: '🦁', name: 'Lion', category: 'animals', color: '#F39C12', animation: 'shake' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn', category: 'animals', color: '#9B59B6', animation: 'float' },
  { id: 'panda', emoji: '🐼', name: 'Panda', category: 'animals', color: '#2C3E50', animation: 'bounce' },
  { id: 'koala', emoji: '🐨', name: 'Koala', category: 'animals', color: '#7F8C8D', animation: 'wiggle' },
  { id: 'owl', emoji: '🦉', name: 'Owl', category: 'animals', color: '#8B4513', animation: 'float' },
  { id: 'butterfly', emoji: '🦋', name: 'Butterfly', category: 'animals', color: '#3498DB', animation: 'float' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon', category: 'animals', color: '#27AE60', animation: 'shake' },

  // Nature
  { id: 'sun', emoji: '☀️', name: 'Sun', category: 'nature', color: '#FFD93D', animation: 'spin' },
  { id: 'moon', emoji: '🌙', name: 'Moon', category: 'nature', color: '#F1C40F', animation: 'float' },
  { id: 'star', emoji: '⭐', name: 'Star', category: 'nature', color: '#F1C40F', animation: 'pulse' },
  { id: 'rainbow', emoji: '🌈', name: 'Rainbow', category: 'nature', color: '#E74C3C', animation: 'wave' },
  { id: 'fire', emoji: '🔥', name: 'Fire', category: 'nature', color: '#E74C3C', animation: 'shake' },
  { id: 'snowflake', emoji: '❄️', name: 'Snowflake', category: 'nature', color: '#3498DB', animation: 'spin' },
  { id: 'flower', emoji: '🌸', name: 'Cherry Blossom', category: 'nature', color: '#FF6B9D', animation: 'float' },
  { id: 'plant', emoji: '🌱', name: 'Seedling', category: 'nature', color: '#27AE60', animation: 'bounce' },

  // Food
  { id: 'pizza', emoji: '🍕', name: 'Pizza', category: 'food', color: '#E67E22', animation: 'bounce' },
  { id: 'donut', emoji: '🍩', name: 'Donut', category: 'food', color: '#FF6B9D', animation: 'spin' },
  { id: 'ice-cream', emoji: '🍦', name: 'Ice Cream', category: 'food', color: '#FFD93D', animation: 'wiggle' },
  { id: 'cake', emoji: '🎂', name: 'Cake', category: 'food', color: '#FF6B9D', animation: 'bounce' },
  { id: 'coffee', emoji: '☕', name: 'Coffee', category: 'food', color: '#8B4513', animation: 'pulse' },
  { id: 'avocado', emoji: '🥑', name: 'Avocado', category: 'food', color: '#27AE60', animation: 'wiggle' },

  // Activities
  { id: 'rocket', emoji: '🚀', name: 'Rocket', category: 'activities', color: '#E74C3C', animation: 'float' },
  { id: 'gaming', emoji: '🎮', name: 'Gaming', category: 'activities', color: '#2C3E50', animation: 'shake' },
  { id: 'music', emoji: '🎵', name: 'Music', category: 'activities', color: '#9B59B6', animation: 'bounce' },
  { id: 'art', emoji: '🎨', name: 'Art', category: 'activities', color: '#E74C3C', animation: 'wiggle' },
  { id: 'sports', emoji: '⚽', name: 'Soccer', category: 'activities', color: '#2C3E50', animation: 'bounce' },
  { id: 'camera', emoji: '📷', name: 'Camera', category: 'activities', color: '#2C3E50', animation: 'pulse' },

  // Objects
  { id: 'heart', emoji: '❤️', name: 'Heart', category: 'objects', color: '#E74C3C', animation: 'heartbeat' },
  { id: 'diamond', emoji: '💎', name: 'Diamond', category: 'objects', color: '#3498DB', animation: 'pulse' },
  { id: 'crown', emoji: '👑', name: 'Crown', category: 'objects', color: '#F1C40F', animation: 'float' },
  { id: 'ghost', emoji: '👻', name: 'Ghost', category: 'objects', color: '#ECF0F1', animation: 'float' },
  { id: 'alien', emoji: '👽', name: 'Alien', category: 'objects', color: '#27AE60', animation: 'wiggle' },
  { id: 'robot', emoji: '🤖', name: 'Robot', category: 'objects', color: '#7F8C8D', animation: 'shake' },

  // Symbols
  { id: 'lightning', emoji: '⚡', name: 'Lightning', category: 'symbols', color: '#F1C40F', animation: 'shake' },
  { id: 'sparkles', emoji: '✨', name: 'Sparkles', category: 'symbols', color: '#F1C40F', animation: 'pulse' },
  { id: 'peace', emoji: '✌️', name: 'Peace', category: 'symbols', color: '#FFD93D', animation: 'wave' },
  { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up', category: 'symbols', color: '#FFD93D', animation: 'bounce' },
  { id: 'clap', emoji: '👏', name: 'Clapping', category: 'symbols', color: '#FFD93D', animation: 'pulse' },
  { id: 'wave-hand', emoji: '👋', name: 'Waving Hand', category: 'symbols', color: '#FFD93D', animation: 'wave' },
]

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🎯' },
  { id: 'smileys', name: 'Smileys', icon: '😊' },
  { id: 'animals', name: 'Animals', icon: '🐱' },
  { id: 'nature', name: 'Nature', icon: '🌸' },
  { id: 'food', name: 'Food', icon: '🍕' },
  { id: 'activities', name: 'Activities', icon: '🚀' },
  { id: 'objects', name: 'Objects', icon: '💎' },
  { id: 'symbols', name: 'Symbols', icon: '✨' },
] as const

interface AnimatedAvatarPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (avatar: { type: 'animated-emoji', emojiId: string, emoji: string, color: string, animation: string }) => void
  currentAvatarId?: string
}

// CSS for animations
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

export const getAnimationClass = (animation: string): string => {
  return `animate-avatar-${animation}`
}

export const AnimatedAvatarPicker = ({ isOpen, onClose, onSelect, currentAvatarId }: AnimatedAvatarPickerProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Inject animation styles
  useEffect(() => {
    const styleId = 'animated-avatar-styles'
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = animationStyles
      document.head.appendChild(styleElement)
    }
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredEmojis = ANIMATED_EMOJIS.filter(emoji => {
    const matchesCategory = selectedCategory === 'all' || emoji.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      emoji.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emoji.emoji.includes(searchQuery)
    return matchesCategory && matchesSearch
  })

  const handleSelect = (emoji: AnimatedEmoji) => {
    onSelect({
      type: 'animated-emoji',
      emojiId: emoji.id,
      emoji: emoji.emoji,
      color: emoji.color,
      animation: emoji.animation
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-bold text-lg">Animated Avatar</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-1 p-2 border-b overflow-x-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${selectedCategory === category.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <span>{category.icon}</span>
              <span className="hidden sm:inline">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredEmojis.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No emojis found
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {filteredEmojis.map((emoji) => {
                const isSelected = currentAvatarId === emoji.id
                const isHovered = hoveredEmoji === emoji.id

                return (
                  <button
                    key={emoji.id}
                    onClick={() => handleSelect(emoji)}
                    onMouseEnter={() => setHoveredEmoji(emoji.id)}
                    onMouseLeave={() => setHoveredEmoji(null)}
                    className={`relative aspect-square rounded-xl flex items-center justify-center transition-all ${isSelected
                        ? 'bg-purple-100 ring-2 ring-purple-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    title={emoji.name}
                  >
                    {/* Background color circle */}
                    <div
                      className="absolute inset-2 rounded-full opacity-20"
                      style={{ backgroundColor: emoji.color }}
                    />

                    {/* Emoji with animation on hover */}
                    <span
                      className={`text-3xl relative z-10 ${isHovered || isSelected ? getAnimationClass(emoji.animation) : ''
                        }`}
                    >
                      {emoji.emoji}
                    </span>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Preview / Footer */}
        {hoveredEmoji && (
          <div className="p-3 border-t bg-gray-50 flex items-center justify-center gap-3">
            {(() => {
              const emoji = ANIMATED_EMOJIS.find(e => e.id === hoveredEmoji)
              if (!emoji) return null
              return (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: emoji.color + '30' }}
                  >
                    <span className={`text-2xl ${getAnimationClass(emoji.animation)}`}>
                      {emoji.emoji}
                    </span>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">{emoji.name}</div>
                    <div className="text-gray-500 capitalize">{emoji.animation} animation</div>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper component to display an animated emoji avatar
interface AnimatedEmojiAvatarProps {
  emojiId: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  className?: string
}

export const AnimatedEmojiAvatar = ({ emojiId, size = 'md', animate = true, className = '' }: AnimatedEmojiAvatarProps) => {
  const emoji = ANIMATED_EMOJIS.find(e => e.id === emojiId)

  if (!emoji) return null

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  }

  // Inject styles if not already present
  useEffect(() => {
    const styleId = 'animated-avatar-styles'
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = animationStyles
      document.head.appendChild(styleElement)
    }
  }, [])

  return (
    <div
      className={`rounded-full flex items-center justify-center ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: emoji.color + '30' }}
    >
      <span className={animate ? getAnimationClass(emoji.animation) : ''}>
        {emoji.emoji}
      </span>
    </div>
  )
}

// Utility to parse avatar URL and detect if it's an animated emoji
export const parseAvatarUrl = (avatarUrl: string | null | undefined): {
  type: 'image' | 'animated-emoji' | 'none'
  emojiId?: string
  emoji?: AnimatedEmoji
} => {
  if (!avatarUrl) return { type: 'none' }

  // Check if it's an animated emoji reference
  if (avatarUrl.startsWith('animated-emoji:')) {
    const emojiId = avatarUrl.replace('animated-emoji:', '')
    const emoji = ANIMATED_EMOJIS.find(e => e.id === emojiId)
    return emoji ? { type: 'animated-emoji', emojiId, emoji } : { type: 'none' }
  }

  return { type: 'image' }
}

export default AnimatedAvatarPicker
