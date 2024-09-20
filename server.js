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
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A new client connected:", socket.id);

  socket.on("getBalance", ({ userId }) => {
    console.log(userId);
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
      socket.emit("balanceResponse", { balance });
    });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
