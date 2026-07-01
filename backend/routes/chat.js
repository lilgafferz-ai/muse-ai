const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Personality = require('../models/Personality');
const aiProvider = require('../services/aiProvider');
const contextBuilder = require('../services/contextBuilder');
const memoryEngine = require('../memory/memoryEngine');
const agentService = require('../services/agentService');
const toolRegistry = require('../services/toolRegistry');
const connectivityMonitor = require('../services/connectivityMonitor');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// MongoDB is optional — Muse still chats (just without persistence) when it's down.
const dbUp = () => mongoose.connection.readyState === 1;

/**
 * POST /api/chat
 * Send a message to Muse and get a response
 * Auto-detects if it's a command (tool usage) or casual chat
 */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, forceAgent } = req.body;
    const userId = 'default';

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = sessionId || uuidv4();

    // Persist the user message and gather context — but only when the DB is up.
    // Without MongoDB, Muse still replies; it just won't remember across turns.
    let memories = [];
    let personality = null;
    let recentChats = [];

    if (dbUp()) {
      try {
        await new Chat({ role: 'user', content: message.trim(), sessionId: session }).save();

        [memories, personality, recentChats] = await Promise.all([
          memoryEngine.getRelevantMemories(userId, message),
          Personality.findOne({ userId }).lean(),
          Chat.find({ sessionId: session })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean()
        ]);
      } catch (dbErr) {
        console.warn('[Chat] DB unavailable, continuing without persistence:', dbErr.message);
        memories = []; personality = null; recentChats = [];
      }
    }

    let response;
    let usedTools = [];
    let isAgent = false;
    const isCommand = forceAgent || agentService.isCommandRequest(message);

    if (isCommand && toolRegistry.initialized) {
      // Use agent mode with tool capabilities
      const agentResult = await agentService.processMessage(
        message.trim(),
        memories,
        personality,
        recentChats.reverse()
      );
      response = agentResult.response;
      usedTools = agentResult.usedTools;
      isAgent = agentResult.isAgent;
    } else {
      // Use normal chat mode
      const { system, prompt } = contextBuilder.buildPrompt(
        message.trim(),
        memories,
        personality,
        recentChats.reverse()
      );

      const fullPrompt = `${system}\n\n${prompt}`;
      response = await aiProvider.generatePrompt(fullPrompt, {
        temperature: 0.8,
        maxTokens: 500
      });

      // Also check if the response contains tool calls anyway
      const toolResults = await toolRegistry.executeAllCalls(response, connectivityMonitor.isOnline);
      if (toolResults.length > 0) {
        usedTools = toolResults;
        isAgent = true;
      }
    }

    // Persist the response + extract memories — only when the DB is up.
    if (dbUp()) {
      try {
        await new Chat({
          role: 'assistant',
          content: response,
          sessionId: session,
          metadata: isAgent ? { mode: connectivityMonitor.isOnline ? 'online' : 'offline', toolsUsed: JSON.stringify(usedTools) } : {}
        }).save();
      } catch (dbErr) {
        console.warn('[Chat] Could not save response:', dbErr.message);
      }

      // Save important memories (fire and forget)
      memoryEngine.saveMemories(userId, message.trim(), response)
        .catch(err => console.error('[Chat] Memory save error:', err.message));
    }

    res.json({
      response,
      sessionId: session,
      memoriesFound: memories.length,
      isAgent,
      usedTools: usedTools.map(t => ({
        tool: t.tool,
        success: t.success,
        result: t.success ? t.result : null,
        error: t.error || null
      })),
      mode: connectivityMonitor.isOnline ? 'online' : 'offline'
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      response: 'My brain just blue-screened. Try again?'
    });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chats = await Chat.find({ sessionId })
      .sort({ timestamp: 1 })
      .lean();

    res.json({ chats, sessionId });
  } catch (error) {
    console.error('[Chat History] Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/chat/sessions
 * List all chat sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Chat.aggregate([
      { $sort: { timestamp: 1 } },
      { $group: {
        _id: '$sessionId',
        messageCount: { $sum: 1 },
        lastMessage: { $max: '$timestamp' },
        preview: { $last: '$content' }
      }},
      { $sort: { lastMessage: -1 } },
      { $limit: 50 }
    ]);

    res.json({ sessions });
  } catch (error) {
    console.error('[Chat Sessions] Error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/chat/history/:sessionId
 * Delete a chat session
 */
router.delete('/history/:sessionId', async (req, res) => {
  try {
    await Chat.deleteMany({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
