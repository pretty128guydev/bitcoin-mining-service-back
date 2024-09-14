const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const codeModel = require("../models/code");

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
    console.log(userId, oldPassword, newPassword)
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

module.exports = router;
