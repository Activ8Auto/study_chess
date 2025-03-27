// api/db.js
const { Pool } = require("pg");

// Global variable to prevent multiple pool creations
global.postgresPoolInstance = global.postgresPoolInstance || null;

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon DB
    },
    // Crucial serverless optimizations
    max: 1, // Limit to one connection
    connectionTimeoutMillis: 30000, // 30 second connection timeout
    idleTimeoutMillis: 10000, // Close idle connections quickly
    statement_timeout: 10000, // 10 second statement timeout
  });
}

// Ensure only one pool is created
function getPool() {
  if (!global.postgresPoolInstance) {
    global.postgresPoolInstance = createPool();
  }
  return global.postgresPoolInstance;
}

// Centralized query method with robust error handling
async function query(text, params) {
  const pool = getPool();
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database Query Error:', error);
    throw error;
  }
}

// Graceful shutdown (important for serverless)
async function shutdown() {
  if (global.postgresPoolInstance) {
    try {
      await global.postgresPoolInstance.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool', error);
    }
  }
}

// Handle potential process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = {
  query,
  pool: getPool(),
  shutdown
};