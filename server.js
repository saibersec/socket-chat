const axios = require("axios");

const TELEGRAM_TOKEN = "ISI_TOKEN_BARU_KAMU_DISINI";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const FILE = "messages.json";

// ===============================
// 🔥 PASTIKAN FILE ADA
// ===============================
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, "[]");
}

let messages = JSON.parse(fs.readFileSync(FILE));

let onlineUsers = 0;

// { socketId: username }
let connectedUsers = {};

// { username: chatId }
let telegramUsers = {};

io.on("connection", (socket) => {

  // ===============================
  // 🔥 REGISTER TELEGRAM CHAT ID
  // ===============================
  socket.on("registerTelegram", (data) => {
    telegramUsers[data.username] = data.chatId;
  });

  // ===============================
  // 🔥 ONLINE COUNTER
  // ===============================
  onlineUsers++;
  io.emit("onlineCount", onlineUsers);

  socket.emit("loadMessages", messages);

  // ===============================
  // 🔥 REGISTER USERNAME
  // ===============================
  socket.on("registerUser", (username) => {
    connectedUsers[socket.id] = username;
    socket.username = username;
  });

  // ===============================
  // 🔥 TYPING
  // ===============================
  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("stopTyping");
  });

  // ===============================
  // 🔥 CHAT MESSAGE
  // ===============================
  socket.on("chatMessage", async (data) => {

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

    // ===============================
    // 🔥 CEK MENTION @username
    // ===============================
    const words = data.message.split(" ");

    for (let word of words) {
      if (word.startsWith("@")) {

        const mentionedName = word.substring(1);

        // 🔹 Notif Web (kalau online)
        for (let id in connectedUsers) {
          if (connectedUsers[id] === mentionedName) {
            io.to(id).emit("mentioned", {
              from: data.username
            });
          }
        }

        // 🔹 Notif Telegram (walau web tutup)
        if (telegramUsers[mentionedName]) {
          try {
            await axios.post(
              `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
              {
                chat_id: telegramUsers[mentionedName],
                text: `🔥 Kamu di-mention oleh ${data.username}\n\nPesan:\n"${data.message}"`
              }
            );
          } catch (err) {
            console.log("Telegram error:", err.message);
          }
        }

      }
    }

  });

  // ===============================
  // 🔥 DELETE MESSAGE
  // ===============================
  socket.on("deleteMessage", (id) => {
    messages = messages.filter(msg => msg.id !== id);
    fs.writeFileSync(FILE, JSON.stringify(messages, null, 2));
    io.emit("messageDeleted", id);
  });

  // ===============================
  // 🔥 DISCONNECT
  // ===============================
  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
    onlineUsers--;
    io.emit("onlineCount", onlineUsers);
  });

});

// ===============================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});