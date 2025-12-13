'use client'
import Button from "@/components/Button";
import Input from "@/components/Input";
import { SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react"
import io, { Socket } from "socket.io-client";


// let socket: Socket;

interface Message {
  username: string;
  message: string;
  time: string
}

const Home = () => {
  const [username, setUsername] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {

    const socket = io("http://192.168.100.7:3001");
    socketRef.current = socket

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id)
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from server")
      setIsConnected(false)
    })

    socket.on("receive_message", (data: Message) => {
      setMessageList((list) => [...list, data])
    });

    socket.on("user_typing", (data: { username: string, isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUser(data.username)
      } else {
        setTypingUser(null)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const joinChat = () => {
    if (username.trim() !== "" && socketRef.current && isConnected) {
      socketRef.current.emit("join", username.trim())
      setHasJoined(true)
    }
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)

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

  const sendMessage = async () => {
    if (message !== "" && socketRef.current && isConnected) {
      const messageData = {
        message: message,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      }

      socketRef.current.emit("typing", false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      socketRef.current.emit("send_message", messageData);
      setMessage("")
    }
  }


  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">WhatsApp Lite</h2>
          <p className="text-gray-600 text-center mb-4">Enter your name to join the chat</p>

          <div className="flex flex-col items-center space-y-4">
            <Input
              type="text"
              placeholder="Your name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinChat()}
              className="w-full"
            />
            <Button
              onClick={joinChat}
              className=" rounded-lg w-auto flex items-center justify-center gap-2 text-lg font-bold text-white"
            >
              Join Chat
              <span><SendHorizonal /></span>

            </Button>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">WhatsApp Lite</h2>

        <div className="h-80 overflow-y-auto border border-gray-200 rounded p-3 mb-4 bg-gray-50 flex flex-col gap-2">
          {messageList.map((msg, index) => {
            const isOwnMessage = msg.username === username;

            return (
              <div
                key={index}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${isOwnMessage ? 'bg-[#d9fdd3] rounded-tr-none'
                    : 'bg-white rounded-tl-none'}`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold text-green-600 mb-1">{msg.username}</p>
                  )}
                  <p className="text-sm text-gray-800 wrap-break-word">{msg.message}</p>
                  <p className="text-[10px] text-gray-500 text-right mt-1">{msg.time}</p>
                </div>
              </div>);
          }

          )}
        </div>

        {typingUser && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
            <span className="italic">{typingUser} is typing</span>
            <span className="flex gap-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce delay-200">.</span>
              <span className="animate-bounce delay-400">.</span>
            </span>
          </div>
        )}

        <div className="flex items-center space-x-2">

          <Input
            type="text"
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}

          />

          <button
            onClick={sendMessage}
            disabled={!isConnected}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-0"
          >
            <SendHorizonal />
          </button>
        </div>
        {!isConnected && <p className="text-red-500 text-sm mt-2 text-center">Disconnected from server</p>}
      </div>
    </div >)
}

export default Home
