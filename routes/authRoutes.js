const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const codeModel = require("../models/code");
const messageModel = require("../models/message");

const router = express.Router();

const verifyAdmin = (req, res, next) => {
  // Replace with your actual admin verification logic
  if ((req.user && req.user.role === "admin") || "superadmin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied" });
  }
};

// Register endpoint
router.post("/register", (req, res) => {
  const { firstName, lastName, password, email, phoneNumber, role } = req.body;
  // Validate that either email or phoneNumber is provided
  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ message: "Either email or phone number is required" });
  }

  userModel.createUser(
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    role,
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.status(200).json({ message: "User registered successfully" });
    }
  );
});

// Login endpoint
router.post("/login", (req, res) => {
  const { email, phoneNumber, password } = req.body;

  // Ensure at least one of email or phoneNumber is provided
  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ message: "Either email or phone number is required" });
  }

  userModel.getUserByContactInfo(email || phoneNumber, (err, user) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "An error occurred.", error: err });
    }
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Ensure user object contains password before comparing
    if (!user.password) {
      return res.status(500).json({ message: "User data is incomplete." });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const rol_manage = user.role;
    const firstName = user.firstname;
    const lastName = user.lastname;

    const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
      expiresIn: "1h",
    });

    res.status(200).json({
      token,
      role: rol_manage,
      firstName: firstName,
      lastName: lastName,
    });
  });
});

// Get all users (excluding passwords)
router.get("/users", verifyAdmin, (req, res) => {
  userModel.getAllUsers((err, users) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }
    // Exclude passwords from user objects
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.status(200).json(usersWithoutPasswords);
  });
});

router.post("/change-password", (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  // Ensure all required fields are provided
  if (!userId || !oldPassword || !newPassword) {
    console.log(userId, oldPassword, newPassword);
    return res.status(400).json({
      message: "User ID, old password, and new password are required",
    });
  }

  userModel.changePassword(userId, oldPassword, newPassword, (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(200).json(result);
  });
});
router.post("/update-role", verifyAdmin, (req, res) => {
  const { userId, newRole } = req.body;

  // Validate that userId and newRole are provided
  if (!userId || !newRole) {
    return res.status(400).json({
      message: "User ID and new role are required",
    });
  }

  // Ensure the newRole is valid (e.g., 'admin' or 'user')
  const validRoles = ["admin", "user", "superadmin"];
  if (!validRoles.includes(newRole.toLowerCase())) {
    return res.status(400).json({
      message: "Invalid role provided",
    });
  }

  userModel.updateUserRole(userId, newRole, (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(200).json({ message: "User role updated successfully" });
  });
});

// Endpoint to send a message
router.post("/send", verifyAdmin, (req, res) => {
  const { recipientId, content, read_status } = req.body;
  const senderId = req.body.userId; // Ensure you have the sender's ID from the request (e.g., from a JWT token)

  if (!recipientId || !content) {
    return res
      .status(400)
      .json({ message: "Recipient ID and content are required" });
  }

  messageModel.createMessage(
    senderId,
    recipientId,
    content,
    read_status,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: err.message });
      }
      res.status(200).json({ message: "Message sent successfully" });
    }
  );
});

// Endpoint to get messages for a user
router.get("/user/:userId", (req, res) => {
  const { userId } = req.params;

  messageModel.getMessagesForUser(userId, (err, messages) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!userId) {
      return res.status(400).json({ message: "Message ID is required" });
    }

    messageModel.markMessageAsRead(userId, (err, result) => {
      if (err) {
        return console.log(err);
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Message not found" });
      }
    });

    res.status(200).json(messages);
  });
});

// Endpoint to delete a message
router.post("/message-delete/:messageId", (req, res) => {
  const { messageId } = req.params;
  const userId = req.body.userId;
  console.log(req.body.userId);
  if (!messageId) {
    return res.status(400).json({ message: "Message ID is required" });
  }

  messageModel.deleteMessage(messageId, (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Message not found" });
    }
    messageModel.getMessagesForUser(userId, (err, messages) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.status(200).json(messages);
    });
  });
});

router.get("/user/:userId/unread", (req, res) => {
  const { userId } = req.params;

  messageModel.getUnreadMessagesForUser(userId, (err, messages) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(200).json(messages);
  });
});

module.exports = router;
