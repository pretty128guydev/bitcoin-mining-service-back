const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");
const codeModel = require("../models/code");
const messageModel = require("../models/message");
const paymentsModel = require("../models/payments");
const transactionModel = require("../models/transactions")
const io = require("../utils/websocket");
const axios = require("axios");
const multer = require("multer");

const router = express.Router();

const correctpackageprices = [50, 130, 280, 340, 500, 1000, 2000, 3000, 5000, 10000]

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
    role, (err, result) => {
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

router.post("/update-pending", (req, res) => {
  const { userId, newstatus, withdrawamount } = req.body;

  // Validate that userId and newRole are provided
  if (!userId || !newstatus) {
    return res.status(400).json({
      message: "User ID and new status are required",
    });
  }

  userModel.updateWithdrawStatus(userId, newstatus, (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    console.log("withraw status updated successfully");
  });


  const amount = -Number(withdrawamount);
  userModel.updatePaymentBalance(userId, amount, (err, result) => {
    if (err) {
      console.error("Error updating payment balance->", err);
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

  const description = `Withdraw $${withdrawamount}`
  transactionModel.createTransaction(
    userId,
    description,
    amount,
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: err.message });
      }
      console.log("Payment is created");
    }
  );

  userModel.updateAllWithdraw(userId, Number(withdrawamount), (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    userModel.getAllUsers((err, users) => {
      if (err) {
        return res.status(500).json({ message: "An error occurred", error: err });
      }
      // Exclude passwords from user objects
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.status(200).json(usersWithoutPasswords);
    });
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
      console.error("Error fetching unread messages->", err);
    } else {
      const unread_messages = unreadMessages.length;
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

  messageModel.getUnreadMessagesForUser(userId, (err, messages) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(200).json(messages);
  });
});

// NOTE: 'this is callbackurl after user pay in nowpayments.io'

router.post("/crypto_payment", (req, res) => {
  console.log("Payment is finished");
  const { payment_status, invoice_id, price_amount, outcome_amount, actually_paid } = req.body;
  if (payment_status === "finished") {
    axios.post(
      `${process.env.REACT_APP_BACKEND_URL}/api/update-payment-status/${invoice_id}`,
      {
        payment_status: payment_status,
        price_amount: price_amount,
        outcome_amount: outcome_amount,
        actuall: actually_paid
      }
    );
    paymentsModel.getPaymentById(invoice_id, (err, result) => {
      const id = result.sender_id;
      userModel.getElectronBalance(id, (err, balance) => {
        if (err) {
          console.error("Error fetching payment balance->", err);
          return res
            .status(500)
            .json({ message: "Error fetching payment balance" });
        }
        userModel.getUserByUserId(id, (err, userInfo) => {
          if (err) {
            console.error("Error fetching payment balance->", err);
            return res
              .status(500)
              .json({ message: "Error fetching payment balance" });
          }
          const name = `${userInfo.firstname} ${userInfo.lastname}`
          const content = `${name} did deposit $${outcome_amount}.`
          const read_status = "unread";
          const recipientId = 1;
          const senderId = id; // Ensure you have the sender's ID from the request (e.g., from a JWT token)

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
              messageModel.getUnreadMessagesForUser(recipientId, (err, unreadMessages) => {
                if (err) {
                  console.error("Error fetching unread messages->", err);
                } else {
                  // Emit the unread messages back to the frontend
                  const unread_messages = unreadMessages.length;
                  const description = `Recharge $${outcome_amount}`
                  const amount = outcome_amount
                  transactionModel.createTransaction(
                    senderId,
                    description,
                    amount,
                    (err, result) => {
                      if (err) {
                        console.log(err);
                        return res.status(500).json({ message: err.message });
                      }
                      res.status(200).json({ message: "Payment is created" });
                    }
                  );
                  io.emit("unreadMessagesResponse", unread_messages, recipientId);
                  io.emit("balanceResponse", balance, outcome_amount, id);
                  io.emit("depositadmin", outcome_amount, recipientId, name);
                }
              });
            }
          );
        });
      });
    });
  }
});

router.post("/success_url", (req, res) => {
  console.log(req.body)
})

router.post("/cancel_url", (req, res) => {
  console.log(req.body)
})

router.post("/create_payment", (req, res) => {
  const { amount, sender_id, price_currency } = req.body;
  const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
  // Prepare the payment data
  const paymentData = {
    price_amount: amount,
    price_currency: price_currency,
    order_id: "PB_10000", // You can generate a dynamic order ID if necessary
    order_description: "Buy Package",
    ipn_callback_url:
      `${process.env.REACT_APP_BACKEND_URL}/api/crypto_payment`,
    success_url: `${process.env.REACT_APP_BACKEND_URL}/api/success_url`,
    cancel_url: `${process.env.REACT_APP_BACKEND_URL}/api/cancel_url`,
    is_fee_paid_by_user: true
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
          console.error("Error saving payment->", err);
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
      console.error("Error creating payment via NowPayments API->", error);
      res.status(500).json({ error: error });
    });
});

