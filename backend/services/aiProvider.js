/**
 * AI Provider — chooses Nexora's brain.
 *
 * HYBRID (default): use the smart cloud model (OpenRouter) when online + a key
 * is configured; fall back to the local model (Ollama) when offline or if the
 * cloud call fails. Force a specific brain with AI_PROVIDER=ollama|openrouter.
 */
const ollamaService = require('./ollamaService');
const openRouterService = require('./openRouterService');
const connectivityMonitor = require('./connectivityMonitor');

class AIProvider {
  constructor() {
    this.currentProvider = 'ollama';
    this.isCloud = false;
  }

  /**
   * Decide which brain to use for this request.
   */
  getProvider() {
    const forced = (process.env.AI_PROVIDER || '').toLowerCase();
    const cloudReady = openRouterService.ready;          // true when an API key is set
    const online = connectivityMonitor.isOnline;

    if (process.env.RENDER || process.env.RAILWAY_SERVICE_ID) {
      this.currentProvider = 'openrouter';               // deployed → cloud
    } else if (forced === 'openrouter') {
      this.currentProvider = 'openrouter';
    } else if (forced === 'ollama') {
      this.currentProvider = 'ollama';
    } else {
      // Hybrid: smart cloud when we can, local otherwise
      this.currentProvider = (cloudReady && online) ? 'openrouter' : 'ollama';
    }

    this.isCloud = this.currentProvider === 'openrouter';
    return this.currentProvider;
  }

  /** OpenRouter's error/no-key responses come back as "⚠️ …" strings. */
  _isCloudError(text) {
    return typeof text === 'string' && text.trim().startsWith('⚠️');
  }

  async generateSystemPrompt(systemPrompt, userMessage, options = {}) {
    this.getProvider();

    if (this.currentProvider === 'openrouter' && openRouterService.ready) {
      console.log('[AI] Using OpenRouter (cloud)');
      const cloud = await openRouterService.generate(systemPrompt, userMessage, options);
      if (!this._isCloudError(cloud)) return cloud;
      console.warn('[AI] Cloud failed — falling back to local Ollama');
    }

    console.log('[AI] Using Ollama (local)');
    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
    return await ollamaService.generate(fullPrompt, options);
  }

  async generatePrompt(prompt, options = {}) {
    this.getProvider();

    if (this.currentProvider === 'openrouter' && openRouterService.ready) {
      console.log('[AI] Using OpenRouter (cloud)');
      const cloud = await openRouterService.generateWithPrompt(prompt, options);
      if (!this._isCloudError(cloud)) return cloud;
      console.warn('[AI] Cloud failed — falling back to local Ollama');
    }

    console.log('[AI] Using Ollama (local)');
    return await ollamaService.generate(prompt, options);
  }

  async healthCheck() {
    this.getProvider();
    if (this.currentProvider === 'openrouter') {
      return await openRouterService.healthCheck();
    }
    return await ollamaService.healthCheck();
  }

  getInfo() {
    this.getProvider();
    return {
      provider: this.currentProvider,
      isCloud: this.isCloud,
      mode: (process.env.AI_PROVIDER || 'hybrid'),
      model: this.currentProvider === 'openrouter'
        ? openRouterService.model
        : process.env.OLLAMA_MODEL || 'llama3',
      ready: this.currentProvider === 'openrouter'
        ? openRouterService.ready
        : true
    };
  }
}

module.exports = new AIProvider();
