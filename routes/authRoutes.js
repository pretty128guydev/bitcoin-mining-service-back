const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const codeModel = require("../models/code");
const messageModel = require("../models/message");
const paymentsModel = require("../models/payments");
const axios = require("axios");

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
  console.log(firstName, lastName, password, email, phoneNumber, role);
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

router.post("/crypto_payment", (req, res) => {
  console.log("hello")
  const NOWPAYMENTS_API_KEY = "S21P2D0-YF6M4WH-KKS6TX5-34NWND7";
  console.log(req.body);
  const payment_id = req.body.payment_id;
  axios
    .post(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      return res.json(response);
    })
    .catch((err) => res.json(err));
});

router.post("/create_payment", (req, res) => {
  const { amount, pay_currency, sender_id, price_currency } = req.body;
  const NOWPAYMENTS_API_KEY = "S21P2D0-YF6M4WH-KKS6TX5-34NWND7";
  // Prepare the payment data
  const paymentData = {
    price_amount: amount,
    price_currency: price_currency,
    pay_currency: pay_currency,
    ipn_callback_url:
      "https://bitcoin-mining-service-back-6p8l.onrender.com/api/crypto_payment",
    order_id: "PB_10000", // You can generate a dynamic order ID if necessary
    order_description: "Buy Package",
  };
  console.log(paymentData);
  // Create a payment via the NowPayments API
  axios
    .post("https://api.nowpayments.io/v1/payment", paymentData, {
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      const {
        payment_id,
        payment_status,
        pay_address,
        price_amount,
        price_currency,
        pay_amount,
        amount_received,
        pay_currency,
        order_id,
        order_description,
        ipn_callback_url,
        created_at,
        updated_at,
        purchase_id,
        network,
        expiration_estimate_date,
        valid_until,
        type,
        product,
        origin_ip,
        payin_extra_id,
        smart_contract,
        network_precision,
        time_limit,
        burning_percent,
        recipient_id,
      } = response.data;
      console.log(response.data);
      // Construct the complete payment data
      const completePaymentData = {
        payment_id,
        order_id,
        price_amount,
        price_currency,
        pay_amount,
        pay_currency,
        order_description,
        pay_address,
        ipn_callback_url,
        payment_status,
        amount_received,
        created_at,
        updated_at,
        purchase_id,
        payin_extra_id,
        smart_contract,
        network,
        network_precision,
        time_limit,
        burning_percent,
        expiration_estimate_date,
        sender_id,
        recipient_id,
        valid_until,
        type,
        product,
        origin_ip,
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
          payment_id: payment_id,
          order_id: order_id,
          price_amount: price_amount,
          price_currency: price_currency,
          pay_amount: pay_amount,
          pay_currency: pay_currency,
          order_description: order_description,
          pay_address: pay_address,
          ipn_callback_url: ipn_callback_url,
          payment_status: payment_status,
          amount_received: amount_received,
          created_at: created_at,
          updated_at: updated_at,
          purchase_id: purchase_id,
          payin_extra_id: payin_extra_id,
          smart_contract: smart_contract,
          network: network,
          network_precision: network_precision,
          time_limit: time_limit,
          burning_percent: burning_percent,
          expiration_estimate_date: expiration_estimate_date,
          sender_id: sender_id,
          recipient_id: recipient_id,
          valid_until: valid_until,
          type: type,
          product: product,
          origin_ip: origin_ip,
          balance: 0,
        });
      });
    })
    .catch((error) => {
      console.error("Error creating payment via NowPayments API:", error);
      res.status(500).json({ error: error });
    });
});

// Endpoint to handle IPN callbacks
router.post("/ipn-callback", (req, res) => {
  const { payment_id, payment_status, amount_received } = req.body;

  // Update payment status in the database
  const sql = `UPDATE payments SET payment_status = ?, amount_received = ? WHERE payment_id = ?`;
  const values = [payment_status, amount_received, payment_id];

  db.query(sql, values, (err, result) => {
    if (err) throw err;
    res.sendStatus(200);
  });
});

module.exports = router;
