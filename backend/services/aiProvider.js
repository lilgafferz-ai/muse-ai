/**
 * AI Provider — Abstraction layer that selects between:
 * - Ollama (local, default in development)
 * - OpenRouter (cloud, for deployed environments)
 * 
 * Controlled by AI_PROVIDER env var: "ollama" | "openrouter"
 */
const ollamaService = require('./ollamaService');
const openRouterService = require('./openRouterService');

class AIProvider {
  constructor() {
    this.currentProvider = process.env.AI_PROVIDER || 'ollama';
    this.isCloud = this.currentProvider === 'openrouter' || !!process.env.OPENROUTER_API_KEY;
  }

  /**
   * Get the active provider name
   */
  getProvider() {
    // Auto-detect: if running on Render/Railway, prefer OpenRouter
    if (process.env.RENDER || process.env.RAILWAY_SERVICE_ID) {
      this.currentProvider = 'openrouter';
      this.isCloud = true;
    }
    return this.currentProvider;
  }

  /**
   * Generate a response (routes to correct provider)
   */
  async generateSystemPrompt(systemPrompt, userMessage, options = {}) {
    this.getProvider();

    if (this.currentProvider === 'openrouter' && openRouterService.ready) {
      console.log('[AI] Using OpenRouter (cloud)');
      return await openRouterService.generate(systemPrompt, userMessage, options);
    }

    // Ollama: build full prompt from system + user message
    console.log('[AI] Using Ollama (local)');
    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
    return await ollamaService.generate(fullPrompt, options);
  }

  /**
   * Generate with a full prompt (for agent mode)
   */
  async generatePrompt(prompt, options = {}) {
    this.getProvider();

    if (this.currentProvider === 'openrouter' && openRouterService.ready) {
      console.log('[AI] Agent mode using OpenRouter (cloud)');
      return await openRouterService.generateWithPrompt(prompt, options);
    }

    console.log('[AI] Agent mode using Ollama (local)');
    return await ollamaService.generate(prompt, options);
  }

  /**
   * Health check for current provider
   */
  async healthCheck() {
    this.getProvider();

    if (this.currentProvider === 'openrouter') {
      return await openRouterService.healthCheck();
    }
    return await ollamaService.healthCheck();
  }

  /**
   * Get provider info for status endpoint
   */
  getInfo() {
    this.getProvider();
    return {
      provider: this.currentProvider,
      isCloud: this.isCloud,
      model: this.currentProvider === 'openrouter'
        ? openRouterService.model
        : process.env.OLLAMA_MODEL || 'llama3',
      ready: this.currentProvider === 'openrouter'
        ? openRouterService.ready
        : true  // Ollama is "ready" — will fallback gracefully
    };
  }
}

module.exports = new AIProvider();
