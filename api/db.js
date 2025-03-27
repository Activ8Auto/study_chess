require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // optional, limit connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Handle pool errors to prevent crashes
pool.on("error", (err, client) => {
  console.error("❌ Unexpected error on idle client:", err.stack);
  // Pool will automatically try to replace the errored client
});

// Log successful connection when the pool acquires a client
pool.on("connect", () => {
  console.log("✅ Connected to NeonDB");
});
//test
module.exports = pool;