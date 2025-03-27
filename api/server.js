const serverless = require("serverless-http");
const app = require("./index");

// Export handler with custom error handling
module.exports = serverless(app, {
  // Optional: custom error handler for serverless
  binary: ['*/*'],
  provider: 'vercel'
});