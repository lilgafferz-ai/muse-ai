/**
 * OpenRouter AI Service
 * Cloud-based LLM fallback when Ollama is not available.
 * Uses free models: Llama 3, DeepSeek, Mistral
 */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',   // big, genuinely engaging — best free default
  'deepseek/deepseek-chat:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
];

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || FREE_MODELS[0];
    this.ready = !!this.apiKey;
  }

  /**
   * Generate a response from OpenRouter
   */
  async generate(systemPrompt, userMessage, options = {}) {
    const { temperature = 0.8, maxTokens = 500 } = options;

    if (!this.apiKey) {
      return this._noKeyFallback(userMessage);
    }

    try {
      const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://nexora.app',
          'X-Title': 'Nexora'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || '...';

    } catch (error) {
      console.error('[OpenRouter] Error:', error.message);
      return this._errorFallback(error.message);
    }
  }

  /**
   * Generate with full prompt (for agent mode)
   */
  async generateWithPrompt(prompt, options = {}) {
    const { temperature = 0.7, maxTokens = 500 } = options;

    if (!this.apiKey) {
      return this._noKeyFallback(prompt);
    }

    try {
      const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://nexora.app',
          'X-Title': 'Nexora'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || '...';

    } catch (error) {
      console.error('[OpenRouter] Error:', error.message);
      return this._errorFallback(error.message);
    }
  }

  /**
   * Fallback when no API key is configured
   */
  _noKeyFallback(content) {
    return `⚠️ Nexora is in cloud mode but no OpenRouter API key is configured.\n\nTo use Nexora in the cloud:\n1. Go to https://openrouter.ai/keys\n2. Create a free API key\n3. Set it as OPENROUTER_API_KEY in your Render environment variables\n4. Redeploy\n\n${content ? `You said: "${content.slice(0, 100)}"` : ''}`;
  }

  /**
   * Error fallback
   */
  _errorFallback(errorMsg) {
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      return '⚠️ OpenRouter rate limit hit. Free tier: 50 requests/day. Try again later or add credits to your account.';
    }
    return `⚠️ Nexora's cloud brain is buffering. Error: ${errorMsg.slice(0, 100)}`;
  }

  /**
   * Check if the service is available
   */
  async healthCheck() {
    if (!this.apiKey) return false;
    try {
      const response = await fetch(`${OPENROUTER_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

module.exports = new OpenRouterService();
