import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'node:http';

const app = express();
app.use(cors())

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }
});

const users: Map<string, string> = new Map();

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`)

  socket.on("join", (username: string) => {
    users.set(socket.id, username)
    console.log(`${username} joined the chat.`)
  })

  socket.on("send_message", (data) => {
    const username = users.get(socket.id) || "Anonymous"
    io.emit("receive_message", { ...data, username })
  })

  socket.on("typing", (isTyping: boolean) => {
    const username = users.get(socket.id) || "Someone"
    socket.broadcast.emit("user_typing", { username, isTyping })
  })

  socket.on("disconnect", () => {
    console.log(`${users.get(socket.id) || "User"} Disconnedted`)
    users.delete(socket.id)
  })
})

server.listen(3001, () => {
  console.log("Server Running on Port 3001")
})
