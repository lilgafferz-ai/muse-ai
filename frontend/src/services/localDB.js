/**
 * Local Database Service — SQLite WASM for offline-first storage
 *
 * Stores chats, memories, and personality locally using SQLite running
 * in the browser via WebAssembly. Data persists in IndexedDB.
 *
 * When online, syncs to the backend (MongoDB) via syncEngine.
 * When offline, everything works from local storage.
 *
 * Usage:
 *   import localDB from './localDB';
 *   await localDB.init();
 *   await localDB.saveChat(chat);
 *   const chats = await localDB.getChats();
 */

import localEmbeddings from './localEmbeddings';

const DB_NAME = 'muse_local';
const DB_VERSION = 1;

class LocalDatabaseService {
  constructor() {
    this.db = null;
    this.sql = null;
    this.isReady = false;
    this.initPromise = null;

    // Pending operations queue (for writes before DB is ready)
    this._pendingOps = [];
    this._processingPending = false;
  }

  /**
   * Initialize the local SQLite database
   */
  async init() {
    if (this.isReady) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  async _initialize() {
    try {
      const initSqlJs = await import('sql.js');
      const SQL = await initSqlJs.default({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });

      // Try to load existing database from IndexedDB
      const savedDb = await this._loadFromIndexedDB();

      if (savedDb) {
        this.db = new SQL.Database(new Uint8Array(savedDb));
      } else {
        this.db = new SQL.Database();
      }

      this.sql = SQL;
      this.isReady = true;

      // Create tables
      this._createTables();

      // Auto-save to IndexedDB periodically
      this._startAutoSave();

      // Process any pending operations
      await this._processPending();

      console.log('[LocalDB] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[LocalDB] Init error:', error.message);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Create all necessary tables if they don't exist
   */
  _createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_error INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_chats_session
      ON chats(session_id, timestamp)
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        preview TEXT DEFAULT '',
        message_count INTEGER DEFAULT 0,
        last_message TEXT,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        context TEXT DEFAULT '',
        importance INTEGER DEFAULT 5,
        embedding TEXT DEFAULT '[]',
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        last_accessed TEXT DEFAULT (datetime('now'))
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_memories_type
      ON memories(type, importance)
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS personality (
        id TEXT PRIMARY KEY DEFAULT 'default',
        user_id TEXT DEFAULT 'default',
        traits TEXT DEFAULT '{"wit":7,"sarcasm":6,"empathy":8,"playfulness":7,"formality":2,"warmth":8}',
        communication_style TEXT DEFAULT 'playful',
        custom_instructions TEXT DEFAULT '',
        synced INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS local_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  // ─── Chat Operations ───────────────────────────────────────────

  /**
   * Save a chat message locally
   */
  saveChat(chat) {
    const id = chat.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sessionId = chat.sessionId || 'default';
    const timestamp = chat.timestamp instanceof Date
      ? chat.timestamp.toISOString()
      : chat.timestamp || new Date().toISOString();
    const isError = chat.isError ? 1 : 0;
    const metadata = JSON.stringify(chat.metadata || {});

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chats (id, role, content, session_id, timestamp, is_error, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([id, chat.role, chat.content, sessionId, timestamp, isError, metadata]);
    stmt.free();

    // Update session preview
    this._updateSessionPreview(sessionId, chat.content);
    this._markDirty();

    return id;
  }

  /**
   * Get chat messages for a session
   */
  getChats(sessionId, limit = 50) {
    const results = this.db.exec(`
      SELECT * FROM chats
      WHERE session_id = ?
      ORDER BY timestamp ASC
      LIMIT ?
    `, [sessionId, limit]);

    if (results.length === 0 || !results[0].values) return [];
    const columns = results[0].columns;

    return results[0].values.map(row => {
      const r = {};
      columns.forEach((col, i) => { r[col] = row[i]; });
      return {
        id: r.id,
        _id: r.id,
        role: r.role,
        content: r.content,
        sessionId: r.session_id,
        timestamp: r.timestamp,
        isError: r.is_error === 1,
        metadata: this._safeParse(r.metadata),
      };
    });
  }

  /**
   * Get all sessions
   */
  getSessions() {
    const results = this.db.exec(`
      SELECT * FROM sessions
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    if (results.length === 0 || !results[0].values) return [];
    const columns = results[0].columns;

    return results[0].values.map(row => {
      const r = {};
      columns.forEach((col, i) => { r[col] = row[i]; });
      return {
        id: r.id,
        _id: r.id,
        preview: r.preview,
        messageCount: r.message_count,
        lastMessage: r.last_message,
        updatedAt: r.updated_at,
      };
    });
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId) {
    this.db.run('DELETE FROM chats WHERE session_id = ?', [sessionId]);
    this.db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
    this._markDirty();
  }

  /**
   * Update session preview when new messages are added
   */
  _updateSessionPreview(sessionId, content) {
    const existing = this.db.exec(
      'SELECT id FROM sessions WHERE id = ?', [sessionId]
    );

    // Truncate preview to first 80 chars
    const preview = content.replace(/\n/g, ' ').slice(0, 80);

    if (existing.length === 0) {
      this.db.run(`
        INSERT INTO sessions (id, preview, message_count, last_message)
        VALUES (?, ?, 1, datetime('now'))
      `, [sessionId, preview]);
    } else {
      this.db.run(`
        UPDATE sessions
        SET message_count = message_count + 1,
            last_message = datetime('now'),
            preview = CASE WHEN ? <> '' THEN ? ELSE preview END,
            updated_at = datetime('now')
        WHERE id = ?
      `, [preview, preview, sessionId]);
    }
  }

  // ─── Memory Operations ─────────────────────────────────────────

  /**
   * Save a memory locally
   */
  async saveMemory(memory) {
    const id = memory.id || memory._id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Compute embedding if possible
    let embedding = '[]';
    if (localEmbeddings.isReady && memory.value) {
      try {
        const vec = await localEmbeddings.embed(memory.value);
        embedding = JSON.stringify(vec);
      } catch {}
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (id, type, key, value, context, importance, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      id,
      memory.type || 'fact',
      memory.key || 'memory',
      memory.value || '',
      memory.context || '',
      memory.importance || 5,
      embedding,
    ]);
    stmt.free();

    this._markDirty();
    return id;
  }

  /**
   * Get all memories
   */
  getAllMemories() {
    const results = this.db.exec(`
      SELECT * FROM memories
      ORDER BY importance DESC, created_at DESC
    `);

    if (results.length === 0 || !results[0].values) {
      return { all: [], grouped: { preferences: [], emotions: [], facts: [], goals: [] }, total: 0 };
    }
    const columns = results[0].columns;

    const memories = results[0].values.map(row => {
      const r = {};
      columns.forEach((col, i) => { r[col] = row[i]; });
      return {
        _id: r.id,
        type: r.type,
        key: r.key,
        value: r.value,
        context: r.context,
        importance: r.importance,
        createdAt: r.created_at,
        lastAccessed: r.last_accessed,
        _embedding: this._safeParse(r.embedding),
      };
    });

    return {
      all: memories,
      grouped: {
        preferences: memories.filter(m => m.type === 'preference'),
        emotions: memories.filter(m => m.type === 'emotion'),
        facts: memories.filter(m => m.type === 'fact'),
        goals: memories.filter(m => m.type === 'goal'),
      },
      total: memories.length,
    };
  }

  /**
   * Search memories semantically (if embeddings loaded) or by keyword
   */
  async searchMemories(query) {
    const all = this.getAllMemories().all;

    // Try semantic search first
    if (localEmbeddings.isReady) {
      const results = await localEmbeddings.search(
        query,
        all.map(m => ({ ...m, text: `${m.key}: ${m.value}` })),
        10
      );
      return results.filter(r => r.score > 0.3).slice(0, 10);
    }

    // Fallback: simple keyword matching
    const q = query.toLowerCase();
    return all
      .filter(m =>
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }

  /**
   * Search memories semantically using local embeddings
   */
  async semanticSearchMemories(query, limit = 5) {
    const all = this.getAllMemories().all;
    if (!localEmbeddings.isReady || all.length === 0) return [];

    const results = await localEmbeddings.search(
      query,
      all.map(m => ({ ...m, text: `${m.type}: ${m.value}` })),
      limit
    );

    return results.map(r => ({
      key: r.key,
      value: r.value,
      type: r.type,
      importance: r.importance,
      context: r.context,
      score: r.score,
    }));
  }

  /**
   * Delete a memory
   */
  deleteMemory(id) {
    this.db.run('DELETE FROM memories WHERE id = ?', [id]);
    this._markDirty();
  }

  /**
   * Get memory stats
   */
  getMemoryStats() {
    const types = ['preference', 'emotion', 'fact', 'goal'];
    const stats = [];

    for (const type of types) {
      const result = this.db.exec(
        'SELECT COUNT(*) as count, AVG(importance) as avg_imp FROM memories WHERE type = ?',
        [type]
      );
      if (result.length > 0) {
        stats.push({
          _id: type,
          count: result[0].values[0][0],
          avgImportance: result[0].values[0][1] || 0,
        });
      }
    }

    const total = this.db.exec('SELECT COUNT(*) as total FROM memories');
    const totalCount = total.length > 0 ? total[0].values[0][0] : 0;

    return {
      total: totalCount,
      byType: stats,
      chromaCount: 0,
    };
  }

  // ─── Personality Operations ────────────────────────────────────

  /**
   * Get personality settings
   */
  getPersonality() {
    const results = this.db.exec('SELECT * FROM personality WHERE id = ?', ['default']);

    if (results.length === 0 || !results[0].values || results[0].values.length === 0) return null;
    const columns = results[0].columns;
    const r = {};
    columns.forEach((col, i) => { r[col] = results[0].values[0][i]; });

    return {
      userId: r.user_id,
      traits: this._safeParse(r.traits),
      communicationStyle: r.communication_style,
      customInstructions: r.custom_instructions,
    };
  }

  /**
   * Save personality settings
   */
  savePersonality(personality) {
    const traits = JSON.stringify(personality.traits || {
      wit: 7, sarcasm: 6, empathy: 8, playfulness: 7, formality: 2, warmth: 8,
    });

    this.db.run(`
      INSERT OR REPLACE INTO personality (id, user_id, traits, communication_style, custom_instructions, updated_at)
      VALUES ('default', 'default', ?, ?, ?, datetime('now'))
    `, [
      traits,
      personality.communicationStyle || 'playful',
      personality.customInstructions || '',
    ]);

    this._markDirty();
  }

  // ─── Pending Sync Tracking ─────────────────────────────────────

  /**
   * Get all unsynced items
   */
  getUnsyncedItems() {
    const unsynced = {
      chats: [],
      memories: [],
      sessions: [],
    };

    // Unsynced chats — return full rows so they can actually be pushed
    const chatRows = this.db.exec(
      'SELECT id, role, content, session_id, timestamp, metadata FROM chats WHERE synced = 0 LIMIT 100'
    );
    if (chatRows.length > 0 && chatRows[0].values) {
      unsynced.chats = chatRows[0].values.map(row => ({
        id: row[0],
        role: row[1],
        content: row[2],
        sessionId: row[3],
        timestamp: row[4],
        metadata: this._safeParse(row[5]),
      }));
    }

    // Unsynced memories — return full rows
    const memRows = this.db.exec(
      'SELECT id, type, key, value, context, importance FROM memories WHERE synced = 0 LIMIT 100'
    );
    if (memRows.length > 0 && memRows[0].values) {
      unsynced.memories = memRows[0].values.map(row => ({
        id: row[0],
        type: row[1],
        key: row[2],
        value: row[3],
        context: row[4],
        importance: row[5],
      }));
    }

    return unsynced;
  }

  /**
   * Mark items as synced
   */
  markSynced(type, ids) {
    if (!ids || ids.length === 0) return;

    if (type === 'chats') {
      for (const id of ids) {
        this.db.run('UPDATE chats SET synced = 1 WHERE id = ?', [id]);
      }
    } else if (type === 'memories') {
      for (const id of ids) {
        this.db.run('UPDATE memories SET synced = 1 WHERE id = ?', [id]);
      }
    }

    this._markDirty();
  }

  // ─── Persistence ───────────────────────────────────────────────

  /**
   * Save the database to IndexedDB
   */
  async _saveToIndexedDB() {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const DB = await this._getIndexedDB();

      const tx = DB.transaction('databases', 'readwrite');
      const store = tx.objectStore('databases');
      store.put({ id: DB_NAME, data: Array.from(data) });

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    } catch (error) {
      console.warn('[LocalDB] Failed to persist to IndexedDB:', error.message);
    }
  }

  /**
   * Load database from IndexedDB
   */
  async _loadFromIndexedDB() {
    try {
      const DB = await this._getIndexedDB();

      return new Promise((resolve) => {
        const tx = DB.transaction('databases', 'readonly');
        const store = tx.objectStore('databases');
        const request = store.get(DB_NAME);

        request.onsuccess = () => {
          if (request.result && request.result.data) {
            resolve(new Uint8Array(request.result.data));
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Get or create the IndexedDB database
   */
  async _getIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('muse_local_storage', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Start periodic auto-save
   */
  _startAutoSave() {
    this._dirty = false;
    setInterval(() => {
      if (this._dirty) {
        this._saveToIndexedDB();
        this._dirty = false;
      }
    }, 5000); // Save every 5 seconds if dirty
  }

  _markDirty() {
    this._dirty = true;
  }

  /**
   * Force a save immediately
   */
  async flush() {
    await this._saveToIndexedDB();
    this._dirty = false;
  }

  // ─── Pending Operations ────────────────────────────────────────

  _enqueue(op) {
    this._pendingOps.push(op);
    if (this.isReady) this._processPending();
  }

  async _processPending() {
    if (this._processingPending || !this.isReady) return;
    this._processingPending = true;

    while (this._pendingOps.length > 0) {
      const op = this._pendingOps.shift();
      try {
        if (typeof op === 'function') {
          await op(this);
        }
      } catch (error) {
        console.warn('[LocalDB] Pending op error:', error);
      }
    }

    this._processingPending = false;
  }

  // ─── Helpers ───────────────────────────────────────────────────

  async waitUntilReady() {
    if (this.isReady) return;
    // Wait up to 30 seconds
    for (let i = 0; i < 300; i++) {
      if (this.isReady) return;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('LocalDB failed to initialize within 30 seconds');
  }

  _toArray(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    return [result];
  }

  _safeParse(str) {
    if (!str) return {};
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch {
      return {};
    }
  }

  /**
   * Get DB status
   */
  getStatus() {
    let chatCount = 0;
    let memoryCount = 0;

    try {
      if (this.isReady) {
        const c = this.db.exec('SELECT COUNT(*) FROM chats');
        if (c.length > 0) chatCount = c[0].values[0][0];

        const m = this.db.exec('SELECT COUNT(*) FROM memories');
        if (m.length > 0) memoryCount = m[0].values[0][0];
      }
    } catch {}

    return {
      isReady: this.isReady,
      chatCount,
      memoryCount,
      pendingOps: this._pendingOps.length,
    };
  }
}

export default new LocalDatabaseService();
