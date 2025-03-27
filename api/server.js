const serverless = require("serverless-http");
const app = require("./index"); // This is your Express "app" you exported

module.exports = serverless(app);
