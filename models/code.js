// models/code.js

// Import the MySQL connection from your database config
const db = require('../config/db');

// Code Model
const Code = {
    // Method to get all codes
    getAllCodes: (callback) => {
        const query = 'SELECT * FROM invitation_codes';
        db.query(query, (err, results) => {
            if (err) {
                console.error("Error fetching codes->", err);
                return callback(err, null);
            }
            return callback(null, results);
        });
    },

    // Method to get a specific code by CODE
    getCodeByCode: (code, callback) => {
        const query = 'SELECT * FROM invitation_codes WHERE code = ?';
        db.query(query, [code], (err, result) => {
            if (err) {
                console.error("Error fetching code by CODE->", err);
                return callback(err, null);
            }
            return callback(null, result[0]);
        });
    },

    // Method to create a new code
    createCode: (code, status, callback) => {
        const query = 'INSERT INTO invitation_codes (code, status) VALUES (?, ?)';
        db.query(query, [code, status], (err, result) => {
            if (err) {
                console.error("Error creating new code->", err);
                return callback(err, null);
            }
            return callback(null, { id: result.insertId, code, status });
        });
    },

    // Method to update a code by ID
    updateCode: (id, code, status, callback) => {
        const query = 'UPDATE invitation_codes SET code = ?, status = ? WHERE id = ?';
        db.query(query, [code, status, id], (err, result) => {
            if (err) {
                console.error("Error updating code->", err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    },

    // Method to delete a code by ID
    deleteCode: (id, callback) => {
        const query = 'DELETE FROM invitation_codes WHERE id = ?';
        db.query(query, [id], (err, result) => {
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    }
};

module.exports = Code;
