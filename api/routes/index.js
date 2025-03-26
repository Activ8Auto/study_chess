require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const chessRoutes = require("./chessRoutes");
const authRoutes = require("./authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Verify JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Failed to authenticate token" });
    req.userId = decoded.userId;
    next();
  });
};



// Routes
app.use("/chess", chessRoutes); // Now /api/chess on Vercel
app.use("/auth", authRoutes);   // Now /api/auth on Vercel

// Notes Routes (protected)
app.get("/notes", verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM notes_2 ORDER BY last_modified DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error retrieving notes" });
  }
});

app.get("/notes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM notes_2 WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error retrieving note" });
  }
});

app.post("/notes", verifyToken, async (req, res) => {
  try {
    const { title, pgn } = req.body;
    const result = await pool.query(
      "INSERT INTO notes_2 (title, pgn, created_at, last_modified) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *",
      [title || "New Game Note", pgn || ""]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error adding note" });
  }
});

app.put("/notes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, pgn } = req.body;
    const result = await pool.query(
      "UPDATE notes_2 SET title = $1, pgn = $2, last_modified = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [title || "New Game Note", pgn || "", id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error updating note" });
  }
});

app.delete("/notes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM notes_2 WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Error deleting note" });
  }
});

// Export for Vercel
module.exports = app;

// Optional: Run locally for testing (remove for Vercel deployment)
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 5001;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}