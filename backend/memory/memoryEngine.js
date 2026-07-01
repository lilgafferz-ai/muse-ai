const Memory = require('../models/Memory');
const chromaClient = require('./chromaClient');

class MemoryEngine {
  /**
   * Detect if a message contains important information worth remembering
   */
  detectImportantMemory(userMessage, assistantResponse) {
    const memories = [];
    const text = `${userMessage} ${assistantResponse}`.toLowerCase();

    // Preference detection patterns
    const preferencePatterns = [
      { pattern: /i (like|love|enjoy|prefer|hate|dislike|can't stand) (\w+)/gi, key: 'preference' },
      { pattern: /my favorite (\w+) is (\w+)/gi, key: 'favorite' },
      { pattern: /i (don't|do not) (like|want) (\w+)/gi, key: 'dislike' }
    ];

    for (const { pattern, key } of preferencePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        memories.push({
          type: 'preference',
          key: match[1] || match[2],
          value: match[0],
          importance: this._calculateImportance(text, key)
        });
      }
    }

    // Emotion detection
    const emotionPatterns = [
      { pattern: /i (feel|felt|am feeling) (\w+)/gi, type: 'emotion' },
      { pattern: /i'm (feeling|so|really) (\w+)/gi, type: 'emotion' },
      { pattern: /this (makes|made) me (feel|think) (\w+)/gi, type: 'emotion' }
    ];

    for (const { pattern, type } of emotionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        memories.push({
          type: type,
          key: match[match.length - 1],
          value: match[0],
          importance: 7
        });
      }
    }

    // Goal detection
    const goalPatterns = [
      { pattern: /i (want|need|gotta|have to|should) (\w+)/gi },
      { pattern: /my goal is to (\w+)/gi },
      { pattern: /i'm (working|trying) to (\w+)/gi },
      { pattern: /i (will|plan to|intend to) (\w+)/gi }
    ];

    for (const { pattern } of goalPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        memories.push({
          type: 'goal',
          key: 'goal',
          value: match[0],
          importance: 8
        });
      }
    }

    // Fact detection
    const factPatterns = [
      { pattern: /i (am|work|live|study|have|own) (?:a|an|at|in|with) (\w+)/gi },
      { pattern: /my (name|age|job|work|company|project) is (\w+)/gi }
    ];

    for (const { pattern } of factPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        memories.push({
          type: 'fact',
          key: match[1],
          value: match[0],
          importance: 6
        });
      }
    }

    // Deduplicate by normalizing
    return this._deduplicate(memories);
  }

  /**
   * Calculate importance score based on patterns
   */
  _calculateImportance(text, _type) {
    const boostKeywords = ['really', 'very', 'always', 'never', 'absolutely', 'extremely', 'most', 'best', 'worst'];
    let score = 5;

    for (const keyword of boostKeywords) {
      if (text.includes(keyword)) score += 1;
    }

    return Math.min(score, 10);
  }

  /**
   * Remove duplicate memories — checks both type:key and value to avoid
   * saving the same pattern with slightly different context
   */
  _deduplicate(memories) {
    const seen = new Set();
    return memories.filter(m => {
      const key = `${m.type}:${m.key}:${m.value.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5); // Max 5 memories per message
  }

  /**
   * Save important memories to both MongoDB and ChromaDB
   */
  async saveMemories(userId, message, response) {
    const detected = this.detectImportantMemory(message, response);

    for (const mem of detected) {
      try {
        // Save to MongoDB
        const memory = new Memory({
          userId,
          type: mem.type,
          key: mem.key,
          value: mem.value,
          importance: mem.importance,
          context: `From message: "${message.slice(0, 100)}"`
        });
        await memory.save();

        // Save to ChromaDB for semantic search
        await chromaClient.addMemory(
          memory._id.toString(),
          `${mem.type}: ${mem.value}`,
          {
            type: mem.type,
            key: mem.key,
            importance: mem.importance
          }
        );
      } catch (error) {
        console.error('[Memory] Save error:', error.message);
      }
    }

    return detected;
  }

  /**
   * Save a single client-authored memory (from offline sync).
   * Upserts by userId+type+key+value so repeated syncs don't create duplicates.
   */
  async saveClientMemory(userId, mem) {
    const type = mem.type || 'fact';
    const key = mem.key || 'memory';
    const value = mem.value;
    if (!value) return null;

    // Skip if an identical memory already exists
    const existing = await Memory.findOne({ userId, type, key, value });
    if (existing) return existing;

    const memory = new Memory({
      userId,
      type,
      key,
      value,
      importance: mem.importance || 5,
      context: mem.context || ''
    });
    await memory.save();

    // Mirror into ChromaDB for semantic search (optional — don't fail on error)
    try {
      await chromaClient.addMemory(
        memory._id.toString(),
        `${type}: ${value}`,
        { type, key, importance: memory.importance }
      );
    } catch (error) {
      console.warn('[Memory] Chroma sync skipped:', error.message);
    }

    return memory;
  }

  /**
   * Retrieve relevant memories for context
   */
  async getRelevantMemories(userId, message, limit = 5) {
    const memories = [];

    // Try ChromaDB semantic search first
    try {
      const semanticMemories = await chromaClient.searchMemories(message, limit);
      if (semanticMemories.length > 0) {
        // Convert to same format as MongoDB results
        for (const sm of semanticMemories) {
          memories.push({
            key: sm.metadata?.key || 'memory',
            value: sm.text,
            context: '',
            importance: sm.metadata?.importance || 5,
            _chromaScore: sm.distance
          });
        }
      }
    } catch (e) {
      // Fall through to MongoDB search
    }

    // Also get high-importance memories from MongoDB
    const mongoMemories = await Memory.find({ userId, importance: { $gte: 6 } })
      .sort({ lastAccessed: -1 })
      .limit(limit)
      .lean();

    // Merge and deduplicate
    const merged = [...memories];
    const seenKeys = new Set(memories.map(m => m.key));

    for (const mm of mongoMemories) {
      if (!seenKeys.has(mm.key)) {
        merged.push(mm);
        seenKeys.add(mm.key);
      }
    }

    // Update lastAccessed for used memories
    if (mongoMemories.length > 0) {
      const ids = mongoMemories.map(m => m._id);
      await Memory.updateMany(
        { _id: { $in: ids } },
        { lastAccessed: new Date() }
      );
    }

    return merged.slice(0, limit);
  }

  /**
   * Get all memories for display
   */
  async getAllMemories(userId) {
    const memories = await Memory.find({ userId })
      .sort({ importance: -1, createdAt: -1 })
      .lean();

    // Group by type
    const grouped = {
      preferences: memories.filter(m => m.type === 'preference').slice(0, 20),
      emotions: memories.filter(m => m.type === 'emotion').slice(0, 20),
      facts: memories.filter(m => m.type === 'fact').slice(0, 20),
      goals: memories.filter(m => m.type === 'goal').slice(0, 20)
    };

    return {
      all: memories,
      grouped,
      total: memories.length
    };
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId) {
    try {
      const memory = await Memory.findByIdAndDelete(memoryId);
      if (memory) {
        await chromaClient.deleteMemory(memoryId.toString());
      }
      return !!memory;
    } catch (error) {
      console.error('[Memory] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Get memory stats
   */
  async getStats(userId) {
    const stats = await Memory.aggregate([
      { $match: { userId } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgImportance: { $avg: '$importance' }
      }}
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      total,
      byType: stats,
      chromaCount: await chromaClient.count()
    };
  }
}

module.exports = new MemoryEngine();
