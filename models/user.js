const db = require("../config/db");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const cron = require("node-cron");

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
    balance,
    passportNumber,
    passportImagePath,
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
        "INSERT INTO users (firstname, lastname, password, email, phoneNumber, role, balance, passportNumber, passportImagePath) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)";
      db.query(
        query,
        [
          firstName,
          lastName,
          hashedPassword,
          email,
          phoneNumber,
          role,
          passportNumber,
          passportImagePath,
        ],
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
            passportNumber,
            passportImagePath,
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
      "SELECT id, firstname, lastname, email, phoneNumber, role, passport_number, passport_image_path, balance FROM users";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching all users:", err);
        return callback(err, null);
      }
      return callback(null, results);
    });
  },

  updateUserRole: (userId, newRole, callback) => {
    // Make sure to sanitize and validate inputs in a real application
    const query = "UPDATE users SET role = ? WHERE id = ?";
    db.query(query, [newRole, userId], (err, results) => {
      if (err) {
        return callback(err);
      }
      callback(null, results);
    });
  },

  updateUserPassportVerificated: (userId, newverificated, callback) => {
    // Make sure to sanitize and validate inputs in a real application
    const query = "UPDATE users SET passport_verificated = ? WHERE id = ?";
    db.query(query, [newverificated, userId], (err, results) => {
      if (err) {
        return callback(err);
      }
      callback(null, results);
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

  updatePaymentBalance: (id, actually_paid, callback) => {
    const query = `
        UPDATE users 
        SET balance = balance + ? 
        WHERE id = ?`;

    db.query(query, [actually_paid, id], (err, result) => {
      console.log(actually_paid, id);
      if (err) {
        console.error("Error updating payment balance:", err);
        return callback(err, null);
      }
      return callback(null, result);
    });
  },

  getPaymentBalance: (id, callback) => {
    const query = `
      SELECT balance 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment balance:", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }

      // Return the balance
      return callback(null, result[0].balance);
    });
  },

  getPassportVerificated: (id, callback) => {
    const query = `
      SELECT passport_verificated 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment balance:", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }

      // Return the balance
      return callback(null, result[0].passport_verificated);
    });
  },
  updatePassport: (userId, passportNumber, passportImagePath, callback) => {
    const query = `UPDATE users SET passport_number = ?, passport_image_path = ? WHERE id = ?`;
    db.query(
      query,
      [passportNumber, passportImagePath, userId],
      (err, result) => {
        if (err) {
          console.error("Error updating passport information:", err);
          return callback(err, null);
        }
        return callback(null, result);
      }
    );
  },

  updatePackage: (userId, packagePrice, packageRole, callback) => {
    const packageStatus = "active"; // Set status to active
    const buyAt = new Date(); // Store the current timestamp when purchased

    // Update package details based on userId and packageId
    const query = `
      UPDATE users
      SET package_price = ?, package_role = ?, buy_at = ?, package_status = ?
      WHERE id = ?`;

    db.query(
      query,
      [packagePrice, packageRole, buyAt, packageStatus, userId],
      (err, result) => {
        if (err) {
          console.error("Error updating package information:", err);
          return callback(err, null);
        }
        return callback(null, result);
      }
    );
  },

  // Fetch package details method (with buy_at timestamp)
  getUserPackageDetails: (userId, callback) => {
    const query = `SELECT package_price, package_role, buy_at, package_status 
                   FROM packages WHERE id = ? AND package_status = 'active'`;

    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error("Error fetching package details:", err);
        return callback(err, null);
      }

      if (result.length === 0) {
        return callback(null, null); // No active package
      }

      return callback(null, result[0]);
    });
  },

  // startBalanceIncrease: (userId, packageRole, callback) => {
  //   const now = moment().format("YYYY-MM-DD HH:mm:ss");
  //   const oneHourLater = moment().add(1, "hour").format("YYYY-MM-DD HH:mm:ss");

  //   const query = `
  //     UPDATE users
  //     SET balance_increase_start = ?, 
  //         balance_increase_end = ?, 
  //         package_role = ?
  //     WHERE id = ?`;

  //   db.query(query, [now, oneHourLater, packageRole, userId], (err, result) => {
  //     if (err) {
  //       console.error("Error starting balance increase:", err);
  //       return callback(err, null);
  //     }
  //     callback(null, { message: "Balance increase started" });
  //   });
  // },
};

module.exports = User;

// cron.schedule("* * * * *", () => {
//   // Fetch users with active balance increases
//   const query = `
//     SELECT id, package_role, balance_increase_end
//     FROM users
//     WHERE balance_increase_start IS NOT NULL 
//       AND balance_increase_end > NOW()
//       AND package_role IS NOT NULL`;

//   db.query(query, (err, users) => {
//     if (err) {
//       console.error("Error fetching users for balance update:", err);
//       return;
//     }

//     users.forEach((user) => {
//       // Ensure package_role is a numeric value and not null
//       const increaseAmount = parseFloat(user.package_role);
//       if (isNaN(increaseAmount)) {
//         console.error(`Invalid package_role value for user ${user.id}`);
//         return;
//       }

//       // Directly increase the balance by package_role
//       const updateQuery = `
//         UPDATE users 
//         SET balance = balance + ?
//         WHERE id = ?`;

//       db.query(updateQuery, [increaseAmount, user.id], (err, result) => {
//         if (err) {
//           console.error(`Error updating balance for user ${user.id}:`, err);
//         } else {
//           console.log(`Balance updated for user ${user.id}`);
//         }
//       });
//     });

//     // Deactivate expired balance increases
//     const deactivateQuery = `
//       UPDATE users
//       SET balance_increase_start = NULL,
//           balance_increase_end = NULL,
//           package_role = NULL
//       WHERE balance_increase_end <= NOW()`;

//     db.query(deactivateQuery, (err, result) => {
//       if (err) {
//         console.error("Error deactivating expired balance increases:", err);
//       } else {
//         console.log("Expired balance increases deactivated.");
//       }
//     });
//   });
// });
