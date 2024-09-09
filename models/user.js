const db = require('../config/db');
const bcrypt = require('bcryptjs');

const createUser = (username, email, password, callback) => {
  const hashedPassword = bcrypt.hashSync(password, 10);
  const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
  db.query(query, [username, email, hashedPassword], callback);
};

const getUserByEmail = (email, callback) => {
  const query = `SELECT * FROM users WHERE email = ?`;
  db.query(query, [email], callback);
};

module.exports = {
  createUser,
  getUserByEmail,
};
