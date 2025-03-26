require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }, // Required for NeonDB SSL
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for initial connection
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

module.exports = pool;