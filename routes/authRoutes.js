const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

const router = express.Router();

// Register endpoint
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  userModel.createUser(username, email, password, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Registration failed' });
    }
    res.status(200).json({ message: 'User registered successfully' });
  });
});

// Login endpoint
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  userModel.getUserByEmail(email, (err, result) => {
    if (err || result.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }
    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '1h' });
    res.status(200).json({ token });
  });
});

module.exports = router;
