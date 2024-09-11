const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const CodeModel = require("../models/code");

const router = express.Router();

// Register endpoint
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const role = "user";
  userModel.createUser(username, email, password, role, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Registration failed" });
    }
    res.status(200).json({ message: "User registered successfully" });
  });
});

// AdminRegister endpoint
router.post("/register_admin", async (req, res) => {
  const { username, email, password } = req.body.values;
  const role = req.body.role;
  const invitationCode = req.body.invitationcode;

  try {
    // Check the invitation code
    const codeEntry = await CodeModel.checkInvitationCode(invitationCode);
    console.log(codeEntry);
    // If the code is not found, return an error
    if (!codeEntry) {
      return res.status(400).json({ message: "Invalid invitation code" });
    }

    // If the code is inactive (status is false), return an error
    if (!codeEntry.status) {
      return res.status(400).json({ message: "Invitation code is inactive" });
    }

    // Create the user if the invitation code is valid and active
    userModel.createUser(username, email, password, role, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Registration failed" });
      }
      res.status(200).json({ message: "User registered successfully" });

      // Optionally, update the invitation code status after successful registration
      codeEntry.status = 0; // Set status to inactive after use
    });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error });
  }
});

// Login endpoint
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  userModel.getUserByEmail(email, (err, result) => {
    if (err || result.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }
    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const rol_manage = user.role;

    const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
      expiresIn: "1h",
    });

    if (rol_manage == "admin") {
      res.status(200).json({ token, role: "admin" });
    }
    if (rol_manage == "user") {
      res.status(200).json({ token, role: "user" });
    }
  });
});

module.exports = router;
