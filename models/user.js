const db = require("../config/db");
const bcrypt = require("bcryptjs");

// Function to validate password
const validatePassword = (password) => {
  if (typeof password !== "string") {
    return "Password must be a string.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  if (password.length > 22) {
    return "Password must be no more than 22 characters long.";
  }
  return null; // null means password is valid
};

// User Model
const User = {
  // Method to create a new user
  createUser: (
    firstName,
    lastName,
    email,
    phoneNumber,
    password,
    role,
    callback
  ) => {
    // Validate the password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      return callback({ message: passwordValidationError }, null);
    }

    // Check if the email or phoneNumber already exists
    const checkQuery = "SELECT * FROM users WHERE email = ? OR phoneNumber = ?";
    db.query(checkQuery, [email, phoneNumber], (err, result) => {
      if (err) {
        console.error("Error checking email or phoneNumber:", err);
        return callback(err, null);
      }

      // If a user is found with the same email or phoneNumber, return an error
      if (result.length > 0) {
        if (result[0].email === email) {
          return callback({ message: "Email already exists" }, null);
        }
        if (result[0].phoneNumber === phoneNumber) {
          return callback({ message: "Phone number already exists" }, null);
        }
      }

      // If no duplicate found, hash the password and create the user
      const hashedPassword = bcrypt.hashSync(password, 10);
      const query =
        "INSERT INTO users (firstname, lastname, password, email, phoneNumber, role) VALUES (?, ?, ?, ?, ?, ?)";
      db.query(
        query,
        [firstName, lastName, hashedPassword, email, phoneNumber, role],
        (err, result) => {
          if (err) {
            console.error("Error creating user:", err);
            return callback(err, null);
          }
          return callback(null, {
            id: result.insertId,
            firstName,
            lastName,
            email,
            phoneNumber,
            role,
          });
        }
      );
    });
  },

  // Method to get a user by email or phone number
  getUserByContactInfo: (contactInfo, callback) => {
    const query = "SELECT * FROM users WHERE email = ? OR phoneNumber = ?";
    db.query(query, [contactInfo, contactInfo], (err, result) => {
      if (err) {
        console.error("Error fetching user by contactInfo:", err);
        return callback(err, null);
      }
      if (result.length === 0) {
        return callback(null, null); // Handle the case where no user is found
      }
      return callback(null, result[0]);
    });
  },

  // Method to get all users excluding their passwords
  getAllUsers: (callback) => {
    const query =
      "SELECT id, firstname, lastname, email, phoneNumber, role FROM users";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching all users:", err);
        return callback(err, null);
      }
      return callback(null, results);
    });
  },

  changePassword: (userId, oldPassword, newPassword, callback) => {
    // Validate the new password
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      return callback({ message: passwordValidationError }, null);
    }

    // Get the user's current password from the database
    const getUserQuery = "SELECT password FROM users WHERE id = ?";
    db.query(getUserQuery, [userId], (err, result) => {
      if (err) {
        console.error("Error fetching user:", err);
        return callback(err, null);
      }
      if (result.length === 0) {
        return callback({ message: "User not found" }, null);
      }

      const user = result[0];
      // Check if the old password is correct
      const isMatch = bcrypt.compareSync(oldPassword, user.password);
      if (!isMatch) {
        return callback({ message: "Old password is incorrect" }, null);
      }

      // Hash the new password and update it in the database
      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
      const updateQuery = "UPDATE users SET password = ? WHERE id = ?";
      db.query(updateQuery, [hashedNewPassword, userId], (err, result) => {
        if (err) {
          console.error("Error updating password:", err);
          return callback(err, null);
        }
        return callback(null, { message: "Password changed successfully" });
      });
    });
  },
};

module.exports = User;
