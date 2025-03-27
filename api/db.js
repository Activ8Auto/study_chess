// db.js
require("dotenv").config();
const { Client } = require("pg");

const createDbClient = () => {
  console.log("Creating DB client with DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000, // 5 seconds max for connection
    ssl: { rejectUnauthorized: false } // Explicit SSL for Neon
  });
  client.on("error", (err) => console.error("DB Client error:", err));
  return client;
};

module.exports = createDbClient;