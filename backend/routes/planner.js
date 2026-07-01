const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const aiProvider = require('../services/aiProvider');

const userId = 'default';

// Priority sort order for today view
const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

// GET /tasks — list tasks with optional filters
router.get('/tasks', async (req, res) => {
  try {
    const { projectId, status, priority, isHabit } = req.query;
    const filter = { userId };

    if (projectId) filter.projectId = projectId;
    if (status)    filter.status = status;
    if (priority)  filter.priority = priority;
    if (isHabit !== undefined) filter.isHabit = isHabit === 'true';

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('[Planner] GET /tasks', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /tasks — create a task
router.post('/tasks', async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error('[Planner] POST /tasks', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /tasks/:id — update a task
router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('[Planner] PUT /tasks/:id', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /tasks/:id — delete a task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('[Planner] DELETE /tasks/:id', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ─── Task Actions ─────────────────────────────────────────────────────────────

// POST /tasks/:id/complete — mark done + handle habit streak
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = 'done';
    task.completedAt = new Date();

    if (task.isHabit) {
      // Increment streak; reset if last done was more than ~36h ago (allows some buffer)
      const now = Date.now();
      const lastDone = task.habitLastDone ? task.habitLastDone.getTime() : 0;
      const hoursSinceLast = (now - lastDone) / (1000 * 60 * 60);
      task.habitStreak = hoursSinceLast < 36 ? (task.habitStreak || 0) + 1 : 1;
      task.habitLastDone = new Date();
    }

    await task.save();
    res.json(task);
  } catch (err) {
    console.error('[Planner] POST /tasks/:id/complete', err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// POST /tasks/:id/uncomplete — revert to todo
router.post('/tasks/:id/uncomplete', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { status: 'todo', completedAt: null } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('[Planner] POST /tasks/:id/uncomplete', err);
    res.status(500).json({ error: 'Failed to uncomplete task' });
  }
});

// ─── Special Views ────────────────────────────────────────────────────────────

// GET /habits — all habit tasks
router.get('/habits', async (req, res) => {
  try {
    const habits = await Task.find({ userId, isHabit: true }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (err) {
    console.error('[Planner] GET /habits', err);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// GET /today — tasks due today or overdue (not done), sorted by priority
router.get('/today', async (req, res) => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      userId,
      status: { $ne: 'done' },
      dueDate: { $lte: endOfToday }
    });

    // Sort by priority order then dueDate ascending
    tasks.sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      if (pDiff !== 0) return pDiff;
      return (a.dueDate || 0) - (b.dueDate || 0);
    });

    res.json(tasks);
  } catch (err) {
    console.error('[Planner] GET /today', err);
    res.status(500).json({ error: 'Failed to fetch today\'s tasks' });
  }
});

// ─── AI Prioritize ────────────────────────────────────────────────────────────

// POST /ai-prioritize — ask the AI to rank a set of tasks by priority
router.post('/ai-prioritize', async (req, res) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }

    const tasks = await Task.find({ _id: { $in: taskIds }, userId });
    if (tasks.length === 0) return res.status(404).json({ error: 'No matching tasks found' });

    // Build a readable task list for the prompt
    const taskList = tasks.map((t, i) =>
      `${i + 1}. ID: ${t._id} | Title: ${t.title} | Priority: ${t.priority} | Due: ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : 'none'}`
    ).join('\n');

    const systemPrompt = `You are a planning assistant. Respond ONLY with valid JSON — no markdown, no explanation.`;
    const userPrompt = `Given these tasks:\n${taskList}\n\nRecommend an ordered priority list. For each task provide a one-sentence reason. Return a JSON array: [{\"id\": \"<task _id>\", \"title\": \"<title>\", \"reason\": \"<one sentence>\", \"suggestedPriority\": \"urgent|high|medium|low\"}]`;

    const rawResponse = await aiProvider.generateSystemPrompt(systemPrompt, userPrompt);

    // Strip any accidental markdown fences before parsing
    const cleaned = rawResponse.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    let prioritized;
    try {
      prioritized = JSON.parse(cleaned);
    } catch {
      // Return raw if parse fails — let the client handle it
      return res.json({ raw: rawResponse });
    }

    res.json({ prioritized });
  } catch (err) {
    console.error('[Planner] POST /ai-prioritize', err);
    res.status(500).json({ error: 'AI prioritization failed' });
  }
});

module.exports = router;
