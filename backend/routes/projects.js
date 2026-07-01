const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');

// Hardcoded for now — will be replaced with auth middleware
const userId = 'default';

// GET / — list all projects, pinned first then most-recently updated
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ userId })
      .sort({ pinned: -1, updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('[Projects] GET /', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST / — create a new project
router.post('/', async (req, res) => {
  try {
    const project = new Project({ ...req.body, userId });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error('[Projects] POST /', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /:id — get single project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('[Projects] GET /:id', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /:id — update project fields
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('[Projects] PUT /:id', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:id — delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('[Projects] DELETE /:id', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /:id/goals — append a goal {text} to the goals array
router.post('/:id/goals', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Goal text is required' });

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $push: { goals: { text, done: false } } },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('[Projects] POST /:id/goals', err);
    res.status(500).json({ error: 'Failed to add goal' });
  }
});

// PUT /:id/goals/:goalId — toggle a goal's done status
router.put('/:id/goals/:goalId', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const goal = project.goals.id(req.params.goalId);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.done = !goal.done;
    await project.save();
    res.json(project);
  } catch (err) {
    console.error('[Projects] PUT /:id/goals/:goalId', err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// GET /:id/context — build a context string for the AI contextBuilder
router.get('/:id/context', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Pull the 5 most-recent tasks linked to this project
    const recentTasks = await Task.find({ projectId: project._id })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title status priority dueDate');

    // Build a plain-text context block the AI can consume
    const goalLines = project.goals.map(
      g => `  [${g.done ? 'x' : ' '}] ${g.text}`
    ).join('\n');

    const taskLines = recentTasks.map(
      t => `  - ${t.title} (${t.status}, ${t.priority}${t.dueDate ? ', due ' + t.dueDate.toISOString().slice(0, 10) : ''})`
    ).join('\n');

    const context = [
      `Project: ${project.title}`,
      project.description ? `Description: ${project.description}` : null,
      project.goals.length ? `Goals:\n${goalLines}` : null,
      recentTasks.length ? `Recent Tasks:\n${taskLines}` : null,
      `Status: ${project.status}  Progress: ${project.progress}%`
    ].filter(Boolean).join('\n');

    res.json({ projectId: project._id, context });
  } catch (err) {
    console.error('[Projects] GET /:id/context', err);
    res.status(500).json({ error: 'Failed to build project context' });
  }
});

module.exports = router;
