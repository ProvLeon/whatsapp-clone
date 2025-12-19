'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { X, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emojiCategories, popularEmojis, Emoji } from '@/lib/emoji-data'

interface AnimatedAvatarPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (avatar: { type: 'animated-emoji'; emojiUrl: string; emojiName: string }) => void
  currentAvatarUrl?: string
}

export const AnimatedAvatarPicker = ({ isOpen, onClose, onSelect, currentAvatarUrl }: AnimatedAvatarPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(-1) // -1 = popular
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredEmoji, setHoveredEmoji] = useState<Emoji | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

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
      // Use setTimeout to avoid immediate close when opening
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Filter emojis based on search
  const getFilteredEmojis = (): Emoji[] | null => {
    if (!searchQuery.trim()) return null

    const query = searchQuery.toLowerCase()
    const results: Emoji[] = []

    emojiCategories.forEach(category => {
      category.emojis.forEach(emoji => {
        if (emoji.name.toLowerCase().includes(query)) {
          results.push(emoji)
        }
      })
    })

    return results
  }

  const filteredEmojis = getFilteredEmojis()

  const handleEmojiSelect = (emoji: Emoji) => {
    onSelect({
      type: 'animated-emoji',
      emojiUrl: emoji.url,
      emojiName: emoji.name,
    })
    onClose()
  }

  // Check if an emoji is currently selected
  const isSelected = (emoji: Emoji) => {
    return currentAvatarUrl === emoji.url
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
              placeholder="Search animated emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50/30 overflow-x-auto">
            <button
              onClick={() => setActiveCategory(-1)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors ${activeCategory === -1
                ? 'bg-purple-500 text-white'
                : 'hover:bg-gray-100 text-gray-600'
                }`}
              title="Popular"
            >
              ⭐ Popular
            </button>
            {emojiCategories.map((category, index) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(index)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap ${activeCategory === index
                  ? 'bg-purple-500 text-white'
                  : 'hover:bg-gray-100 text-gray-600'
                  }`}
                title={category.name}
              >
                {category.icon} <span className="hidden sm:inline ml-1">{category.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {searchQuery && filteredEmojis ? (
            <>
              <div className="text-xs text-gray-500 mb-2 px-1">
                {filteredEmojis.length} results for &quot;{searchQuery}&quot;
              </div>
              {filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {filteredEmojis.map((emoji) => (
                    <EmojiAvatarButton
                      key={`${emoji.category}-${emoji.name}`}
                      emoji={emoji}
                      isSelected={isSelected(emoji)}
                      onClick={handleEmojiSelect}
                      onHover={setHoveredEmoji}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <span className="text-3xl mb-2">🔍</span>
                  <span className="text-sm">No emojis found</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Popular Section */}
              {activeCategory === -1 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-3 px-1">
                    Frequently Used
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {popularEmojis.map((emoji) => (
                      <EmojiAvatarButton
                        key={`popular-${emoji.name}`}
                        emoji={emoji}
                        isSelected={isSelected(emoji)}
                        onClick={handleEmojiSelect}
                        onHover={setHoveredEmoji}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Category Content */}
              {activeCategory >= 0 && emojiCategories[activeCategory] && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-3 px-1">
                    {emojiCategories[activeCategory].name}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {emojiCategories[activeCategory].emojis.map((emoji) => (
                      <EmojiAvatarButton
                        key={`${emoji.category}-${emoji.name}`}
                        emoji={emoji}
                        isSelected={isSelected(emoji)}
                        onClick={handleEmojiSelect}
                        onHover={setHoveredEmoji}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Hovered Emoji Info */}
        <div className="h-14 px-4 flex items-center border-t border-gray-100 bg-gray-50/50">
          {hoveredEmoji ? (
            <div className="flex items-center gap-3">
              <Image
                src={hoveredEmoji.url}
                alt={hoveredEmoji.name}
                width={36}
                height={36}
                unoptimized
                className="flex-shrink-0"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 block">
                  {hoveredEmoji.name}
                </span>
                <span className="text-xs text-gray-400">
                  Click to set as avatar
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">
              Choose an animated emoji as your avatar
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Individual Emoji Avatar Button
interface EmojiAvatarButtonProps {
  emoji: Emoji
  isSelected: boolean
  onClick: (emoji: Emoji) => void
  onHover: (emoji: Emoji | null) => void
}

const EmojiAvatarButton = ({ emoji, isSelected, onClick, onHover }: EmojiAvatarButtonProps) => {
  const [hasError, setHasError] = useState(false)

  if (hasError) return null

  return (
    <button
      onClick={() => onClick(emoji)}
      onMouseEnter={() => onHover(emoji)}
      onMouseLeave={() => onHover(null)}
      className={`relative aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isSelected
        ? 'bg-purple-100 ring-2 ring-purple-500'
        : 'bg-gray-50 hover:bg-gray-100'
        }`}
      title={emoji.name}
    >
      <Image
        src={emoji.url}
        alt={emoji.name}
        width={40}
        height={40}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{ width: '40px', height: '40px' }}
        unoptimized
      />

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
}

// Utility to parse avatar URL and detect if it's an animated emoji
export const parseAvatarUrl = (avatarUrl: string | null | undefined): {
  type: 'image' | 'animated-emoji' | 'none'
  emojiUrl?: string
} => {
  if (!avatarUrl) return { type: 'none' }

  // Check if it's a Telegram animated emoji URL
  if (avatarUrl.includes('Telegram-Animated-Emojis') && avatarUrl.endsWith('.webp')) {
    return { type: 'animated-emoji', emojiUrl: avatarUrl }
  }

  return { type: 'image' }
}

export default AnimatedAvatarPicker
