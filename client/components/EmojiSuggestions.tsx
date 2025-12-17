'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { emojiCategories, Emoji, getShortcode } from '@/lib/emoji-data'
import Image from 'next/image'

interface EmojiSuggestionsProps {
  query: string // The text after ":"
  onSelect: (emoji: Emoji, shortcode: string) => void
  onClose: () => void
  isVisible: boolean
}

// Get all emojis flattened (computed once outside component)
const getAllEmojis = (): Emoji[] => {
  const all: Emoji[] = []
  emojiCategories.forEach(category => {
    all.push(...category.emojis)
  })
  return all
}

const allEmojis = getAllEmojis()

export const EmojiSuggestions = ({ query, onSelect, onClose, isVisible }: EmojiSuggestionsProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Memoize filtered emojis to prevent recalculation on every render
  const filteredEmojis = useMemo(() => {
    if (query.length === 0) return []

    return allEmojis.filter(emoji => {
      const shortcode = getShortcode(emoji.name).toLowerCase()
      const searchQuery = `:${query.toLowerCase()}`
      return shortcode.includes(searchQuery) || emoji.name.toLowerCase().includes(query.toLowerCase())
    }).slice(0, 8) // Limit to 8 suggestions
  }, [query])

  // Memoize the count for stable reference
  const emojiCount = filteredEmojis.length

  // Reset selection when query changes - derived state pattern
  const [prevQuery, setPrevQuery] = useState(query)
  if (prevQuery !== query) {
    setPrevQuery(query)
    setSelectedIndex(0)
  }

  // Memoize the keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible || emojiCount === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % emojiCount)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + emojiCount) % emojiCount)
        break
      case 'Enter':
      case 'Tab':
        // Handled in onKeyDown prop of parent - let it bubble
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [isVisible, emojiCount, onClose])

  // Handle selection via Enter/Tab separately to access current filteredEmojis
  const handleSelect = useCallback((e: KeyboardEvent) => {
    if (!isVisible || filteredEmojis.length === 0) return

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const emoji = filteredEmojis[selectedIndex]
      if (emoji) {
        onSelect(emoji, getShortcode(emoji.name))
      }
    }
  }, [isVisible, filteredEmojis, selectedIndex, onSelect])

  // Attach keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keydown', handleSelect)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keydown', handleSelect)
    }
  }, [handleKeyDown, handleSelect])

  if (!isVisible || filteredEmojis.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs text-gray-500">
          Emoji suggestions for <span className="font-mono text-primary">:{query}</span>
        </span>
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji.category}-${emoji.name}`}
            onClick={() => onSelect(emoji, getShortcode(emoji.name))}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${index === selectedIndex
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-gray-50'
              }`}
          >
            <Image
              src={emoji.url}
              alt={emoji.name}
              width={28}
              height={28}
              className="flex-shrink-0"
              style={{ width: '28px', height: '28px' }}
              loading="lazy"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{emoji.name}</span>
              <span className="text-xs text-gray-400 font-mono">{getShortcode(emoji.name)}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
        <span className="text-xs text-gray-400">
          ↑↓ Navigate • Enter/Tab Select • Esc Close
        </span>
      </div>
    </div>
  )
}

export default EmojiSuggestions
