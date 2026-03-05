const axios = require("axios");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const TELEGRAM_TOKEN = "8676341356:AAE56RWUo-RzO12BmlKh7Klyg7YkpnGxy9U";

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

// { usernameLowercase: chatId }
let telegramUsers = {};

io.on("connection", (socket) => {

  onlineUsers++;
  io.emit("onlineCount", onlineUsers);

  socket.emit("loadMessages", messages);

  // ===============================
  // 🔥 REGISTER USERNAME
  // ===============================
  socket.on("registerUser", (username) => {
    if (!username) return;

    connectedUsers[socket.id] = username;
    socket.username = username;

    console.log("REGISTERED:", username);
  });

  // ===============================
  // 🔥 REGISTER TELEGRAM
  // ===============================
  socket.on("registerTelegram", (data) => {
    if (!data.username || !data.chatId) return;

    telegramUsers[data.username.toLowerCase()] = data.chatId;

    console.log("TELEGRAM REGISTER:", data.username);
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

    if (!data.message || !data.username) return;

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
    // 🔥 DETECT MENTION (ANTI GAGAL)
    // ===============================
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;

    while ((match = mentionRegex.exec(data.message)) !== null) {

      const mentionedName = match[1].toLowerCase();

      console.log("DETECTED MENTION:", mentionedName);
      console.log("CONNECTED USERS:", connectedUsers);

      // 🔹 WEB NOTIF
      for (let id in connectedUsers) {
        const onlineUser = connectedUsers[id];

        if (
          onlineUser &&
          onlineUser.toLowerCase() === mentionedName
        ) {
          console.log("SENDING WEB NOTIF TO:", onlineUser);

          io.to(id).emit("mentioned", {
            from: data.username
          });
        }
      }

      // 🔹 TELEGRAM NOTIF
      if (telegramUsers[mentionedName]) {
        try {
          console.log("SENDING TELEGRAM NOTIF TO:", mentionedName);

          await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
            {
              chat_id: telegramUsers[mentionedName],
              text: `🔥 Kamu di-mention oleh ${data.username}\n\nPesan:\n"${data.message}"`
            }
          );

        } catch (err) {
          console.log("TELEGRAM ERROR:", err.message);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});