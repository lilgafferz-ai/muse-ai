const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Idea = require('../models/Idea');
const KnowledgeNode = require('../models/KnowledgeNode');

// Try to require Memory — it may not always be available in degraded mode
let Memory;
try { Memory = require('../models/Memory'); } catch { Memory = null; }

const MAX_PER_TYPE = 5;

// GET / — universal cross-collection search
// Query param: q (search string)
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const regex = new RegExp(q.trim(), 'i'); // case-insensitive

    // Run all searches in parallel for speed
    const [chats, memories, projects, tasks, ideas, knowledge] = await Promise.all([
      // Chats — search message content
      Chat.find({ content: regex })
        .sort({ timestamp: -1 })
        .limit(MAX_PER_TYPE)
        .select('_id content role sessionId timestamp'),

      // Memories — optional model
      Memory
        ? Memory.find({ $or: [{ key: regex }, { value: regex }] })
            .sort({ importance: -1 })
            .limit(MAX_PER_TYPE)
            .select('_id key value type')
        : Promise.resolve([]),

      // Projects
      Project.find({ $or: [{ title: regex }, { description: regex }] })
        .sort({ updatedAt: -1 })
        .limit(MAX_PER_TYPE)
        .select('_id title description status color'),

      // Tasks
      Task.find({ $or: [{ title: regex }, { description: regex }] })
        .sort({ updatedAt: -1 })
        .limit(MAX_PER_TYPE)
        .select('_id title description status priority dueDate'),

      // Ideas
      Idea.find({ $or: [{ title: regex }, { body: regex }] })
        .sort({ updatedAt: -1 })
        .limit(MAX_PER_TYPE)
        .select('_id title body status pinned'),

      // Knowledge nodes
      KnowledgeNode.find({ $or: [{ name: regex }, { description: regex }] })
        .sort({ updatedAt: -1 })
        .limit(MAX_PER_TYPE)
        .select('_id name description type tags'),
    ]);

    // Normalise results into a consistent shape per type
    res.json({
      query: q,
      results: {
        chats: chats.map(c => ({
          id: c._id,
          type: 'chat',
          title: `${c.role === 'user' ? 'You' : 'Nex'}: ${c.content.slice(0, 80)}${c.content.length > 80 ? '…' : ''}`,
          matchedField: 'content',
          sessionId: c.sessionId,
          timestamp: c.timestamp
        })),
        memories: memories.map(m => ({
          id: m._id,
          type: 'memory',
          title: `${m.key}: ${m.value}`,
          matchedField: 'key/value'
        })),
        projects: projects.map(p => ({
          id: p._id,
          type: 'project',
          title: p.title,
          preview: p.description ? p.description.slice(0, 100) : '',
          matchedField: p.title.match(regex) ? 'title' : 'description',
          status: p.status,
          color: p.color
        })),
        tasks: tasks.map(t => ({
          id: t._id,
          type: 'task',
          title: t.title,
          preview: t.description ? t.description.slice(0, 100) : '',
          matchedField: t.title.match(regex) ? 'title' : 'description',
          status: t.status,
          priority: t.priority
        })),
        ideas: ideas.map(i => ({
          id: i._id,
          type: 'idea',
          title: i.title,
          preview: i.body ? i.body.slice(0, 100) : '',
          matchedField: i.title.match(regex) ? 'title' : 'body',
          status: i.status,
          pinned: i.pinned
        })),
        knowledge: knowledge.map(k => ({
          id: k._id,
          type: 'knowledge',
          title: k.name,
          preview: k.description ? k.description.slice(0, 100) : '',
          matchedField: k.name.match(regex) ? 'name' : 'description',
          nodeType: k.type,
          tags: k.tags
        }))
      }
    });
  } catch (err) {
    console.error('[Search] GET /', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
