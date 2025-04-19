const express = require("express");
const axios = require("axios");
const { OpenAI } = require("openai");

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    console.log("Fetching games from:", apiUrl);

    const response = await axios.get(apiUrl);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching Chess.com games:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to fetch games from Chess.com" });
  }
});

// ChatGPT analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const {
      fen,
      bestMove,
      pv,
      evaluation,
      sideToMove,
      whiteElo,
      blackElo,
      analyzingPlayer
    } = req.body;

    // Determine if the analyzing player is playing as white or black
    const playerColor = sideToMove === 'white' ? 'white' : 'black';

    const prompt = `You are a chess grandmaster coach writing for advanced club players—specifically **${analyzingPlayer}**, who is playing as **${playerColor}**—and your goal is to teach both strategic plans and tactical ideas they can immediately apply.

**Context:**  
• Desired length: 400–600 words  
• Format: plain text, no Markdown aside from the bolded section titles  

**Inputs:**  
FEN: **${fen}**  
Best move: **${bestMove}**  
Principal variation: **${pv}**  
Evaluation: **${evaluation}**  
Side to move: **${sideToMove}**  
White Elo: **${whiteElo}**  
Black Elo: **${blackElo}**  

Please structure your analysis under the following **bold** headings:

**1. Elements of the Position**  
‑ Break down White’s and Black’s imbalances à la IM Jeremy Silman’s framework (material, pawn structure, minor‑piece imbalances, space, initiative, development/time, king safety, control of files/ranks/diagonals, weak squares/outposts, fixed weaknesses).

**2. Current Weaknesses**  
‑ Identify pawn, piece, or square weaknesses for both White and Black.

**3. Strategic Goals for ${playerColor}**  
‑ Short‑term goals (next few moves)  
‑ Long‑term plans (mid‑ to endgame themes)

**4. Why **${bestMove}** Works**  
‑ Explain the concrete improvements, dynamic shifts, and how it addresses the imbalances you’ve outlined.

**5. Personalized Advice for ${analyzingPlayer}**  
‑ Tailor tips to their Elo range and the fact they’re playing as **${playerColor}**. Focus on practical takeaways they can use in their next few games.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a chess expert analyzing a position from ${analyzingPlayer}'s perspective as they play as ${playerColor}. Provide clear, actionable advice specific to their color.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in analysis endpoint:', error);
    res.status(500).json({ error: 'Failed to analyze position' });
  }
});

module.exports = router;