const express = require('express');
const router = express.Router();
const KnowledgeNode = require('../models/KnowledgeNode');

const userId = 'default';

// IMPORTANT: /graph must be declared before /:id to avoid route shadowing
// GET /graph — all nodes with relationships (for graph visualisation)
router.get('/graph', async (req, res) => {
  try {
    const nodes = await KnowledgeNode.find({ userId })
      .select('_id name type description tags relationships');
    res.json({ nodes });
  } catch (err) {
    console.error('[Knowledge] GET /graph', err);
    res.status(500).json({ error: 'Failed to fetch knowledge graph' });
  }
});

// GET / — list nodes with optional type filter
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { userId };
    if (type) filter.type = type;

    const nodes = await KnowledgeNode.find(filter).sort({ updatedAt: -1 });
    res.json(nodes);
  } catch (err) {
    console.error('[Knowledge] GET /', err);
    res.status(500).json({ error: 'Failed to fetch knowledge nodes' });
  }
});

// POST / — create a node
router.post('/', async (req, res) => {
  try {
    const node = new KnowledgeNode({ ...req.body, userId });
    await node.save();
    res.status(201).json(node);
  } catch (err) {
    console.error('[Knowledge] POST /', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id — update a node
router.put('/:id', async (req, res) => {
  try {
    const node = await KnowledgeNode.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json(node);
  } catch (err) {
    console.error('[Knowledge] PUT /:id', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:id — delete a node
router.delete('/:id', async (req, res) => {
  try {
    const node = await KnowledgeNode.findOneAndDelete({ _id: req.params.id, userId });
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('[Knowledge] DELETE /:id', err);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

// POST /:id/relate — add a relationship to a node
router.post('/:id/relate', async (req, res) => {
  try {
    const { targetId, targetName, type } = req.body;
    if (!targetId) return res.status(400).json({ error: 'targetId is required' });

    const node = await KnowledgeNode.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $push: { relationships: { targetId, targetName, type } } },
      { new: true }
    );
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json(node);
  } catch (err) {
    console.error('[Knowledge] POST /:id/relate', err);
    res.status(500).json({ error: 'Failed to add relationship' });
  }
});

module.exports = router;
