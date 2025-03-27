// db.js
require("dotenv").config();
const { Client } = require("pg");

const createDbClient = () => {
  console.log("DATABASE_URL:", process.env.DATABASE_URL || "Not set");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  client.on("error", (err) => console.error("DB Client error:", err.stack));
  client.connect()
    .then(() => console.log("DB connected successfully"))
    .catch(err => console.error("DB connection failed:", err.stack));
  return client;
};
module.exports = createDbClient;