// api/index.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("./db"); // Import the pool

const app = express();
app.use(express.json());

// Disable automatic timeout
app.set('timeout', 0);

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


// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Register error:", err.stack);
    res.status(500).json({ error: "Username already exists or database error" });
  }
});
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 AS test");
    console.log("Test query result:", result.rows);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Test query error:", err.stack);
    res.status(500).json({ error: "Test query failed" });
  }
});


app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    console.log("username query result:", result.rows);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// Notes Routes
app.get("/api/notes", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notes WHERE user_id = $1", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Get notes error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/notes", authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// Chess Routes (example)
app.get("/api/chess/games", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM chess_games WHERE user_id = $1", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Get chess games error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = app;