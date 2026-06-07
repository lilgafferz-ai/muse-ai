const express = require('express');
const router = express.Router();
const Personality = require('../models/Personality');

/**
 * GET /api/personality
 * Get current personality settings
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    let personality = await Personality.findOne({ userId });

    if (!personality) {
      // Create default personality
      personality = new Personality({ userId });
      await personality.save();
    }

    res.json(personality);
  } catch (error) {
    console.error('[Personality Route] Error:', error);
    res.status(500).json({ error: 'Failed to fetch personality' });
  }
});

/**
 * PUT /api/personality
 * Update personality traits
 */
router.put('/', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const updates = {};

    if (req.body.traits) updates.traits = req.body.traits;
    if (req.body.communicationStyle) updates.communicationStyle = req.body.communicationStyle;
    if (req.body.customInstructions !== undefined) updates.customInstructions = req.body.customInstructions;

    const personality = await Personality.findOneAndUpdate(
      { userId },
      { $set: updates },
      { upsert: true, new: true }
    );

    res.json(personality);
  } catch (error) {
    console.error('[Personality Update] Error:', error);
    res.status(500).json({ error: 'Failed to update personality' });
  }
});

/**
 * POST /api/personality/nickname
 * Add or increment a nickname
 */
router.post('/nickname', async (req, res) => {
  try {
    const { nickname, userId = 'default' } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: 'Nickname is required' });
    }

    const personality = await Personality.findOneAndUpdate(
      { userId, 'nicknames.name': nickname.toLowerCase() },
      { $inc: { 'nicknames.$.used': 1 } },
      { new: true }
    );

    if (!personality) {
      const updated = await Personality.findOneAndUpdate(
        { userId },
        { $push: { nicknames: { name: nickname.toLowerCase(), used: 1 } } },
        { upsert: true, new: true }
      );
      return res.json(updated);
    }

    res.json(personality);
  } catch (error) {
    console.error('[Personality Nickname] Error:', error);
    res.status(500).json({ error: 'Failed to save nickname' });
  }
});

/**
 * DELETE /api/personality/reset
 * Reset personality to defaults
 */
router.delete('/reset', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    await Personality.findOneAndDelete({ userId });
    res.json({ success: true, message: 'Personality reset to defaults' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset personality' });
  }
});

module.exports = router;
