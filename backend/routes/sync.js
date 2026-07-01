const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const memoryEngine = require('../memory/memoryEngine');

/**
 * POST /api/sync/push
 * Receive locally-created chats and memories from an offline-first client
 * and persist them. Idempotent: repeated pushes of the same items are
 * deduplicated (upsert), so a client can safely retry.
 *
 * Body: { chats: [...], memories: [...] }
 * Returns: { success: true, synced: { chats, memories } }
 */
router.post('/push', async (req, res) => {
  try {
    const { chats = [], memories = [] } = req.body || {};
    const userId = 'default';

    let chatCount = 0;
    let memoryCount = 0;

    // ─── Chats ───────────────────────────────────────────────────
    for (const chat of chats) {
      if (!chat || !chat.role || !chat.content || !chat.sessionId) continue;

      const timestamp = chat.timestamp ? new Date(chat.timestamp) : new Date();

      // Chat.metadata is a Map<String, String> — coerce values to strings
      const metadata = {};
      if (chat.metadata && typeof chat.metadata === 'object') {
        for (const [k, v] of Object.entries(chat.metadata)) {
          metadata[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
      }

      // Upsert on the natural key so retried pushes don't duplicate
      await Chat.updateOne(
        { sessionId: chat.sessionId, role: chat.role, content: chat.content, timestamp },
        { $setOnInsert: { sessionId: chat.sessionId, role: chat.role, content: chat.content, timestamp, metadata } },
        { upsert: true }
      );
      chatCount++;
    }

    // ─── Memories ────────────────────────────────────────────────
    for (const mem of memories) {
      if (!mem || !mem.value) continue;
      try {
        await memoryEngine.saveClientMemory(userId, mem);
        memoryCount++;
      } catch (error) {
        // Skip individual failures (e.g. invalid type) without failing the batch
        console.warn('[Sync Push] Memory skipped:', error.message);
      }
    }

    res.json({ success: true, synced: { chats: chatCount, memories: memoryCount } });
  } catch (error) {
    console.error('[Sync Push] Error:', error);
    res.status(500).json({ error: 'Sync push failed' });
  }
});

module.exports = router;
