// api/server.js
const serverless = require("serverless-http");
const app = require("./index"); // Your Express app

// Export the handler explicitly
module.exports = serverless(app);