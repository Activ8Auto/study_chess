const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");

// ✅ Token middleware - accepts raw token (no "Bearer" expected)
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.userId = decoded.userId; // Use userId like in authRoutes
    next();
  });
};

// GET /notes - Fetch notes for logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM notes WHERE user_id = $1", [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Get notes error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /notes - Create new note
router.post("/", verifyToken, async (req, res) => {
  const { title, pgn, chatgpt_analysis } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO notes (user_id, title, pgn, chatgpt_analysis) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.userId, title, pgn, chatgpt_analysis || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /notes/:id - Update a note
router.put("/:id", verifyToken, async (req, res) => {
  const { title, pgn, chatgpt_analysis } = req.body;
  const noteId = req.params.id;
  try {
    const result = await db.query(
      "UPDATE notes SET title = $1, pgn = $2, chatgpt_analysis = $3 WHERE id = $4 AND user_id = $5 RETURNING *",
      [title, pgn, chatgpt_analysis || {}, noteId, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /notes/:id - Delete a note
router.delete("/:id", verifyToken, async (req, res) => {
  const noteId = req.params.id;
  try {
    const result = await db.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *",
      [noteId, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Delete note error:", err.stack);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /notes/:id/analysis - Save analysis results for a note
router.post("/:id/analysis", verifyToken, async (req, res) => {
  const { move_errors, mistake_sequences } = req.body;
  const noteId = req.params.id;
  
  // Ensure the data is properly formatted as JSONB
  const moveErrorsJson = Array.isArray(move_errors) ? move_errors : [];
  const mistakeSequencesJson = Array.isArray(mistake_sequences) ? mistake_sequences : [];
  
  try {
    console.log("Saving analysis for note:", noteId, {
      moveErrors: moveErrorsJson,
      mistakeSequences: mistakeSequencesJson
    });
    
    const result = await db.query(
      "UPDATE notes SET move_errors = $1::jsonb, mistake_sequences = $2::jsonb WHERE id = $3 AND user_id = $4 RETURNING *",
      [JSON.stringify(moveErrorsJson), JSON.stringify(mistakeSequencesJson), noteId, req.userId]
    );
    
    if (result.rows.length === 0) {
      console.log("Note not found:", noteId);
      return res.status(404).json({ error: "Note not found" });
    }
    
    console.log("Analysis saved successfully:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Save analysis error:", err.stack);
    console.error("Error details:", {
      noteId,
      moveErrors: moveErrorsJson,
      mistakeSequences: mistakeSequencesJson,
      error: err.message
    });
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

module.exports = router;
