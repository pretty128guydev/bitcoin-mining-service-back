const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const codeModel = require("../models/code");

const router = express.Router();

// Register endpoint
router.post("/register", (req, res) => {
  const { firstName, lastName, password, contactInfo, role } = req.body;
  console.log(req.body);
  userModel.createUser(
    firstName,
    lastName,
    contactInfo,
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

// AdminRegister endpoint
// router.post("/register_admin", async (req, res) => {
//   const { username, email, password } = req.body.values;
//   const role = req.body.role;
//   const invitationCode = req.body.invitationcode;

//   try {
//     // Check if the invitation code exists and is active (status is 1)
//     codeModel.getCodeByCode(invitationCode, (err, codeEntry) => {
//       if (err) {
//         s;
//         return res.status(500).json({
//           message: "An error occurred while fetching the invitation code.",
//         });
//       }

//       // Check if the code exists and is active
//       if (!codeEntry || codeEntry.status !== 1) {
//         return res
//           .status(400)
//           .json({ message: "Invalid or inactive invitation code." });
//       }

//       // Proceed with user registration
//       userModel.createUser(username, email, password, role, (err, result) => {
//         if (err) {
//           return res.status(500).json({ message: err.message });
//         }

//         // Update the invitation code to inactive after successful registration
//         codeModel.updateCode(
//           codeEntry.id,
//           codeEntry.code,
//           0,
//           (err, updateResult) => {
//             if (err) {
//               return res
//                 .status(500)
//                 .json({ message: "Failed to update invitation code status." });
//             }

//             res.status(200).json({
//               message:
//                 "User registered successfully, invitation code marked as inactive.",
//             });
//           }
//         );
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ message: "An error occurred.", error });
//   }
// });

// Login endpoint
router.post("/login", (req, res) => {
  const { contactInfo, password } = req.body;
  userModel.getUserByContactInfo(contactInfo, (err, user) => {
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

    const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
      expiresIn: "1h",
    });

    if (rol_manage === "admin") {
      res.status(200).json({ token, role: "admin" });
    } else if (rol_manage === "superadmin") {
      res.status(200).json({ token, role: "superadmin" });
    } else if (rol_manage === "user") {
      res.status(200).json({ token, role: "user" });
    } else {
      res.status(500).json({ message: "Unknown role" });
    }
  });
});

module.exports = router;
