// Import the MySQL connection from your database config
const db = require('../config/db');

// Payments Model
const paymentsModel = {
    // Method to get all payments
    getAllPayments: (callback) => {
        const query = 'SELECT * FROM payments';
        db.query(query, (err, results) => {
            if (err) {
                console.error("Error fetching payments:", err);
                return callback(err, null);
            }
            return callback(null, results);
        });
    },

    // Method to get a specific payment by ID
    getPaymentById: (paymentId, callback) => {
        const query = 'SELECT * FROM payments WHERE payment_id = ?';
        db.query(query, [paymentId], (err, result) => {
            if (err) {
                console.error("Error fetching payment by ID:", err);
                return callback(err, null);
            }
            return callback(null, result[0]);
        });
    },

    // Method to create a new payment
    createPayment: (paymentData, callback) => {
        const query = `INSERT INTO payments (
            invoice_id,
            order_description,
            order_id,
            outcome_amount,
            outcome_currency,
            parent_payment_id,
            pay_address,
            pay_amount,
            pay_currency,
            payin_extra_id,
            payment_status,
            price_amount,
            price_currency,
            updated_at,
            sender_id,
            actually_paid,
            actually_paid_at_fiat,
            fee_currency,
            fee_depositFee,
            fee_serviceFee,
            fee_withdrawalFee,
            balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;

        const values = [
            paymentData.invoice_id,
            paymentData.order_description,
            paymentData.order_id,
            paymentData.outcome_amount,
            paymentData.outcome_currency,
            paymentData.parent_payment_id,
            paymentData.pay_address,
            paymentData.pay_amount,
            paymentData.pay_currency,
            paymentData.payin_extra_id,
            paymentData.payment_status,
            paymentData.price_amount,
            paymentData.price_currency,
            paymentData.updated_at,
            paymentData.sender_id,
            paymentData.actually_paid,
            paymentData.actually_paid_at_fiat,
            paymentData.fee_currency,
            paymentData.fee_depositFee,
            paymentData.fee_serviceFee,
            paymentData.fee_withdrawalFee,
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error("Error creating new payment:", err);
                return callback(err, null);
            }
            return callback(null, { id: result.insertId, ...paymentData });
        });
    },

    // Method to update a payment by ID
    updatePayment: (paymentId, paymentData, callback) => {
        const query = `UPDATE payments SET 
            order_id = ?, 
            price_amount = ?, 
            price_currency = ?, 
            pay_amount = ?, 
            pay_currency = ?, 
            order_description = ?, 
            pay_address = ?, 
            ipn_callback_url = ?, 
            payment_status = ?, 
            amount_received = ?, 
            created_at = ?, 
            updated_at = ?, 
            purchase_id = ?, 
            payin_extra_id = ?, 
            smart_contract = ?, 
            network = ?, 
            network_precision = ?, 
            time_limit = ?, 
            burning_percent = ?, 
            expiration_estimate_date = ?, 
            sender_id = ?, 
            recipient_id = ?, 
            valid_until = ?, 
            type = ?, 
            product = ?, 
            origin_ip = ?
            WHERE payment_id = ?`;

        const values = [
            paymentData.order_id,
            paymentData.price_amount,
            paymentData.price_currency,
            paymentData.pay_amount,
            paymentData.pay_currency,
            paymentData.order_description,
            paymentData.pay_address,
            paymentData.ipn_callback_url,
            paymentData.payment_status,
            paymentData.amount_received,
            paymentData.created_at,
            paymentData.updated_at,
            paymentData.purchase_id,
            paymentData.payin_extra_id,
            paymentData.smart_contract,
            paymentData.network,
            paymentData.network_precision,
            paymentData.time_limit,
            paymentData.burning_percent,
            paymentData.expiration_estimate_date,
            paymentData.sender_id,
            paymentData.recipient_id,
            paymentData.valid_until,
            paymentData.type,
            paymentData.product,
            paymentData.origin_ip,
            paymentId
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error("Error updating payment:", err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    },

    // Method to delete a payment by ID
    deletePayment: (paymentId, callback) => {
        const query = 'DELETE FROM payments WHERE payment_id = ?';
        db.query(query, [paymentId], (err, result) => {
            if (err) {
                console.error("Error deleting payment:", err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    }
};

module.exports = paymentsModel;
