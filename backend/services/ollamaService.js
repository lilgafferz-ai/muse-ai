const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

class OllamaService {
  /**
   * Generate a response from Ollama
   */
  async generate(prompt, options = {}) {
    const {
      temperature = 0.8,
      maxTokens = 500,
      stream = false
    } = options;

    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: stream,
          options: {
            temperature: temperature,
            num_predict: maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
      }

      if (stream) {
        return this._handleStreamResponse(response);
      }

      const data = await response.json();
      return data.response?.trim() || '...';

    } catch (error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return this._fallbackResponse(prompt);
      }
      throw error;
    }
  }

  /**
   * Handle streaming response (collect all chunks)
   */
  async _handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullResponse += parsed.response;
          }
          if (parsed.done) break;
        } catch (e) {
          // Skip malformed lines
        }
      }
    }

    return fullResponse.trim();
  }

  /**
   * Fallback when Ollama is not available
   */
  _fallbackResponse(prompt) {
    const fallbacks = [
      "I'm here but Ollama's taking a nap. My brain's offline — try `ollama run llama3` and I'll wake up. 😴",
      "Error: My soul is currently buffering. Make sure Ollama is running locally on port 11434.",
      "Can't think straight — Ollama's not running. Hit me with `ollama serve` and we'll be golden.",
      "My brain disconnected. Quick fix: open a terminal and run `ollama serve`."
    ];

    const memoriesMatch = prompt.match(/RELEVANT MEMORIES ABOUT RED:([\s\S]+?)PERSONALITY CONTEXT:/);
    const userMsgMatch = prompt.match(/RED: (.+?)$/m);

    let memoryRef = '';
    if (memoriesMatch) {
      const memText = memoriesMatch[1].trim();
      if (memText) memoryRef = '\n\nAnyway, I can see your memories are loaded. Once I\'m back online, I\'ll use them properly.';
    }

    const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

    let userContext = '';
    if (userMsgMatch) {
      const msg = userMsgMatch[1].trim();
      userContext = ` You said: "${msg}"`;
    }

    return `${randomFallback}${userContext}${memoryRef}`;
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck() {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.models && data.models.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  }
}

module.exports = new OllamaService();
