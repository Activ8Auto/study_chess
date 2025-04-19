const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");
const notesRoutes = require("./routes/notesRoutes");
const authRoutes = require("./routes/authRoutes");
const chessRoutes = require("./routes/chessRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const auth = require("./middleware/auth");  // Add auth middleware import

const app = express();

const allowedOrigins = [
  "https://chess-notes.com",
  "http://localhost:3000",
  "http://localhost:5001",
  "http://192.168.68.55:3000"  // Added IP address
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin); // Add logging
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ✅ MOUNT YOUR ROUTES
app.use("/auth", authRoutes);     // Handles /auth/register, /auth/login, etc.
app.use("/chess", auth, chessRoutes);   // Handles /chess/games/:username/:year/:month
app.use("/notes", auth, notesRoutes);
app.use("/analysis", auth, analysisRoutes);

// Optional: fallback test route
app.get("/", (req, res) => {
  res.send("Chess Notes API is running.");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    headers: req.headers
  });
  
  res.status(500).json({
    error: "Unexpected server error",
    message: err.message,
    path: req.path,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
