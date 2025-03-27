const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();

const allowedOrigins = ["https://chess-notes.com", "http://localhost:3000"];

// CORS configuration object
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// ✅ Apply CORS to ALL routes & preflights
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // <- This is critical

app.use(express.json());
// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Login Route with Comprehensive Error Handling
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.json({ 
      token, 
      userId: user.id,
      message: "Login successful" 
    });

  } catch (error) {
    console.error('Login Error Details:', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({ 
      error: "Internal server error", 
      details: "Unable to process login" 
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    error: "Unexpected server error", 
    message: err.message 
  });
});

module.exports = app;