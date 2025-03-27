// api/db.js
require("dotenv").config();
const { Pool } = require("pg");

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // Increased timeout for serverless cold starts
  ssl: {
    rejectUnauthorized: false // Required for Neon DB
  },
  max: 10, // Max number of clients in the pool (adjust based on usage)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
});

// Log pool creation for debugging
console.log("Database pool created with DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle pool client:", err.stack);
});

// Export the pool for use in other modules
module.exports = pool;