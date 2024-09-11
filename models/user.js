const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Modified createUser to accept the role
const createUser = (username, email, password, role, callback) => {
  const hashedPassword = bcrypt.hashSync(password, 10);
  const query = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
  db.query(query, [username, email, hashedPassword, role], callback);
};

// No changes to getUserByEmail
const getUserByEmail = (email, callback) => {
  const query = `SELECT * FROM users WHERE email = ?`;
  db.query(query, [email], callback);
};

module.exports = {
  createUser,
  getUserByEmail,
};
