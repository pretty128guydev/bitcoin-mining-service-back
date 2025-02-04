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

const is24HoursDifference = (oldTime, newTime) => {
  const oldDate = new Date(oldTime);
  const newDate = new Date(newTime);

  // Calculate the difference in milliseconds
  const timeDifference = newDate - oldDate;

  // Convert milliseconds to hours
  const hoursDifference = timeDifference / (1000 * 60 * 60);

  // Return true if the difference is 24 hours or more
  return hoursDifference >= 24;
};

const getNewBuyAt = (oldTime, newTime) => {
  const oldDate = new Date(oldTime);
  const newDate = new Date(newTime);

  // Calculate the difference in milliseconds
  const timeDifference = newDate - oldDate;

  // Convert the time difference to full days (24-hour periods)
  const fullDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  // Add the full days back to the oldTime
  oldDate.setDate(oldDate.getDate() + fullDays);

  return oldDate;
}

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
        console.error("Error checking email or phoneNumber->", err);
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
        "INSERT INTO users (firstname, lastname, password, email, phoneNumber, role, balance, button_clicks, invites) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)";
      db.query(
        query,
        [
          firstName,
          lastName,
          hashedPassword,
          email,
          phoneNumber,
          role,
        ],
        (err, result) => {
          if (err) {
            console.error("Error creating user->", err);
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
        console.error("Error fetching user by contactInfo->", err);
        return callback(err, null);
      }
      if (result.length === 0) {
        return callback(null, null); // Handle the case where no user is found
      }
      return callback(null, result[0]);
    });
  },

  getUserByUserId: (userid, callback) => {
    const query = "SELECT * FROM users WHERE id = ?";
    db.query(query, [userid], (err, result) => {
      if (err) {
        console.error("Error fetching user by userid->", err);
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
      "SELECT id, firstname, lastname, email, phoneNumber, role, passport_number, passport_image_path, balance, button_clicks, package_status FROM users";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching all users->", err);
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

  updateInvites: (userId, callback) => {
    // Make sure to sanitize and validate inputs in a real application
    const query = "UPDATE users SET invites = invites + 1 WHERE id = ?";
    db.query(query, [userId], (err, results) => {
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
        console.error("Error fetching user->", err);
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
          console.error("Error updating password->", err);
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
      if (err) {
        console.error("Error updating payment balance->", err);
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
        console.error("Error fetching payment balance->", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }
      console.log(result[0])
      // Return the balance
      return callback(null, result[0].balance);
    });
  },

  getPackage_remain: (id, callback) => {
    const query = `
      SELECT package_remain, package_status, package_role 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment package_remain & package_status->", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }

      // Return the balance
      return callback(null, { package_remain: result[0].package_remain, package_status: result[0].package_status, package_role: result[0].package_role });
    });
  },

  getPackageRole: (id, callback) => {
    const query = `
      SELECT package_role 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment package_role->", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }

      // Return the balance
      return callback(null, result[0].package_role);
    });
  },

  getPackageStatus: (id, callback) => {
    const query = `
      SELECT package_status 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment package_status->", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }

      // Return the balance
      return callback(null, result[0].package_status);
    });
  },

  getPassportVerificated: (id, callback) => {
    const query = `
      SELECT passport_verificated 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment balance->", err);
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
          console.error("Error updating passport information->", err);
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
      SET package_price = ?, package_role = ?, buy_at = ?, package_status = ?, package_remain = 60
      WHERE id = ?`;

    db.query(
      query,
      [packagePrice, packageRole, buyAt, packageStatus, userId],
      (err, result) => {
        if (err) {
          console.error("Error updating package information->", err);
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
        console.error("Error fetching package details->", err);
        return callback(err, null);
      }

      if (result.length === 0) {
        return callback(null, null); // No active package
      }

      return callback(null, result[0]);
    });
  },

  updateButtonClicksintozero: (userId, callback) => {
    // Query to get buy_at, balance, and packageRole for the user
    const query = "SELECT buy_at, package_remain FROM users WHERE id = ?";

    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error("Error fetching user details->", err);
        return callback(err, null);
      }

      if (result.length === 0) {
        return callback({ message: "User not found" }, null);
      }

      const { buy_at: oldTime, package_remain: package_remain } = result[0];
      const currentTime = new Date();

      // Calculate the difference in milliseconds
      const timeDifference = currentTime - new Date(
        oldTime
      );

      // Convert time difference to hours
      const hoursDifference = timeDifference / (1000 * 60 * 60);

      // Check if 24 hours have passed
      if (hoursDifference >= 24) {
        // Calculate how many full 24-hour periods have passed
        const full24HourPeriods = Math.floor(hoursDifference / 24);

        const fullDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24))
        const newbuy_at = getNewBuyAt(oldTime, currentTime);

        const updatedintozero = 0;
        const newpackage_remain = package_remain - 1;
        // Update the user's balance in the database
        const updateQuery = "UPDATE users SET button_clicks = ?, buy_at = ?, package_remain = ? WHERE id = ?";
        db.query(updateQuery, [updatedintozero, newbuy_at, newpackage_remain, userId], (err, updateResult) => {
          if (err) {
            console.error("Error updating user balance->", err);
            return callback(err, null);
          }

          return callback(null, {
            message: "Button Clicks updated successfully",
          });
        });
      } else {
        // If less than 24 hours have passed, no update is needed
        return callback(null, {
          message: "Less than 24 hours have passed since the last purchase"
        });
      }
    });
  },

  updateButtonClicks: (userId, newclicks, callback) => {
    // Make sure to sanitize and validate inputs in a real application
    const query = "UPDATE users SET button_clicks = button_clicks + 1 WHERE id = ?";
    db.query(query, [userId], (err, results) => {
      if (err) {
        return callback(err);
      }
      callback(null, results);
    });
  },


  getButtonClickcs: (id, callback) => {
    const query = `
      SELECT button_clicks 
      FROM users 
      WHERE id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error("Error fetching payment button_clicks->", err);
        return callback(err, null);
      }

      // Check if the payment exists
      if (result.length === 0) {
        return callback(null, null);
      }

      // Return the balance
      return callback(null, result[0].button_clicks);
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
  //       console.error("Error starting balance increase->", err);
  //       return callback(err, null);
  //     }
  //     callback(null, { message: "Balance increase started" });
  //   });
  // },
};

module.exports = User;

