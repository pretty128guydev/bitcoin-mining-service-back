const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const http = require("http"); // Required to use Socket.IO with Express
const { Server } = require("socket.io"); // Import Socket.IO
const userModel = require("./models/user");

const app = express();

const corsOpts = {
  origin: "*",
  "Access-Control-Allow-Origin": "*",
};

app.use(cors(corsOpts));
app.use(bodyParser.json());

app.use("/api", authRoutes);

const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin (Adjust as needed)
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A new client connected:", socket.id);

  // Example: Send real-time data to the client every 5 seconds
  setInterval(() => {
    const data = {
      message: "Real-time data from server",
      timestamp: new Date(),
    };
    socket.emit("fromServer", data);
  }, 5000);

  // Handle disconnection
  socket.on("getBalance", ({ userId }) => {
    console.log(userId);
    // Use the getPaymentBalance method to retrieve the balance
    userModel.getPaymentBalance(userId, (err, balance) => {
      if (err) {
        console.error("Error fetching balance:", err);
        return socket.emit("balanceResponse", {
          error: "Error fetching balance",
        });
      }

      if (balance === null) {
        return socket.emit("balanceResponse", {
          error: "User not found or balance not available",
        });
      }

      // Send the balance back to the client
      socket.emit("balanceResponse", { balance });
    });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