router.post("/update-payment-status/:invoice_id", (req, res) => {
  const { invoice_id } = req.params;
  const { payment_status, price_amount, outcome_amount, actuall } = req.body;

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
      if (actuall < price_amount) {
        userModel.updateElectronBalance(id, outcome_amount, (err, result) => {
          if (err) {
            console.error("Error updating ElectronBalance->", err);
            return res
              .status(500)
              .json({ message: "Error updating ElectronBalance" });
          }

          // Check if the update was successful
          if (result.affectedRows === 0) {
            return res.status(404).json({ message: "ElectronBalance not found" });
          }

          console.log("ElectronBalance updated successfully");
        });
        return res.json({ message: "The quantity was not fully transferred." });
      } else {
        // Update the payment status in the database
        paymentsModel.updatePaymentStatus(
          invoice_id,
          payment_status,
          (err, result) => {
            if (err) {
              console.error("Error updating payment status->", err);
              return res
                .status(500)
                .json({ message: "Error updating payment status" });
            } else {
              userModel.updateElectronBalance(
                id,
                outcome_amount,
                (err, result) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ message: "Error updating ElectronBalance" });
                  }

                  // Check if the update was successful
                  if (result.affectedRows === 0) {
                    return res
                      .status(404)
                      .json({ message: "ElectronBalance not found" });
                  }

                  res
                    .status(200)
                    .json({ message: "ElectronBalance updated successfully" });
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
      console.error("Error fetching payment balance->", err);
      return res
        .status(500)
        .json({ message: "Error fetching payment balance" });
    }
    userModel.getPackage_remain(id, (err, package_remain, package_status, package_role) => {
      if (err) {
        console.error("Error fetching payment remain & package_status & package_role->", err);
        return res
          .status(500)
          .json({ message: "Error fetching payment remain & package_status & package_role" });
      }
      res.status(200).json({ balance: balance, package_remain: package_remain, package_status: package_status, package_role: package_role });
    })
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
      console.error("Error fetching passport verificated->", err);
      return res
        .status(500)
        .json({ message: "Error fetching passport verificated" });
    }
    res.status(200).json({ passport_verificated: passport_verificated });
  });
});

router.post("/update_payment_balance/:id", (req, res) => {
  const { id } = req.params;
  const balanceminus = req.body.unlockPrice;
  var found = false;
  for (let index = 0; index < correctpackageprices.length; index++) {
    const element = correctpackageprices[index];
    if (element == correctpackageprices[index]) {
      found = true;
      break;
    }
  }
  if (!found) {
    return res
      .status(400)
      .json({ message: "BAD REQUEST" });
  }
  const newbalance = -Number(balanceminus);
  userModel.updateElectronBalance(id, newbalance, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error updating payment balance" });
    }

    // Check if the update was successful
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    userModel.getElectronBalance(id, (err, balance) => {
      if (err) {
        console.error("Error fetching electron balance->", err);
        return res
          .status(500)
          .json({ message: "Error fetching electron balance" });
      }
      const description = `Buy $${balanceminus} package`
      const amount = -Number(balanceminus);
      transactionModel.createTransaction(
        id,
        description,
        amount,
        (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).json({ message: err.message });
          }
          console.log("Transfer is finished successufully");
        }
      );
      io.emit("package_bought", balance, balanceminus, id);
      res.status(200).json({ balance });
    });
  });
});

router.post("/update-package/:userId", (req, res) => {
  const { userId } = req.params;
  const { packagePrice, packageRole } = req.body
  console.log(packagePrice, packageRole)
  userModel.getFirstFlag(userId, (err, flag) => {
    if (err) {
      console.error("Error fetching First Flag->", err);
      return res
        .status(500)
        .json({ message: "Error fetching First Flag" });
    }
    if (flag !== "bought") {
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
          userModel.updateFirstInvestment(
            userId,
            packagePrice,
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
        }
      );
    } else {
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
    }
  });


});

