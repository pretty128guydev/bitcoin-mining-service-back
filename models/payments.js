// Import the MySQL connection from your database config
const db = require("../config/db");

// Payments Model
const paymentsModel = {
  // Method to get all payments
  getAllPayments: (callback) => {
    const query = "SELECT * FROM payments";
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching payments->", err);
        return callback(err, null);
      }
      return callback(null, results);
    });
  },

  // Method to get a specific payment by ID
  getPaymentById: (invoice_id, callback) => {
    const query = "SELECT * FROM payments WHERE invoice_id = ?";
    db.query(query, [invoice_id], (err, result) => {
      if (err) {
        console.error("Error fetching payment by ID->", err);
        return callback(err, null);
      }
      return callback(null, result[0]);
    });
  },

  // Method to create a new payment
  createPayment: (paymentData, callback) => {
    const query = `INSERT INTO payments (
            invoice_id,
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
            balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;

    const values = [
      paymentData.invoice_id,
      paymentData.order_id,
      paymentData.order_description,
      paymentData.price_amount,
      paymentData.price_currency,
      paymentData.pay_currency,
      paymentData.ipn_callback_url,
      paymentData.invoice_url,
      paymentData.success_url,
      paymentData.cancel_url,
      paymentData.customer_email,
      paymentData.partially_paid_url,
      paymentData.created_at,
      paymentData.updated_at,
      paymentData.is_fixed_rate,
      paymentData.is_fee_paid_by_user,
      paymentData.sender_id,
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error creating new payment->", err);
        return callback(err, null);
      }
      return callback(null, { id: result.insertId, ...paymentData });
    });
  },

  updatePaymentStatus: (invoice_id, newStatus, callback) => {
    const query = "UPDATE payments SET payment_status = ? WHERE invoice_id = ?";
    db.query(query, [newStatus, invoice_id], (err, result) => {
      if (err) {
        console.error("Error updating payment status->", err);
        return callback(err, null);
      }
      return callback(null, { invoice_id, newStatus });
    });
  },

  
  
};



module.exports = paymentsModel;
