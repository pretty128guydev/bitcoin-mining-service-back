const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const userModel = require("../models/user");
const messageModel = require("../models/message");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  // Listen for 'getBalance' event
  // socket.on("getBalance", (userId) => {
  //   // Fetch balance from the database
  //   userModel.getPaymentBalance(userId, (err, balance) => {
  //     if (err) {
  //       console.error("Error fetching balance->", err);
  //       socket.emit("balanceError", "Error fetching balance");
  //     } else if (balance === null) {
  //       socket.emit("balanceError", "User not found");
  //     } else {
  //       // Emit the balance back to the frontend
  //       socket.emit("balanceResponse", balance);
  //     }
  //   });
  // });
  // socket.on("checkUnreadMessages", (userId) => {
  //   const user_id = userId;
  //   // Fetch unread messages for the user
  //   messageModel.getUnreadMessagesForUser(userId, (err, unreadMessages) => {
  //     if (err) {
  //       console.error("Error fetching unread messages->", err);
  //       socket.emit("unreadMessagesError", "Error fetching unread messages");
  //     } else {
  //       const unread_messages = unreadMessages.length;
  //       console.log(unread_messages);
  //       // Emit the unread messages back to the frontend
  //       socket.emit("unreadMessagesResponse", unread_messages, user_id);
  //     }
  //   });
  // });
});

server.listen(8000, () => {
  console.log("Socket.IO server is running on port 8000");
});

module.exports = io;
