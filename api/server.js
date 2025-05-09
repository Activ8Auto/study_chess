// Load environment variables first
require('dotenv').config();

// api/server.js (rename to server.js if needed)
const app = require("./index");

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0',  () => {
  console.log(`Server running on port ${PORT}`);
});
