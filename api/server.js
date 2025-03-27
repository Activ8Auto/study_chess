// const serverless = require("serverless-http");
// const app = require("./index");



// module.exports.handler = serverless(app);

// // // Local test
// // if (process.env.NODE_ENV !== "production") {
// //   const port = 5001;
// //   app.listen(port, () => console.log(`Running locally on port ${port}`));
// // }

// api/server.js
module.exports.handler = (req, res) => {
    console.log("Handler invoked");
    res.status(200).json({ message: "Test handler works" });
  };