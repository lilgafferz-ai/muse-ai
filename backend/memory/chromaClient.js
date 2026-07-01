/**
 * ChromaDB Vector Memory Client
 * 
 * Connects to a ChromaDB HTTP server for vector similarity search.
 * Falls back gracefully to MongoDB-only mode if ChromaDB is unavailable.
 * 
 * Requires a running ChromaDB server (install: pip install chromadb, then: chroma run)
 */
const { ChromaClient } = require('chromadb');

class ChromaClientWrapper {
  constructor() {
    this.client = null;
    this.collection = null;
    this.ready = false;
    this.serverUrl = process.env.CHROMA_SERVER_URL || 'http://localhost:8000';
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: this.serverUrl
      });

      // Verify connection
      try {
        await this.client.heartbeat();
      } catch {
        throw new Error('ChromaDB server not reachable at ' + this.serverUrl);
      }

      // Try to get existing collection or create new one
      try {
        this.collection = await this.client.getCollection({ name: 'muse_memories' });
        console.log('[ChromaDB] Found existing collection');
      } catch {
        this.collection = await this.client.createCollection({
          name: 'muse_memories',
          metadata: { 'hnsw:space': 'cosine' }
        });
        console.log('[ChromaDB] Created new collection');
      }

      this.ready = true;
      console.log('[ChromaDB] Initialized successfully at', this.serverUrl);
      return true;
    } catch (error) {
      console.warn('[ChromaDB] Initialization failed (running in fallback mode):', error.message);
      this.ready = false;
      return false;
    }
  }

  /**
   * Add a memory with its embedding
   */
  async addMemory(id, text, metadata = {}) {
    if (!this.ready) return false;

    try {
      await this.collection.add({
        ids: [id],
        documents: [text],
        metadatas: [{
          ...metadata,
          timestamp: new Date().toISOString()
        }]
      });
      return true;
    } catch (error) {
      console.error('[ChromaDB] Add memory error:', error.message);
      return false;
    }
  }

  /**
   * Search memories by semantic similarity
   */
  async searchMemories(query, nResults = 5) {
    if (!this.ready) return [];

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: nResults
      });

      if (!results.documents || results.documents.length === 0) return [];

      const memories = [];
      for (let i = 0; i < results.documents[0].length; i++) {
        memories.push({
          id: results.ids[0][i],
          text: results.documents[0][i],
          metadata: results.metadatas[0][i],
          distance: results.distances[0][i]
        });
      }

      return memories;
    } catch (error) {
      console.error('[ChromaDB] Search error:', error.message);
      return [];
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id) {
    if (!this.ready) return false;

    try {
      await this.collection.delete({ ids: [id] });
      return true;
    } catch (error) {
      console.error('[ChromaDB] Delete error:', error.message);
      return false;
    }
  }

  /**
   * Get collection count
   */
  async count() {
    if (!this.ready) return 0;

    try {
      return await this.collection.count();
    } catch {
      return 0;
    }
  }
}

module.exports = new ChromaClientWrapper();
