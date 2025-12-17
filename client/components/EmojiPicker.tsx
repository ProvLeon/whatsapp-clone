'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { X, Search } from 'lucide-react'
import { emojiCategories, popularEmojis, Emoji, getShortcode } from '@/lib/emoji-data'

interface EmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onEmojiSelect: (emoji: Emoji) => void
}

export const EmojiPicker = ({ isOpen, onClose, onEmojiSelect }: EmojiPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredEmoji, setHoveredEmoji] = useState<Emoji | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Filter emojis based on search
  const getFilteredEmojis = () => {
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

  const handleEmojiClick = (emoji: Emoji) => {
    onEmojiSelect(emoji)
  }

  if (!isOpen) return null

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 w-[340px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <span className="text-sm font-medium text-gray-700">Emojis</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50/30 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(-1)}
            className={`flex-shrink-0 p-1.5 rounded-md text-sm transition-colors ${activeCategory === -1
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-gray-100 text-gray-600'
              }`}
            title="Popular"
          >
            ⭐
          </button>
          {emojiCategories.map((category, index) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(index)}
              className={`flex-shrink-0 p-1.5 rounded-md text-sm transition-colors ${activeCategory === index
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-gray-100 text-gray-600'
                }`}
              title={category.name}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div
        ref={contentRef}
        className="h-[280px] overflow-y-auto p-2"
      >
        {searchQuery && filteredEmojis ? (
          <>
            <div className="text-xs text-gray-500 mb-2 px-1">
              {filteredEmojis.length} results for &rdquo{searchQuery}&ldquo
            </div>
            <div className="grid grid-cols-7 gap-1">
              {filteredEmojis.map((emoji) => (
                <EmojiButton
                  key={`${emoji.category}-${emoji.name}`}
                  emoji={emoji}
                  onClick={handleEmojiClick}
                  onHover={setHoveredEmoji}
                />
              ))}
            </div>
            {filteredEmojis.length === 0 && (
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
                <div className="text-xs font-medium text-gray-500 mb-2 px-1">
                  Frequently Used
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {popularEmojis.map((emoji) => (
                    <EmojiButton
                      key={`popular-${emoji.name}`}
                      emoji={emoji}
                      onClick={handleEmojiClick}
                      onHover={setHoveredEmoji}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Category Content */}
            {activeCategory >= 0 && emojiCategories[activeCategory] && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2 px-1">
                  {emojiCategories[activeCategory].name}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {emojiCategories[activeCategory].emojis.map((emoji) => (
                    <EmojiButton
                      key={`${emoji.category}-${emoji.name}`}
                      emoji={emoji}
                      onClick={handleEmojiClick}
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
      <div className="h-10 px-3 flex items-center border-t border-gray-100 bg-gray-50/50">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2">
            <Image
              src={hoveredEmoji.url}
              alt={hoveredEmoji.name}
              width={24}
              height={24}
              unoptimized
              className="flex-shrink-0"
            />
            <span className="text-xs text-gray-600 truncate">
              {hoveredEmoji.name}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {getShortcode(hoveredEmoji.name)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">
            Hover over an emoji to preview
          </span>
        )}
      </div>
    </div>
  )
}

// Individual Emoji Button Component
// Individual Emoji Button Component
interface EmojiButtonProps {
  emoji: Emoji
  onClick: (emoji: Emoji) => void
  onHover: (emoji: Emoji | null) => void
}

const EmojiButton = ({ emoji, onClick, onHover }: EmojiButtonProps) => {
  const [hasError, setHasError] = useState(false)

  if (hasError) return null

  return (
    <button
      onClick={() => onClick(emoji)}
      onMouseEnter={() => onHover(emoji)}
      onMouseLeave={() => onHover(null)}
      className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
      title={emoji.name}
    >
      {/* Use regular img for animated WebP support */}
      <Image
        src={emoji.url}
        alt={emoji.name}
        width={28}
        height={28}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{ width: '28px', height: '28px' }}
        unoptimized
      />
    </button>
  )
}


export default EmojiPicker
