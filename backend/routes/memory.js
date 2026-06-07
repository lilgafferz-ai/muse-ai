const express = require('express');
const router = express.Router();
const memoryEngine = require('../memory/memoryEngine');

/**
 * GET /api/memory
 * Get all memories
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const memories = await memoryEngine.getAllMemories(userId);
    res.json(memories);
  } catch (error) {
    console.error('[Memory Route] Error:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

/**
 * GET /api/memory/search
 * Search memories
 */
router.get('/search', async (req, res) => {
  try {
    const { q, userId = 'default' } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const memories = await memoryEngine.getRelevantMemories(userId, q, 10);
    res.json({ memories });
  } catch (error) {
    console.error('[Memory Search] Error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

/**
 * GET /api/memory/stats
 * Get memory statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const stats = await memoryEngine.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('[Memory Stats] Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * DELETE /api/memory/:id
 * Delete a specific memory
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await memoryEngine.deleteMemory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Memory Delete] Error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

module.exports = router;
