'use client'

import { useState, useRef, useEffect, KeyboardEvent, forwardRef, useImperativeHandle } from 'react'
import { cn } from '@/lib/utils'

interface RichMessageInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export interface RichMessageInputRef {
  focus: () => void
  insertEmoji: (url: string) => void
}

// Parse the message to extract text and emoji parts
const parseMessageParts = (message: string): Array<{ type: 'text' | 'emoji'; content: string }> => {
  const parts: Array<{ type: 'text' | 'emoji'; content: string }> = []
  const emojiRegex = /\[\[EMOJI:(https?:\/\/[^\]]+)\]\]/g
  let lastIndex = 0
  let match

  while ((match = emojiRegex.exec(message)) !== null) {
    // Add text before emoji
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index) })
    }
    // Add emoji
    parts.push({ type: 'emoji', content: match[1] })
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex) })
  }

  return parts
}

export const RichMessageInput = forwardRef<RichMessageInputRef, RichMessageInputProps>(
  ({ value, onChange, onKeyDown, placeholder = 'Type a message...', className, disabled }, ref) => {
    const editableRef = useRef<HTMLDivElement>(null)
    const [isFocused, setIsFocused] = useState(false)
    const lastValueRef = useRef(value)
    const isInternalChange = useRef(false)

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (editableRef.current) {
          editableRef.current.focus()
          // Move cursor to end
          const selection = window.getSelection()
          const range = document.createRange()
          range.selectNodeContents(editableRef.current)
          range.collapse(false)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      },
      insertEmoji: (url: string) => {
        const marker = `[[EMOJI:${url}]]`
        onChange(value + marker)
      },
    }))

    // Convert internal value to display HTML
    const getDisplayHTML = (val: string): string => {
      if (!val) return ''

      const parts = parseMessageParts(val)
      return parts
        .map((part) => {
          if (part.type === 'emoji') {
            // Create an img element for each emoji with inline styles
            const escapedUrl = part.content.replace(/"/g, '&quot;')
            return `<img src="${escapedUrl}" alt="emoji" data-emoji-url="${escapedUrl}" draggable="false" style="width: 22px; height: 22px; vertical-align: middle; display: inline-block; margin: 0 1px; pointer-events: none;" />`
          }
          // Escape HTML in text to prevent XSS and display issues
          return part.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
        })
        .join('')
    }

    // Extract value from DOM content
    const extractValueFromDOM = (): string => {
      if (!editableRef.current) return ''

      let newValue = ''

      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          newValue += node.textContent || ''
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement

          if (element.tagName === 'IMG' && element.dataset.emojiUrl) {
            newValue += `[[EMOJI:${element.dataset.emojiUrl}]]`
          } else if (element.tagName === 'BR') {
            // Ignore line breaks in single-line input
          } else if (element.tagName === 'DIV' || element.tagName === 'P') {
            // Block elements - process children
            element.childNodes.forEach(processNode)
          } else {
            // Process other elements' children
            element.childNodes.forEach(processNode)
          }
        }
      }

      editableRef.current.childNodes.forEach(processNode)
      return newValue
    }

    // Handle input changes
    const handleInput = () => {
      if (!editableRef.current) return

      isInternalChange.current = true
      const newValue = extractValueFromDOM()

      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue
        onChange(newValue)
      }
      isInternalChange.current = false
    }

    // Handle paste to strip formatting but keep text
    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')

      // Insert plain text at cursor position
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const textNode = document.createTextNode(text)
        range.insertNode(textNode)

        // Move cursor after inserted text
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      // Trigger input handler
      handleInput()
    }

    // Handle key events
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onKeyDown?.(e)
      }
    }

    // Update display when value changes externally (e.g., emoji inserted, message cleared)
    useEffect(() => {
      if (!editableRef.current || isInternalChange.current) return

      // Check if value actually changed from external source
      if (value === lastValueRef.current) return

      lastValueRef.current = value

      // Save cursor position info
      const selection = window.getSelection()
      const hadFocus = document.activeElement === editableRef.current

      // Update content
      const newHTML = getDisplayHTML(value)
      editableRef.current.innerHTML = newHTML

      // Restore focus and cursor to end if we had focus
      if (hadFocus && selection) {
        const range = document.createRange()
        range.selectNodeContents(editableRef.current)
        range.collapse(false) // collapse to end
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }, [value])

    // Initialize content on mount
    useEffect(() => {
      if (editableRef.current && value) {
        editableRef.current.innerHTML = getDisplayHTML(value)
        lastValueRef.current = value
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const showPlaceholder = !value

    return (
      <div className={cn('relative flex-1', className)}>
        <div
          ref={editableRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          role="textbox"
          aria-placeholder={placeholder}
          aria-disabled={disabled}
          className={cn(
            'min-h-[40px] max-h-[120px] overflow-y-auto px-3 py-2 rounded-md border border-primary bg-background text-sm ring-offset-background',
            'focus:outline-none focus:ring-2 focus:ring-primary ring-primary focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            disabled && 'pointer-events-none opacity-50',
            isFocused && 'ring-2 ring-primary ring-offset-2'
          )}
          style={{
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
          }}
          suppressContentEditableWarning
        />

        {/* Placeholder overlay */}
        {showPlaceholder && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
      </div>
    )
  }
)

RichMessageInput.displayName = 'RichMessageInput'

export default RichMessageInput
