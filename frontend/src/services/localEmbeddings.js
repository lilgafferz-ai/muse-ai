/**
 * Local Embeddings Service — On-device semantic search via Transformers.js
 *
 * Uses a small embedding model (MiniLM-L6-v2) to convert text into vectors
 * entirely in the browser. No server, no API key, no cost.
 *
 * Powers local semantic memory search when offline.
 *
 * Usage:
 *   import localEmbeddings from './localEmbeddings';
 *   await localEmbeddings.init();
 *   const vector = await localEmbeddings.embed("Hello world");
 *   const similar = await localEmbeddings.search("query", memories);
 */

// Small, fast embedding model — ~80MB download, runs on CPU
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

class LocalEmbeddingsService {
  constructor() {
    this.pipeline = null;
    this.extractor = null;
    this.isReady = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.error = null;
    this.modelId = DEFAULT_MODEL;
    this.dimension = 384; // MiniLM-L6-v2 outputs 384-dim vectors
  }

  /**
   * Check if Transformers.js is supported
   */
  isSupported() {
    return typeof WebAssembly === 'object';
  }

  /**
   * Initialize the embedding model
   */
  async init(modelId = DEFAULT_MODEL) {
    if (this.isReady) return true;
    if (this.isLoading) return this._initPromise;
    if (!this.isSupported()) {
      this.error = 'Transformers.js requires WebAssembly support.';
      return false;
    }

    this.isLoading = true;
    this.modelId = modelId;
    this.loadProgress = 0;

    this._initPromise = this._loadModel();
    return this._initPromise;
  }

  async _loadModel() {
    try {
      const { pipeline, env } = await import('@xenova/transformers');

      // Configure for browser environment — always fetch from HuggingFace.
      // (Transformers.js caches downloads in the browser via the Cache API;
      // `env.cacheDir` is Node-only and has no effect here, so it's omitted.)
      env.allowLocalModels = false;

      // Load the feature extraction pipeline
      this.pipeline = await pipeline('feature-extraction', this.modelId, {
        progress_callback: (progress) => {
          if (progress.status === 'download') {
            this.loadProgress = Math.round(
              (progress.loaded / progress.total) * 100
            );
            console.log(
              `[LocalEmbeddings] Downloading ${this.modelId}: ${this.loadProgress}%`
            );
          } else if (progress.status === 'ready') {
            this.loadProgress = 100;
          }
        },
      });

      this.isReady = true;
      this.loadProgress = 100;
      console.log('[LocalEmbeddings] Model loaded:', this.modelId);
      return true;
    } catch (error) {
      this.error = `Failed to load embedding model: ${error.message}`;
      this.isReady = false;
      console.error('[LocalEmbeddings]', this.error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Convert text to an embedding vector
   */
  async embed(text) {
    if (!this.isReady || !this.pipeline) {
      throw new Error('Embeddings not ready. Call init() first.');
    }

    try {
      // Truncate very long text
      const input = text.slice(0, 2000);
      const result = await this.pipeline(input, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract the vector from the output tensor
      const vector = Array.from(result.data);
      return vector;
    } catch (error) {
      console.error('[LocalEmbeddings] Embed error:', error.message);
      // Return zero vector as fallback
      return new Array(this.dimension).fill(0);
    }
  }

  /**
   * Embed multiple texts at once (batch processing)
   */
  async embedBatch(texts) {
    if (!this.isReady || !this.pipeline) return texts.map(() => new Array(this.dimension).fill(0));

    try {
      const results = await Promise.all(
        texts.map(text => this.embed(text))
      );
      return results;
    } catch (error) {
      console.error('[LocalEmbeddings] Batch embed error:', error.message);
      return texts.map(() => new Array(this.dimension).fill(0));
    }
  }

  /**
   * Compute cosine similarity between two vectors
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Search through an array of items with `.text` field and return most similar
   */
  async search(query, items, topK = 5) {
    if (!items || items.length === 0) return [];

    try {
      const queryVec = await this.embed(query);

      // Score each item
      const scored = [];

      for (const item of items) {
        // Use stored embedding if available, otherwise compute on the fly
        let vec;
        if (item._embedding) {
          vec = item._embedding;
        } else if (item.text) {
          vec = await this.embed(item.text);
        } else {
          continue;
        }

        const score = this.cosineSimilarity(queryVec, vec);
        scored.push({ ...item, score });
      }

      // Sort by similarity score (descending)
      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, topK);
    } catch (error) {
      console.error('[LocalEmbeddings] Search error:', error.message);
      return items.slice(0, topK);
    }
  }

  /**
   * Get status info
   */
  getStatus() {
    return {
      provider: 'local-embeddings',
      model: this.modelId,
      isReady: this.isReady,
      isLoading: this.isLoading,
      loadProgress: this.loadProgress,
      dimension: this.dimension,
      isSupported: this.isSupported(),
      error: this.error,
    };
  }
}

export default new LocalEmbeddingsService();
