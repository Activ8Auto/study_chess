require("dotenv").config();
const { Client } = require("pg");

const createDbClient = () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000, // Increased to 8 seconds
  });

  // Log connection events for debugging
  client.on("connect", () => {
    console.log("✅ Connected to NeonDB");
  });

  client.on("error", (err) => {
    console.error("❌ Unexpected error on client:", err.stack);
  });

  return client;
};

module.exports = createDbClient;