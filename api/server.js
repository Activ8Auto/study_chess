const serverless = require("serverless-http");
const app = require("./index");

// Export handler without provider specification
module.exports = serverless(app);