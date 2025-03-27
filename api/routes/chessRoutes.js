const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * Fetch Chess.com Player Games for a Given Month
 */
router.get("/games/:username/:year/:month", async (req, res) => {
  let { username, year, month } = req.params;
  console.log(`Fetching games for ${username}/${year}/${month}`);
  
  // Ensure month is always two digits (e.g., "03" instead of "3")
  month = month.padStart(2, "0");

  try {
    const apiUrl = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;
    console.log("Fetching games from:", apiUrl); // ✅ Debugging line

    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching Chess.com games:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to fetch games from Chess.com" });
  }
});

module.exports = router;