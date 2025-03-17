require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 5001;

// Middleware
const allowedOrigins = [
    "https://your-frontend.vercel.app", // Replace with your actual frontend URL
    "http://localhost:3000", // Allow local dev environment
  ];
  
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  
app.use(bodyParser.json());

const pool = require("./db"); // IMPORT FROM db.js


// Test database connection
pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Database connection error:", err));

// Routes

// Get all notes
app.get("/notes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notes ORDER BY last_modified DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving notes");
  }
});

// Get a single note by ID
app.get("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM notes WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Note not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving note");
  }
});

// Add a new note
app.post("/notes", async (req, res) => {
  try {
    const { title, body, fen, moveNotes, chessComGameId } = req.body;
    console.log("Received note:", {
      title,
      body,
      fen,
      moveNotes,
      chessComGameId,
    });
    const result = await pool.query(
      `INSERT INTO notes (title, body, fen, move_notes, chess_com_game_id, created_at, last_modified)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
      [
        title || "New Game Note",
        body || "",
        fen || "",
        moveNotes || {},
        chessComGameId || null,
      ],
    );
    console.log("Inserted note with ID:", result.rows[0].id);
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error("Server error inserting note:", error);
    res
      .status(500)
      .json({ error: "Error adding note", details: error.message });
  }
});

app.put("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, fen, moveNotes, chessComGameId } = req.body;
    console.log("PUT /notes/:id - Request body:", req.body);
    const result = await pool.query(
      `UPDATE notes
         SET title = $1, body = $2, fen = $3, move_notes = $4, chess_com_game_id = $5, last_modified = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
      [
        title || "New Game Note",
        body || "",
        fen || "",
        moveNotes !== undefined ? JSON.stringify(moveNotes) : "{}",
        chessComGameId || null,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating note - Full error:", err.stack);
    res
      .status(500)
      .json({ error: "Error updating note", details: err.message });
  }
});

app.delete("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM notes WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error("Error deleting note:", err);
    res
      .status(500)
      .json({ error: "Error deleting note", details: err.message });
  }
});

// Start the server
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
  
