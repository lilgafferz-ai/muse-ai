const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const aiProvider = require('../services/aiProvider');

const userId = 'default';

// GET / — list ideas with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, pinned } = req.query;
    const filter = { userId };

    if (status) filter.status = status;
    if (pinned !== undefined) filter.pinned = pinned === 'true';

    const ideas = await Idea.find(filter).sort({ pinned: -1, updatedAt: -1 });
    res.json(ideas);
  } catch (err) {
    console.error('[Ideas] GET /', err);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

// POST / — create an idea
router.post('/', async (req, res) => {
  try {
    const idea = new Idea({ ...req.body, userId });
    await idea.save();
    res.status(201).json(idea);
  } catch (err) {
    console.error('[Ideas] POST /', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id — update idea fields
router.put('/:id', async (req, res) => {
  try {
    const idea = await Idea.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    res.json(idea);
  } catch (err) {
    console.error('[Ideas] PUT /:id', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:id — delete idea
router.delete('/:id', async (req, res) => {
  try {
    const idea = await Idea.findOneAndDelete({ _id: req.params.id, userId });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('[Ideas] DELETE /:id', err);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

// POST /:id/pin — toggle pinned status
router.post('/:id/pin', async (req, res) => {
  try {
    const idea = await Idea.findOne({ _id: req.params.id, userId });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    idea.pinned = !idea.pinned;
    await idea.save();
    res.json(idea);
  } catch (err) {
    console.error('[Ideas] POST /:id/pin', err);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// POST /:id/score — AI scores the idea and saves results
router.post('/:id/score', async (req, res) => {
  try {
    const idea = await Idea.findOne({ _id: req.params.id, userId });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    const systemPrompt = `You are a startup and project evaluation expert. Respond ONLY with valid JSON — no markdown, no explanation outside the JSON object.`;
    const userPrompt = `Evaluate this idea and return ONLY a JSON object with these exact keys:
{
  "business": <integer 1-10, business/market value>,
  "technical": <integer 1-10, technical complexity — higher means more complex>,
  "difficulty": <integer 1-10, overall execution difficulty>,
  "overall": <integer 1-10, overall opportunity score>,
  "analysis": "<2-3 sentence analysis covering strengths, weaknesses, and key risk>"
}

Idea Title: ${idea.title}
${idea.body ? `Idea Description: ${idea.body}` : ''}
${idea.tags.length ? `Tags: ${idea.tags.join(', ')}` : ''}`;

    const rawResponse = await aiProvider.generateSystemPrompt(systemPrompt, userPrompt);

    // Strip markdown fences before parsing
    const cleaned = rawResponse.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    let scored;
    try {
      scored = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({ error: 'AI returned unparseable response', raw: rawResponse });
    }

    // Persist scores and analysis
    idea.scores = {
      business:   scored.business   ?? null,
      technical:  scored.technical  ?? null,
      difficulty: scored.difficulty ?? null,
      overall:    scored.overall    ?? null
    };
    idea.aiAnalysis = scored.analysis ?? '';
    await idea.save();

    res.json(idea);
  } catch (err) {
    console.error('[Ideas] POST /:id/score', err);
    res.status(500).json({ error: 'AI scoring failed' });
  }
});

module.exports = router;
