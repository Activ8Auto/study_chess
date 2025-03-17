require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }, // Required for NeonDB SSL
});

pool
  .connect()
  .then(() => console.log("✅ Connected to NeonDB"))
  .catch((err) => console.error("❌ Database connection error:", err));

module.exports = pool;
