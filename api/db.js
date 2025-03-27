const { Pool } = require("pg");

// Create a connection pool with serverless-friendly settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Only for Neon DB
  },
  max: 5, // Reduce pool size for serverless
  connectionTimeoutMillis: 15000, // Increased timeout
  idleTimeoutMillis: 10000, // Shorter idle timeout
  query_timeout: 8000, // 8 seconds query timeout
});

// Enhanced error handling
pool.on("error", (err) => {
  console.error("Unexpected database pool error", err);
});

// Graceful shutdown function
async function shutdown() {
  try {
    await pool.end();
    console.log("Database pool closed");
  } catch (err) {
    console.error("Error closing database pool", err);
  }
}

// Handle process termination
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = pool;