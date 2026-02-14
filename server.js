const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server);

app.use(express.static("public"));

let messages = [];

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("chatMessage", (msg) => {
    const messageData = {
      id: Date.now(),
      text: msg
    };

    messages.push(messageData);
    io.emit("chatMessage", messageData);
  });

  socket.on("deleteMessage", (id) => {
    messages = messages.filter(msg => msg.id !== id);
    io.emit("deleteMessage", id);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
