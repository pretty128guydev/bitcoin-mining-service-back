const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const codeModel = require("../models/code");
const messageModel = require("../models/message");
const paymentsModel = require("../models/payments");
const io = require("../utils/websocket");
const axios = require("axios");
const multer = require("multer");

const router = express.Router();

const verifyAdmin = (req, res, next) => {
  // Replace with your actual admin verification logic
  if ((req.user && req.user.role === "admin") || "superadmin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied" });
  }
};

router.get("/", (req, res) => {
  return res.json({ message: "This is test" });
});

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
        console.log(err);
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

  // Fetch unread messages for the user
  messageModel.getUnreadMessagesForUser(recipientId, (err, unreadMessages) => {
    if (err) {
      console.error("Error fetching unread messages:", err);
    } else {
      const unread_messages = unreadMessages.length;
      console.log(unread_messages);
      // Emit the unread messages back to the frontend
      io.emit("unreadMessagesResponse", unread_messages, recipientId);
    }
  });
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
      const count = result.length;
      res.status(200).json({ messages: messages, count: count });
    });
  });
});

// Endpoint to delete a message
router.post("/message-delete/:messageId", (req, res) => {
  const { messageId } = req.params;
  const userId = req.body.userId;
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
  console.log(userId);

  messageModel.getUnreadMessagesForUser(userId, (err, messages) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(200).json(messages);
  });
});

router.post("/crypto_payment", (req, res) => {
  console.log("Payment is finished");
  const { payment_status, invoice_id, price_amount, actually_paid } = req.body;
  axios.post(
    `https://bitcoin-mining-service-back-6p8l.onrender.com/api/update-payment-status/${invoice_id}`,
    {
      payment_status: payment_status,
      price_amount: price_amount,
      actually_paid: actually_paid,
    }
  );
  paymentsModel.getPaymentById(invoice_id, (err, result) => {
    const id = result.sender_id;
    userModel.getPaymentBalance(id, (err, balance) => {
      if (err) {
        console.error("Error fetching payment balance:", err);
        return res
          .status(500)
          .json({ message: "Error fetching payment balance" });
      }
      io.emit("balanceResponse", balance, actually_paid);
    });
  });
});

router.post("/create_payment", (req, res) => {
  const { amount, sender_id, price_currency } = req.body;
  const NOWPAYMENTS_API_KEY = "S21P2D0-YF6M4WH-KKS6TX5-34NWND7";
  // Prepare the payment data
  const paymentData = {
    price_amount: amount,
    price_currency: price_currency,
    order_id: "PB_10000", // You can generate a dynamic order ID if necessary
    order_description: "Buy Package",
    ipn_callback_url:
      "https://bitcoin-mining-service-back-6p8l.onrender.com/api/crypto_payment",
    success_url: `https://bitcoin-mining-service-back-6p8l.onrender.com/api/success_url`,
    cancel_url: `https://bitcoin-mining-service-back-6p8l.onrender.com/api/cancel_url`,
  };
  // Create a payment via the NowPayments API
  axios
    .post("https://api.nowpayments.io/v1/invoice", paymentData, {
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      const {
        token_id,
        order_id,
        order_description,
        price_amount,
        price_currency,
        pay_currency,
        ipn_callback_url,
        invoice_url,
        success_url,
        cancel_url,
        customer_email,
        partially_paid_url,
        created_at,
        updated_at,
        is_fixed_rate,
        is_fee_paid_by_user,
      } = response.data;
      const invoice_id = response.data.id;
      // Construct the complete payment data
      const completePaymentData = {
        invoice_id,
        token_id,
        order_id,
        order_description,
        price_amount,
        price_currency,
        pay_currency,
        ipn_callback_url,
        invoice_url,
        success_url,
        cancel_url,
        customer_email,
        partially_paid_url,
        created_at,
        updated_at,
        is_fixed_rate,
        is_fee_paid_by_user,
        sender_id,
        balance: 0,
      };

      // Insert the payment details into the database using the Payments model
      paymentsModel.createPayment(completePaymentData, (err, result) => {
        if (err) {
          console.error("Error saving payment:", err);
          return res.status(500).json({ error: err });
        }

        // Respond with the payment details
        res.json({
          invoice_id: invoice_id,
          token_id,
          order_id: order_id,
          order_description: order_description,
          price_amount: price_amount,
          price_currency: price_currency,
          pay_currency: pay_currency,
          ipn_callback_url: ipn_callback_url,
          invoice_url: invoice_url,
          success_url: success_url,
          cancel_url: cancel_url,
          customer_email: customer_email,
          partially_paid_url: partially_paid_url,
          created_at: created_at,
          updated_at: updated_at,
          is_fixed_rate: is_fixed_rate,
          is_fee_paid_by_user: is_fee_paid_by_user,
          sender_id: sender_id,
          balance: 0,
        });
      });
    })
    .catch((error) => {
      console.error("Error creating payment via NowPayments API:", error);
      res.status(500).json({ error: error });
    });
});

