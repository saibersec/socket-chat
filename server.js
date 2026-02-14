let messages = [];

io.on("connection", (socket) => {

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

});
