require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection (assumes db.js is unchanged and connects to your PostgreSQL instance)
const pool = require("./db");

// Test database connection
pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Database connection error:", err));

// Create the notes_2 table (run this once manually or automate via startup)
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS notes_2 (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    pgn TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(createTableQuery)
  .then(() => console.log("notes_2 table created or already exists"))
  .catch((err) => console.error("Error creating notes_2 table:", err));

// Routes

// Get all notes from notes_2
app.get("/notes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notes_2 ORDER BY last_modified DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving notes from notes_2");
  }
});

// Get a single note by ID from notes_2
app.get("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM notes_2 WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Note not found in notes_2");
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving note from notes_2");
  }
});

// Add a new note to notes_2
app.post("/notes", async (req, res) => {
  try {
    const { title, pgn } = req.body;
    console.log("Received note for notes_2:", { title, pgn });
    const result = await pool.query(
      `INSERT INTO notes_2 (title, pgn, created_at, last_modified)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [title || "New Game Note", pgn || ""]
    );
    console.log("Inserted note into notes_2 with ID:", result.rows[0].id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Server error inserting note into notes_2:", error);
    res.status(500).json({ error: "Error adding note to notes_2", details: error.message });
  }
});

// Update an existing note in notes_2
app.put("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, pgn } = req.body;
    console.log("PUT /notes/:id - Request body for notes_2:", req.body);
    const result = await pool.query(
      `UPDATE notes_2
       SET title = $1, pgn = $2, last_modified = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [title || "New Game Note", pgn || "", id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found in notes_2" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating note in notes_2 - Full error:", err.stack);
    res.status(500).json({ error: "Error updating note in notes_2", details: err.message });
  }
});

// Delete a note from notes_2
app.delete("/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM notes_2 WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Note not found in notes_2" });
    }
    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error("Error deleting note from notes_2:", err);
    res.status(500).json({ error: "Error deleting note from notes_2", details: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});