router.post("/update-payment-status/:invoice_id", (req, res) => {
  const { invoice_id } = req.params;
  const { payment_status, price_amount, actually_paid } = req.body;

  // Validate input
  if (!payment_status) {
    return res.status(400).json({ message: "payment is required." });
  }
  paymentsModel.getPaymentById(invoice_id, (err, result) => {
    const id = result.sender_id;
    if (!result) {
      return res.json({ message: "that invoice id isn't existing" });
    } else if (result.payment_status === "finished") {
      return res.json({ message: "it is already finished" });
    } else {
      if (actually_paid < price_amount) {
        userModel.updatePaymentBalance(id, actually_paid, (err, result) => {
          if (err) {
            console.error("Error updating payment balance:", err);
            return res
              .status(500)
              .json({ message: "Error updating payment balance" });
          }

          // Check if the update was successful
          if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Payment not found" });
          }

          console.log("Payment balance updated successfully");
        });
        return res.json({ message: "The quantity was not fully transferred." });
      } else {
        // Update the payment status in the database
        paymentsModel.updatePaymentStatus(
          invoice_id,
          payment_status,
          (err, result) => {
            if (err) {
              console.error("Error updating payment status:", err);
              return res
                .status(500)
                .json({ message: "Error updating payment status" });
            } else {
              userModel.updatePaymentBalance(
                id,
                actually_paid,
                (err, result) => {
                  if (err) {
                    console.error("Error updating payment balance:", err);
                    return res
                      .status(500)
                      .json({ message: "Error updating payment balance" });
                  }

                  // Check if the update was successful
                  if (result.affectedRows === 0) {
                    return res
                      .status(404)
                      .json({ message: "Payment not found" });
                  }

                  res
                    .status(200)
                    .json({ message: "Payment balance updated successfully" });
                }
              );
            }
          }
        );
      }
    }
  });
});

// Endpoint to get payment balance
router.post("/get-balance/:id", (req, res) => {
  const { id } = req.params;

  // Fetch the balance from the database
  userModel.getPaymentBalance(id, (err, balance) => {
    if (err) {
      console.error("Error fetching payment balance:", err);
      return res
        .status(500)
        .json({ message: "Error fetching payment balance" });
    }

    res.status(200).json({ balance: balance });
  });
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/passport_images"); // Path to save images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

router.post("/update-passport", upload.single("passportImage"), (req, res) => {
  const { userId, passportNumber } = req.body;
  const passportImagePath = req.file ? req.file.path : null;

  // Ensure the user is logged in (you might want to check session or token)
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Update passport number and image in the database
  userModel.updatePassport(
    userId,
    passportNumber,
    passportImagePath,
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error updating passport information", error: err });
      }
      const newverificated = "verified";
      userModel.updateUserPassportVerificated(
        userId,
        newverificated,
        (err, result) => {
          if (err) {
            return res.status(500).json({ message: err.message });
          }
          console.log("verificated updated successfully");
        }
      );
      return res
        .status(200)
        .json({ message: "Passport information updated successfully" });
    }
  );
});

router.post("/get-passport/:id", (req, res) => {
  const { id } = req.params;

  // Fetch the balance from the database
  userModel.getPassportVerificated(id, (err, passport_verificated) => {
    if (err) {
      console.error("Error fetching passport verificated:", err);
      return res
        .status(500)
        .json({ message: "Error fetching passport verificated" });
    }
    console.log(passport_verificated);
    res.status(200).json({ passport_verificated: passport_verificated });
  });
});

router.post("/update_payment_balance/:id", (req, res) => {
  const { id } = req.params;
  const balanceminus = req.body.unlockPrice;
  const newbalance = -Number(balanceminus);
  userModel.updatePaymentBalance(id, newbalance, (err, result) => {
    if (err) {
      console.error("Error updating payment balance:", err);
      return res
        .status(500)
        .json({ message: "Error updating payment balance" });
    }

    // Check if the update was successful
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    userModel.getPaymentBalance(id, (err, balance) => {
      if (err) {
        console.error("Error fetching payment balance:", err);
        return res
          .status(500)
          .json({ message: "Error fetching payment balance" });
      }
      io.emit("package_bought", balance, balanceminus);
      res.status(200).json({ balance });
    });
  });

  router.post("/update-package/:userId", (req, res) => {
    const { userId } = req.params;
    const { packagePrice, packageRole } = req.body;

    userModel.updatePackage(
      userId,
      packagePrice,
      packageRole,
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error updating package", error: err });
        }
        return res
          .status(200)
          .json({ message: "Package updated successfully", result });
      }
    );
  });
});
module.exports = router;
