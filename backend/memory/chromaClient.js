const { ChromaClient } = require('chromadb');

class ChromaClientWrapper {
  constructor() {
    this.client = null;
    this.collection = null;
    this.ready = false;
    this.dbPath = process.env.CHROMA_PATH || './chroma_db';
  }

  async initialize() {
    try {
      this.client = new ChromaClient({
        path: this.dbPath
      });

      // Try to get existing collection or create new one
      try {
        this.collection = await this.client.getCollection({ name: 'muse_memories' });
      } catch {
        this.collection = await this.client.createCollection({
          name: 'muse_memories',
          metadata: { 'hnsw:space': 'cosine' }
        });
      }

      this.ready = true;
      console.log('[ChromaDB] Initialized successfully');
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
