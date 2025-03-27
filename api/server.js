// const serverless = require("serverless-http");
// const app = require("./index");

module.exports.handler = (req, res) => {
    res.status(200).json({ message: "Test handler works" });
  };

// module.exports.handler = serverless(app);

// // Local test
// if (process.env.NODE_ENV !== "production") {
//   const port = 5001;
//   app.listen(port, () => console.log(`Running locally on port ${port}`));
// }