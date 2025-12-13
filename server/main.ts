import { createServer } from "node:http";
import { Server } from "socket.io";


const server = createServer()

const users: Map<string, string> = new Map()

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
})

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`)

  socket.on("join", (username: string) => {
    users.set(socket.id, username)
  })

  socket.on("send_message", (data) => {
    const username = users.get(socket.id) || "User"
    io.emit("receive_message", { ...data, username })
  })

  socket.on("typing", (isTyping: boolean) => {
    const username = users.get(socket.id) || "someone"
    socket.broadcast.emit("user_typing", { username, isTyping })
  })

  socket.on("disconnect", (message) => {
    const username = users.get(socket.id)
    console.log(`User ${username} disconnected due to ${message} `)
    users.delete(socket.id)
  })
})

const PORT = parseInt(Deno.env.get("PORT") || "3001")

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`)
})
