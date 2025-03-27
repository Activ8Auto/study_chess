const { Pool } = require("pg");

// Prevent multiple pool creations
if (!global.pool) {
  global.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 1, // Single connection
    connectionTimeoutMillis: 20000, // 20 second timeout
    idleTimeoutMillis: 10000 // Close idle quickly
  });

  // Optional: Basic error handling
  global.pool.on('error', (err) => {
    console.error('Unexpected database error', err);
  });
}

// Query method with error tracking
async function query(text, params) {
  try {
    return await global.pool.query(text, params);
  } catch (error) {
    console.error('Database Query Error:', {
      message: error.message,
      stack: error.stack,
      query: text,
      params
    });
    throw error;
  }
}

module.exports = {
  query,
  pool: global.pool
};