'use client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dot, SendHorizonal, Smile } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useMemo } from "react"
import { io, Socket } from "socket.io-client"
import { EmojiPicker } from "@/components/EmojiPicker"
import { EmojiSuggestions } from "@/components/EmojiSuggestions"
import { MessageContent } from "@/components/MessageContent"
import { Emoji, parseEmojisInMessage, getShortcode } from "@/lib/emoji-data"

interface Message {
  username?: string;
  message: string;
  time: string
}

const Home = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [message, setMessage] = useState("")
  const [messageList, setMessageList] = useState<Message[]>([])
  const socketRef = useRef<Socket | null>(null)
  const [isTypingUser, setIsTypingUser] = useState<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isJoined, setIsJoined] = useState(false);
  const [username, setUsername] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const route = useRouter();

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Detect if user is typing a shortcode (e.g., ":smi")
  const shortcodeMatch = useMemo(() => {
    // Find the last ":" that might be a shortcode start
    const match = message.match(/:([a-zA-Z0-9_]*)$/)
    if (match && match[1].length > 0) {
      return {
        query: match[1],
        startIndex: message.lastIndexOf(':' + match[1])
      }
    }
    return null
  }, [message])

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messageList, isTypingUser])

  useEffect(() => {
    const socket = io("https://whatsapp-clone-server-57w6.onrender.com")
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id)
      setIsConnected(true)
    })

    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data])
    })

    socket.on("user_typing", (data) => {
      if (data.isTyping) {
        setIsTypingUser(data.username)
      } else {
        setIsTypingUser(null)
      }
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from server")
      setIsConnected(false)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinChat = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("join", username)
      setIsJoined(true)
    }
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)

    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing", true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", false)
    }, 1000)
  }

  const handleEmojiSelect = (emoji: Emoji) => {
    // Insert emoji marker into message
    const emojiMarker = `[[EMOJI:${emoji.url}]]`
    setMessage(prev => prev + emojiMarker)

    // Focus back on input
    inputRef.current?.focus()
    setShowEmojiPicker(false)

    // Trigger typing indicator
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing", true)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing", false)
      }, 1000)
    }
  }

  // Handle emoji selection from suggestions (shortcode autocomplete)
  const handleEmojiSuggestionSelect = (emoji: Emoji, shortcode: string) => {
    if (shortcodeMatch) {
      // Replace the partial shortcode with the emoji marker
      const beforeShortcode = message.slice(0, shortcodeMatch.startIndex)
      const emojiMarker = `[[EMOJI:${emoji.url}]]`
      setMessage(beforeShortcode + emojiMarker)

      // Focus back on input
      inputRef.current?.focus()
    }
  }

  const sendMessage = () => {
    if (message !== "" && socketRef.current && isConnected) {
      // Parse any shortcodes in the message before sending
      const parsedMessage = parseEmojisInMessage(message)

      const messageData = {
        message: parsedMessage,
        time: new Date(Date()).getHours() + ":" + new Date(Date()).getMinutes()
      }

      socketRef.current.emit("typing", false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socketRef.current.emit("send_message", messageData)
      setMessage("")
      setShowEmojiPicker(false)
    }
  }

  // Get display value for input (show emoji placeholder)
  const getDisplayMessage = () => {
    return message.replace(/\[\[EMOJI:[^\]]+\]\]/g, '😊')
  }

  if (!isJoined) {
    return (
      <div className="bg-background flex flex-col items-center justify-center min-h-screen py-2">
        <div className="max-w-md bg-white rounded-lg shadow-md p-6 w-full flex flex-col space-y-4">
          <Image
            src="/logo_md.png"
            alt="WhatsApp Annex Logo"
            width={160}
            height={160}
            loading="eager"
          />
          <div>
            <h1 className="text-lg font-bold text-primary">WhatsApp Annex</h1>
            <h3 className="text-sm text-gray-500">Enter your name to join the chat.</h3>
          </div>

          <div className="flex flex-col space-x-2 space-y-2">
            <Input
              type="text"
              placeholder="Enter your name..."
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinChat()}
            />
            <Button
              className="flex items-center justify-center"
              onClick={joinChat}
            >
              <p> Join Chat</p> <SendHorizonal />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background flex flex-col items-center justify-center min-h-screen py-2">
      <div className="max-w-md bg-white rounded-lg shadow-md p-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold font-geist">WhatsApp Annex</h1>
          <div className={`flex items-center ${isConnected ? 'text-primary' : 'text-destructive/80'}`}>
            <Dot />
            <span className="text-sm">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="mt-6 h-96 bg-muted rounded-md p-4 overflow-y-auto relative">
          <div className="flex flex-col gap-2 pb-2">
            {messageList.map((msg, index) => {
              const isOwnMessage = msg.username === username;
              return (
                <div
                  key={index}
                  id={index === messageList.length - 1 ? "last-message" : ""}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} `}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${isOwnMessage ? 'bg-primary/10 rounded-tr-none' : 'bg-white/80 rounded-tl-none'}`}
                  >
                    {!isOwnMessage && <p className="text-xs font-semibold text-primary">{msg.username}</p>}
                    <div className="text-sm text-gray-700 break-words">
                      <MessageContent content={msg.message} />
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-1">{msg.time}</p>
                  </div>
                </div>
              )
            })}
            <div ref={messageEndRef} />
          </div>

          {isTypingUser && (
            <div className="sticky left-0 right-0 text-sm text-muted-foreground mb-2 py-1 gap-1 flex bottom-0 bg-muted/80 backdrop-blur-sm rounded-md">
              <span className="italic">{isTypingUser} is typing</span>
              <span className="flex">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-200">.</span>
                <span className="animate-bounce delay-400">.</span>
              </span>
            </div>
          )}
        </div>

        {/* Message Input Area */}
        <div className="flex mt-4 space-x-2 relative">
          {/* Emoji Picker */}
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onEmojiSelect={handleEmojiSelect}
          />

          {/* Emoji Suggestions (Autocomplete) */}
          <EmojiSuggestions
            query={shortcodeMatch?.query || ''}
            isVisible={!!shortcodeMatch && !showEmojiPicker}
            onSelect={handleEmojiSuggestionSelect}
            onClose={() => setMessage(prev => prev)} // Just keep message as is
          />

          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`flex-shrink-0 ${showEmojiPicker ? 'bg-primary/10 text-primary' : ''}`}
          >
            <Smile className="w-5 h-5" />
          </Button>

          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message... (use :emoji_name:)"
            value={getDisplayMessage()}
            onChange={handleTyping}
            onKeyDown={(e) => {
              // Don't send if suggestions are open and user presses Enter
              if (e.key === 'Enter' && !shortcodeMatch) {
                sendMessage()
              }
            }}
            className="flex-1"
          />
          <Button onClick={sendMessage}>
            <SendHorizonal />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Home
