const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Save analysis for a specific move
router.post('/', verifyToken, async (req, res) => {
  try {
    const { note_id, move_path, fen, analysis, chatgpt_analysis } = req.body;
    
    // Check if analysis already exists for this move path
    const existingAnalysis = await db.query(
      'SELECT id FROM move_analysis WHERE note_id = $1 AND move_path = $2',
      [note_id, move_path]
    );

    if (existingAnalysis.rows.length > 0) {
      // Update existing analysis
      const result = await db.query(
        'UPDATE move_analysis SET analysis = $1, fen = $2, chatgpt_analysis = $3 WHERE id = $4 RETURNING *',
        [analysis, fen, chatgpt_analysis, existingAnalysis.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      // Create new analysis
      const result = await db.query(
        'INSERT INTO move_analysis (note_id, move_path, fen, analysis, chatgpt_analysis) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [note_id, move_path, fen, analysis, chatgpt_analysis]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Save analysis error:', err.stack);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get analysis for a specific move path
router.get('/:note_id/:move_path', verifyToken, async (req, res) => {
  try {
    const { note_id, move_path } = req.params;
    
    const result = await db.query(
      'SELECT * FROM move_analysis WHERE note_id = $1 AND move_path = $2',
      [note_id, move_path]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get analysis error:', err.stack);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all analyses for a note
router.get('/:note_id', verifyToken, async (req, res) => {
  try {
    const { note_id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM move_analysis WHERE note_id = $1 ORDER BY created_at DESC',
      [note_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get analyses error:', err.stack);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router; 