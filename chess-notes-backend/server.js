require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const chessRoutes = require("./routes/chessRoutes"); // ✅ Import Chess.com Routes

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

// Ensure table exists
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

// Chess.com API Routes ✅
app.use("/api/chess", chessRoutes);

// Notes API Routes
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
