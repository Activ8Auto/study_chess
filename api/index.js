const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const chessRoutes = require("./routes/chessRoutes"); // ✅ ADD THIS

const app = express();

const allowedOrigins = ["https://chess-notes.com", "http://localhost:3000"];

// CORS configuration
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

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ✅ MOUNT YOUR ROUTES
app.use("/auth", authRoutes);     // Handles /auth/register, /auth/login, etc.
app.use("/chess", chessRoutes);   // Handles /chess/games/:username/:year/:month

// Optional: fallback test route
app.get("/", (req, res) => {
  res.send("Chess Notes API is running.");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Unexpected server error",
    message: err.message,
  });
});

module.exports = app;
