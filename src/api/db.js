const { Pool } = require("pg");

// Singleton pattern to ensure only one pool
if (!global.postgresPoolInstance) {
  global.postgresPoolInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 1,           // Strict limit to 1 connection
    idleTimeoutMillis: 5000,   // Close idle connection quickly
    connectionTimeoutMillis: 10000  // 10 second connection timeout
  });

  // Log and handle any unexpected errors
  global.postgresPoolInstance.on('error', (err) => {
    console.error('Unexpected database pool error', err);
  });
}

// Centralized query method with error tracking
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await global.postgresPoolInstance.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query Error', {
      query: text,
      params,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  query,
  originalPool: global.postgresPoolInstance
};