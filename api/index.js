const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
app.use(express.json());

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Login Route with Improved Error Handling
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Use centralized query method
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.json({ token, userId: user.id });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      error: "Database error", 
      details: error.message 
    });
  }
});

// Other routes remain similar, using db.query instead of pool.query

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message 
  });
});

module.exports = app;