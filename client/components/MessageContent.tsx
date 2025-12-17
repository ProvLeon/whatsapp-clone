'use client'
import Image from 'next/image'
import { useMemo } from 'react'

interface MessageContentProps {
  content: string
  className?: string
}

export const MessageContent = ({ content, className = '' }: MessageContentProps) => {
  const parsedContent = useMemo(() => {
    // Create regex inside useMemo to avoid modifying external state
    const emojiRegex = /\[\[EMOJI:(https:\/\/[^\]]+)\]\]/g
    const parts: (string | { type: 'emoji'; url: string })[] = []
    let lastIndex = 0
    let match

    while ((match = emojiRegex.exec(content)) !== null) {
      // Add text before the emoji
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }

      // Add the emoji
      parts.push({ type: 'emoji', url: match[1] })
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    return parts
  }, [content])

  // Check if message is emoji-only (for larger display)
  const isEmojiOnly = parsedContent.every(
    part => typeof part !== 'string' || part.trim() === ''
  )
  const emojiSize = isEmojiOnly ? 48 : 22

  return (
    <span className={`inline ${className}`}>
      {parsedContent.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>
        }

        // Use regular img tag for animated WebP support
        return (
          <Image
            key={index}
            src={part.url}
            alt="emoji"
            width={emojiSize}
            height={emojiSize}
            className="inline-block align-middle mx-0.5"
            style={{
              display: 'inline-block',
              width: `${emojiSize}px`,
              height: `${emojiSize}px`,
            }}
            loading="lazy"
            unoptimized
          />
        )
      })}
    </span>
  )
}

export default MessageContent
