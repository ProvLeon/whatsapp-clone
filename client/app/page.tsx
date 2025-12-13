'use client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dot, SendHorizonal } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Router from "next/router"
import { useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"

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
  const route = useRouter();

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messageList, isTypingUser])

  useEffect(() => {
    const socket = io("http://localhost:3001")
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
    // route.push("#last-message")

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

  const sendMessage = () => {
    if (message !== "" && socketRef.current && isConnected) {
      const messageData = {
        message: message,
        time: new Date(Date()).getHours() + ":" + new Date(Date()).getMinutes()
      }

      socketRef.current.emit("typing", false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socketRef.current.emit("send_message", messageData)
      setMessage("")
    }
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
          <h1 className="text-lg font-bold font-geist ">WhatsApp Annex</h1>
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
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} `}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${isOwnMessage ? 'bg-primary/10 rounded-tr-none' : 'bg-white/80 rounded-tl-none'}`}
                  >
                    {!isOwnMessage && <p className="text-xs font-semibold text-primary">{msg.username}</p>}
                    <p className=" text-sm text-gray-700 break-words">{msg.message}</p>
                    <p className="text-xs text-gray-500 text-right mt-1">{msg.time}</p>
                  </div>

                </div>
              )
            }
            )}
            <div ref={messageEndRef} />
          </div>

          {isTypingUser && (
            <div className="sticky left-0 right-0 text-sm text-muted-foreground mb-2 py-1 gap-1 flex bottom-0 bg-muted/80 backgrop-blur-sm rounded-md ">
              {/*<div>*/}
              <span className="italic">{isTypingUser} is typing</span>
              <span className="flex">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-200">.</span>
                <span className="animate-bounce delay-400">.</span>
              </span>
            </div>
          )}
        </div>


        <div className="flex mt-4 space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button
            onClick={sendMessage}
          >
            <SendHorizonal />
          </Button>
        </div>
      </div>
    </div >
  )
}

export default Home
