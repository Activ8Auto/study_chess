// api/server.js (rename to server.js if needed)
const app = require("./index");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
