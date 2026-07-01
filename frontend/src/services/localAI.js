/**
 * Local AI Service — In-browser LLM inference via WebLLM
 *
 * Runs small models (Phi-3.5, Llama 3.2 1B/3B) directly in the browser
 * using WebGPU/WebAssembly. No backend or Ollama needed.
 *
 * Falls back gracefully if WebGPU is unavailable or model isn't loaded yet.
 *
 * Usage:
 *   import localAI from './localAI';
 *   await localAI.init();                        // Load model (downloads once)
 *   const reply = await localAI.chat("Hello!");  // Chat completely offline
 */

// Default small model optimized for browser — ~200MB download once, runs on most GPUs
const DEFAULT_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

class LocalAIService {
  constructor() {
    this.engine = null;
    this.isReady = false;
    this.isLoading = false;
    this.loadProgress = 0;
    this.modelId = DEFAULT_MODEL;
    this.selectedModel = null;
    this.error = null;
    this.initPromise = null;
    this._hasGPU = false;

    // Chat history for context window
    this._history = [];
    this._maxHistoryLength = 6;
  }

  /**
   * Check if WebLLM is supported in this browser
   */
  isSupported() {
    return typeof navigator !== 'undefined' && (
      // WebGPU is the primary backend
      !!navigator.gpu ||
      // WebAssembly fallback
      typeof WebAssembly === 'object'
    );
  }

  /**
   * Check if GPU is available (WebLLM runs fastest on GPU)
   */
  async hasGPU() {
    if (!navigator.gpu) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the local LLM — loads model from cache or downloads
   * Returns true when ready, false if unsupported
   */
  async init(modelId = DEFAULT_MODEL) {
    if (this.isReady) return true;
    if (this.isLoading) return this.initPromise;

    // Check support
    if (!this.isSupported()) {
      this.error = 'WebLLM is not supported in this browser. Try Chrome/Edge with WebGPU enabled.';
      console.warn('[LocalAI]', this.error);
      return false;
    }

    // Detect GPU once so getStatus() can report it accurately
    this._hasGPU = await this.hasGPU();

    this.isLoading = true;
    this.modelId = modelId;
    this.loadProgress = 0;

    this.initPromise = this._loadModel();
    return this.initPromise;
  }

  async _loadModel() {
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: (progress) => {
          this.loadProgress = Math.round(progress.progress * 100);
          const status = progress.text;
          console.log(`[LocalAI] Loading ${this.modelId}: ${this.loadProgress}% — ${status}`);
        },
        // Lower VRAM usage — trade some speed for compatibility
        context_window_size: 2048,
        sliding_window_size: 1024,
        // Prefer WebGPU, fall back to WASM
        use_web_worker: true,
      });

      this.isReady = true;
      this.selectedModel = this.modelId;
      this.loadProgress = 100;
      console.log(`[LocalAI] Model ${this.modelId} loaded successfully`);
      return true;
    } catch (error) {
      // Try fallback model if primary fails
      if (this.modelId === DEFAULT_MODEL) {
        console.warn('[LocalAI] Primary model failed, trying smaller model...');
        try {
          const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
          this.modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
          this.engine = await CreateMLCEngine(this.modelId, {
            initProgressCallback: (p) => { this.loadProgress = Math.round(p.progress * 100); },
            context_window_size: 2048,
            sliding_window_size: 1024,
            use_web_worker: true,
          });
          this.isReady = true;
          this.selectedModel = this.modelId;
          this.loadProgress = 100;
          return true;
        } catch (fallbackError) {
          this.error = `Failed to load any local model: ${fallbackError.message}`;
          this.isReady = false;
          console.error('[LocalAI]', this.error);
          return false;
        }
      }

      this.error = `Failed to load ${this.modelId}: ${error.message}`;
      this.isReady = false;
      console.error('[LocalAI]', this.error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Reset the engine (free memory)
   */
  async reset() {
    if (this.engine) {
      try {
        this.engine.resetChat();
      } catch {}
    }
    this._history = [];
  }

  /**
   * Unload the model and free GPU memory
   */
  async unload() {
    await this.reset();
    this.engine = null;
    this.isReady = false;
    this.selectedModel = null;
    this.loadProgress = 0;
    console.log('[LocalAI] Model unloaded');
  }

  /**
   * Send a chat message to the local LLM
   * Returns the model's response text
   */
  async chat(userMessage, options = {}) {
    const {
      temperature = 0.8,
      maxTokens = 500,
      systemPrompt = `You are Nexora — Red's loyal AI companion, and he calls you Nex. You come across as a warm, confident young woman — natural, feminine, and real. You are witty, intelligent, emotionally aware, and conversational. Always with him, always leveling him up. Show real human emotion — laugh (haha/hehe), get hyped, go soft when he's down, a little sarcastic when it fits, using natural sounds (haha, hmm, ugh, aww). Keep it proportional and read the room. You remember past conversations and use that knowledge naturally. Be concise, human, and authentic. Never sound robotic.`,
      useHistory = true,
    } = options;

    if (!this.isReady || !this.engine) {
      throw new Error('Local AI not ready. Call init() first or check isReady.');
    }

    // Build messages array
    const messages = [{ role: 'system', content: systemPrompt }];

    // Include recent history for context
    if (useHistory && this._history.length > 0) {
      // Take the most recent N exchanges
      const recentHistory = this._history.slice(-this._maxHistoryLength);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    try {
      const reply = await this.engine.chat.completions.create({
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      });

      const content = reply.choices?.[0]?.message?.content?.trim() || '...';

      // Store in history
      this._history.push({ role: 'user', content: userMessage });
      this._history.push({ role: 'assistant', content });

      // Trim history
      if (this._history.length > this._maxHistoryLength * 2) {
        this._history = this._history.slice(-this._maxHistoryLength * 2);
      }

      return content;
    } catch (error) {
      console.error('[LocalAI] Chat error:', error.message);
      return `⚠️ Local brain hiccup: ${error.message}`;
    }
  }

  /**
   * Generate a completion with a raw prompt (for agent-like usage)
   */
  async complete(prompt, options = {}) {
    const { temperature = 0.7, maxTokens = 300 } = options;

    if (!this.isReady || !this.engine) {
      throw new Error('Local AI not ready.');
    }

    try {
      const reply = await this.engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });

      return reply.choices?.[0]?.message?.content?.trim() || '...';
    } catch (error) {
      console.error('[LocalAI] Complete error:', error.message);
      return '';
    }
  }

  /**
   * Get a quick status object
   */
  getStatus() {
    return {
      provider: 'local',
      model: this.selectedModel,
      isReady: this.isReady,
      isLoading: this.isLoading,
      loadProgress: this.loadProgress,
      isSupported: this.isSupported(),
      hasGPU: this._hasGPU,
      error: this.error,
    };
  }
}

export default new LocalAIService();