router.post("/button_clicks/:userId", (req, res) => {
  const { userId } = req.params;

  userModel.getButtonClickcs(
    userId,
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error get button clicks", error: err });
      }
      if (result < 500) {
        userModel.getPackageRole(userId, (err, packagerole) => {
          if (err) {
            console.error("Error fetching payment balance->", err);
            return res
              .status(500)
              .json({ message: "Error fetching payment balance" });
          }
          if (packagerole != null) {
            userModel.updatePaymentBalance(userId, Number(packagerole) / 500, (err, result) => {
              if (err) {
                console.error("Error updating payment balance->", err);
                return res
                  .status(500)
                  .json({ message: "Error updating payment balance" });
              }
              // Check if the update was successful
              if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Payment not found" });
              }
              console.log("Payment balance updated successfully");
              userModel.updateTotalIncome(userId, Number(packagerole) / 500, (err, result) => {
                if (err) {
                  console.error("Error updating total earning->", err);
                  return res
                    .status(500)
                    .json({ message: "Error updating total earning" });
                }
                // Check if the update was successful
                if (result.affectedRows === 0) {
                  return res.status(404).json({ message: "total earning not found" });
                }
                console.log("total earning is increased")
                userModel.updateDailyEarning(userId, Number(packagerole) / 500, (err, result) => {
                  if (err) {
                    console.error("Error updating daily earning->", err);
                    return res
                      .status(500)
                      .json({ message: "Error updating daily earning" });
                  }
                  // Check if the update was successful
                  if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "daily earning not found" });
                  }
                  userModel.getPaymentBalance(userId, (err, balance) => {
                    if (err) {
                      console.error("Error fetching payment balance->", err);
                      return res
                        .status(500)
                        .json({ message: "Error fetching payment balance" });
                    }
                    io.emit("updatebalance", balance, userId);
                    userModel.updateButtonClicks(
                      userId,
                      (err, result) => {
                        if (err) {
                          return res
                            .status(500)
                            .json({ message: "Error updating button clicks", error: err });
                        }
                        userModel.getButtonClickcs(
                          userId,
                          (err, result) => {
                            if (err) {
                              return res
                                .status(500)
                                .json({ message: "Error get button clicks", error: err });
                            }
                            return res
                              .status(200)
                              .json({ result });
                          }
                        );
                      }
                    );
                  });
                })
              })
            });
          } else {
            console.log("not packagerole found")
          }
        })
      } else {
        return res
          .status(500)
          .json({ message: "current button clicks is 500 now" });
      }
    });
});


router.post("/get_button_clicks/:userId", (req, res) => {
  const { userId } = req.params;

  userModel.getButtonClickcs(
    userId,
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error get button clicks", error: err });
      }
      return res
        .status(200)
        .json({ result });
    }
  );
});

router.post("/get_package_status/:userId", (req, res) => {
  const { userId } = req.params;

  userModel.getPackageStatus(userId, (err, packagestatus) => {
    if (err) {
      console.error("Error fetching payment balance->", err);
      return res
        .status(500)
        .json({ message: "Error fetching payment balance" });
    }
    res.status(200).json(packagestatus)
  });
});

router.post("/withdrawsend", (req, res) => {
  const { recipientId, content, read_status, usdAmount } = req.body;
  const senderId = req.body.userId; // Ensure you have the sender's ID from the request (e.g., from a JWT token)
  const newstatus = "pending"

  userModel.updateWithdrawStatus(senderId, newstatus, (err, result) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    console.log("withdrawstatus updated successfully");
    userModel.updateWithdrawAmount(senderId, amount, (err, result) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      console.log("withdraw amount updated successfully");
      userModel.getAllUsers((err, users) => {
        if (err) {
          return res.status(500).json({ message: "An error occurred", error: err });
        }
        // Exclude passwords from user objects
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        io.emit("makepending", usersWithoutPasswords, recipientId);
      });
    });
  });

  amount = Number(usdAmount)



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
      console.error("Error fetching unread messages->", err);
    } else {
      const unread_messages = unreadMessages.length;
      // Emit the unread messages back to the frontend
      io.emit("unreadMessagesResponse", unread_messages, recipientId);
    }
  });
});

router.post("/get_user_id/:userId", (req, res) => {
  const { userId } = req.params;

  userModel.getUserByUserId(userId, (err, userInfo) => {
    if (err) {
      console.error("Error fetching payment balance->", err);
      return res
        .status(500)
        .json({ message: "Error fetching payment balance" });
    }
    res.status(200).json(userInfo)
  });
});

router.post("/update_invites/:userId", (req, res) => {
  const { userId } = req.params;
  userModel.updateInvites(userId, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error updating invites" });
    }

    // Check if the update was successful
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "invite not found" });
    }
    userModel.getInvites(userId, (err, invites) => {
      if (err) {
        console.error("Error fetching unread messages->", err);
      } else {
        if (Number(invites) > 0 && Number(invites) % 50 === 0) {
          userModel.updateGoldCoin(userId, (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ message: "Error updating invites" });
            }

            // Check if the update was successful
            if (result.affectedRows === 0) {
              return res.status(404).json({ message: "invite not found" });
            }
            return res.status(200).json({ message: "1 gold coin is added" })
          })
        }
      }
    });
  })
})

