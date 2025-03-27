const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware to verify token (reuse if you have it elsewhere)
const jwt = require("jsonwebtoken");
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// GET /notes - Fetch notes for logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM notes WHERE user_id = $1", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Get notes error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /notes - Create new note
router.post("/", authenticateToken, async (req, res) => {
  const { title, pgn } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO notes (user_id, title, pgn) VALUES ($1, $2, $3) RETURNING *",
      [req.user.id, title, pgn]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /notes/:id - Update a note
router.put("/:id", authenticateToken, async (req, res) => {
  const { title, pgn } = req.body;
  const noteId = req.params.id;
  try {
    const result = await db.query(
      "UPDATE notes SET title = $1, pgn = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
      [title, pgn, noteId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /notes/:id - Delete a note
router.delete("/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  try {
    const result = await db.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *",
      [noteId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Delete note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;
