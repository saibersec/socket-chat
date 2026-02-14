const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const FILE = "messages.json";

// 🔥 Pastikan file ada
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}

// 🔥 Load pesan dari file
let messages = JSON.parse(fs.readFileSync(FILE));

let onlineUsers = 0;

io.on("connection", (socket) => {

  onlineUsers++;
  io.emit("onlineCount", onlineUsers);

  socket.emit("loadMessages", messages);

  // 🔥 SAAT ADA PESAN BARU
  socket.on("chatMessage", (data) => {

    const time = new Date().toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit"
    });

    const newMessage = {
      id: Date.now(),
      username: data.username,
      message: data.message,
      time: time
    };

    messages.push(newMessage);
    fs.writeFileSync(FILE, JSON.stringify(messages, null, 2));

    io.emit("chatMessage", newMessage);
  });

  // 🔥 TARUH DI SINI (DI BAWAH chatMessage)
  socket.on("deleteMessage", (id) => {

    messages = messages.filter(msg => msg.id !== id);

    fs.writeFileSync(FILE, JSON.stringify(messages, null, 2));

    io.emit("messageDeleted", id);
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running...");
});