router.post("/get-electron-balance/:userId", (req, res) => {
  const { userId } = req.params;

  // Fetch the balance from the database
  userModel.getElectronBalance(userId, (err, electron_balance) => {
    if (err) {
      console.error("Error fetching electron_balance->", err);
      return res
        .status(500)
        .json({ message: "Error fetching electron_balance" });
    }
    userModel.getPackage_remain(userId, (err, package_remain, package_status, package_role) => {
      if (err) {
        console.error("Error fetching payment remain & package_status & package_role->", err);
        return res
          .status(500)
          .json({ message: "Error fetching payment remain & package_status & package_role" });
      }
      res.status(200).json({ electron_balance: electron_balance, package_remain: package_remain, package_status: package_status, package_role: package_role });
    })
  });
});

router.post("/get_transaction/:userId", (req, res) => {
  const { userId } = req.params;

  transactionModel.getTransactionsForUser(userId, (err, transactions) => {
    if (err) {
      console.error("Error fetching payment balance->", err);
      return res
        .status(500)
        .json({ message: "Error fetching payment balance" });
    }
    res.status(200).json(transactions)
  });
});

router.post("/create_security_password/:userId", (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  console.log(newPassword)

  userModel.createSecurityPassword(userId, newPassword, (err, response) => {
    if (err) {
      console.error("Error creating security password->", err);
      return res.status(500).json({ message: err.message || "Error creating security password" });
    }
    res.status(200).json(response);
  });
});

// Change Security Password API
router.post("/change_security_password/:userId", (req, res) => {
  const { userId } = req.params;
  const { oldPassword, newPassword } = req.body;

  userModel.changeSecurityPassword(userId, oldPassword, newPassword, (err, response) => {
    if (err) {
      console.error("Error changing security password->", err);
      return res.status(500).json({ message: err.message || "Error changing security password" });
    }
    res.status(200).json(response);
  });
});

// Check Security Password API
router.post("/check_security_password/:userId", (req, res) => {
  const { userId } = req.params;
  const { securityPassword } = req.body;

  userModel.checkSecurityPassword(userId, securityPassword, (err, response) => {
    if (err) {
      console.error("Error checking security password->", err);
      return res.status(500).json({ message: err.message || "Error checking security password" });
    }
    res.status(200).json(response);
  });
});

router.post("/get_security_password/:userId", (req, res) => {
  const { userId } = req.params;

  userModel.getSecurityPassword(
    userId,
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error get security_password", error: err });
      }
      else if (result == null) {
        return res.status(500).json({ message: "no security password", error: err })
      }
      else {
        return res
          .status(200)
          .json({ result });
      }
    }
  );
});

router.post("/get_total_earning/:userId", (req, res) => {
  const { userId } = req.params;

  userModel.getPaymentBalance(id, (err, total_earning) => {
    if (err) {
      console.error("Error fetching payment balance->", err);
      return res
        .status(500)
        .json({ message: "Error fetching total_earning" });
    }
    return res.status(200).json(total_earning)
  })
});

router.post("/transfermoney/:userId", (req, res) => {
  const { userId } = req.params;
  const { securityPassword, transferamount } = req.body;
  console.log(securityPassword, transferamount)
  userModel.checkSecurityPassword(userId, securityPassword, (err, response) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    console.log(response)
    const amount = -Number(transferamount)
    userModel.updatePaymentBalance(userId, amount, (err, flex) => {
      if (err) {
        console.error("Error updating payment balance->", err);
        return res
          .status(500)
          .json({ message: "Error updating payment balance" });
      }

      // Check if the update was successful
      if (flex.affectedRows === 0) {
        return res.status(404).json({ message: "Payment not found" });
      }
      const elecamount = Number(transferamount)
      userModel.updateElectronBalance(userId, elecamount, (err, elec) => {
        if (err) {
          console.error("Error updating ElectronBalance->", err);
          return res
            .status(500)
            .json({ message: "Error updating ElectronBalance" });
        }

        // Check if the update was successful
        if (elec.affectedRows === 0) {
          return res.status(404).json({ message: "ElectronBalance not found" });
        }
        const description = `transfer $${transferamount} from electronic wallet to flexible wallet`
        const amount = Number(transferamount)
        transactionModel.createTransaction(
          userId,
          description,
          amount,
          (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).json({ message: err.message });
            }
            return res.status(200).json({ message: "Transfer is finished successufully" });
          }
        );
      });
      console.log("Payment balance updated successfully");
    });
    console.log("password is correct")
  });
});



module.exports = router;
