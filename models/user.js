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
  createUser: (firstName, lastName, contactInfo, password, role, callback) => {
    // Validate the password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      return callback({ message: passwordValidationError }, null);
    }

    // Check if the username or email already exists
    const checkQuery = "SELECT * FROM users WHERE contactInfo = ?";
    db.query(checkQuery, [contactInfo], (err, result) => {
      if (err) {
        console.error("Error checking contactInfo:", err);
        return callback(err, null);
      }

      // If a user is found with the same username or email, return an error
      if (result.length > 0) {
        if (result[0].contactInfo === contactInfo) {
          return callback({ message: "contactInfo already exists" }, null);
        }
      }

      // If no duplicate found, hash the password and create the user
      const hashedPassword = bcrypt.hashSync(password, 10);
      const query =
        "INSERT INTO users (firstname, lastname, password, contactInfo, role) VALUES (?, ?, ?, ?, ?)";
      db.query(
        query,
        [firstName, lastName, hashedPassword, contactInfo, role],
        (err, result) => {
          if (err) {
            console.error("Error creating user:", err);
            return callback(err, null);
          }
          return callback(null, {
            id: result.insertId,
            firstName,
            lastName,
            contactInfo,
            role,
          });
        }
      );
    });
  },

  // Method to get a user by email
  getUserByContactInfo: (contactInfo, callback) => {
    const query = "SELECT * FROM users WHERE contactInfo = ?";
    db.query(query, [contactInfo], (err, result) => {
      if (err) {
        console.error("Error fetching user by contactInfo:", err);
        return callback(err, null);
      }
      if (result.length === 0) {
        return callback(null, null); // Handle the case where no user is found
      }
      return callback(null, result[0]);
    });
  }
};

module.exports = User;
