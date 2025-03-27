// api/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Import the pool from db.js
const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = decoded.userId;
    next();
  });
};

// User Registration
router.post('/register', async (req, res) => {
  console.log('Register request:', req.body);
  const { username, password, chesscomUsername } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed password:', hashedPassword);
    const result = await pool.query(
      'INSERT INTO users (username, password, chesscom_username) VALUES ($1, $2, $3) RETURNING id',
      [username, hashedPassword, chesscomUsername]
    );
    console.log('Insert result:', result.rows[0]);
    res.status(201).json({ message: 'User registered', userId: result.rows[0].id });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log("Starting login attempt:", new Date());
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    console.log("Query completed:", new Date());
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log("Login successful:", new Date());
    res.json({ token, chesscomUsername: user.chesscom_username });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Update Password
router.put('/update-password', verifyToken, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password required' });
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
      [hashedPassword, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Error updating password' });
  }
});

// Update Chess.com Username
router.put('/update-chesscom', verifyToken, async (req, res) => {
  const { chesscomUsername } = req.body;
  if (!chesscomUsername) return res.status(400).json({ error: 'Chess.com username required' });
  try {
    const result = await pool.query(
      'UPDATE users SET chesscom_username = $1 WHERE id = $2 RETURNING id, chesscom_username',
      [chesscomUsername, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Chess.com username updated', chesscomUsername: result.rows[0].chesscom_username });
  } catch (error) {
    console.error('Error updating Chess.com username:', error);
    res.status(500).json({ error: 'Error updating Chess.com username' });
  }
});

module.exports = router;