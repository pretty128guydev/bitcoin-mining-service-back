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
            balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;

        const values = [
            paymentData.payment_id,
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
            paymentData.origin_ip
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
