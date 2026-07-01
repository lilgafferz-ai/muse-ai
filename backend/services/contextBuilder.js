const { SYSTEM_PROMPT } = require('../prompts/systemPrompt');

// Condensed NEXORA Reasoning Core principles injected into every system prompt.
// Full version lives in the AI OS spec; this is the operational distillation.
const REASONING_CORE = `Reasoning rules: Clearly distinguish what you know from what you infer. Never fabricate facts — say "I don't know" honestly. Think step-by-step before answering complex questions. Be epistemically honest about uncertainty.`;

class ContextBuilder {
  /**
   * Build the full prompt context for the AI model.
   *
   * @param {string} userMessage
   * @param {Array}  memories       - Memory documents from MongoDB
   * @param {Object} personality    - Personality document
   * @param {Array}  recentChats    - Recent Chat documents
   * @param {Object} options        - Optional: { activeProject, reasoningMode }
   * @returns {{ system: string, prompt: string }}
   */
  buildPrompt(userMessage, memories, personality, recentChats, options = {}) {
    const { activeProject, reasoningMode } = options;

    const memoryContext      = this._buildMemoryContext(memories);
    const personalityContext = this._buildPersonalityContext(personality);
    const chatHistory        = this._buildChatHistory(recentChats);
    const projectContext     = this._buildProjectContext(activeProject);

    // Append Reasoning Core + optional active-project note to the base system prompt
    let system = SYSTEM_PROMPT + '\n\n' + REASONING_CORE;
    if (projectContext) system += `\n\n${projectContext}`;

    return {
      system,
      prompt: this._assemblePrompt({
        memoryContext,
        personalityContext,
        chatHistory,
        userMessage
      })
    };
  }

  /**
   * Reasoning-context variant — same as buildPrompt but structures the prompt
   * with explicit chain-of-thought markers to encourage step-by-step reasoning.
   *
   * @returns {{ system: string, prompt: string, reasoning_mode: true }}
   */
  buildReasoningContext(userMessage, memories, personality, recentChats, options = {}) {
    const { activeProject } = options;

    const memoryContext      = this._buildMemoryContext(memories);
    const personalityContext = this._buildPersonalityContext(personality);
    const chatHistory        = this._buildChatHistory(recentChats);
    const projectContext     = this._buildProjectContext(activeProject);

    let system = SYSTEM_PROMPT + '\n\n' + REASONING_CORE;
    if (projectContext) system += `\n\n${projectContext}`;

    // Structured chain-of-thought prompt
    let prompt = '';

    prompt += `[GOAL]\nUnderstand and thoughtfully respond to Red's message.\n\n`;

    prompt += `[CONTEXT]\n`;
    if (projectContext) prompt += `${projectContext}\n`;
    if (personalityContext) prompt += `${personalityContext}\n`;
    prompt += '\n';

    if (memoryContext) {
      prompt += `[MEMORIES]\n${memoryContext}\n\n`;
    }

    if (chatHistory) {
      prompt += `[CONTEXT — RECENT CONVERSATION]\n${chatHistory}\n\n`;
    }

    prompt += `[REASONING]\nThink through what Red is asking, what you know, and the best way to help before answering.\n\n`;

    prompt += `[ANSWER]\nRED: ${userMessage}\n\nMUSE:`;

    return {
      system,
      prompt,
      reasoning_mode: true
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  _buildMemoryContext(memories) {
    if (!memories || memories.length === 0) return '';

    const memoryLines = memories.map(m => {
      const context = m.context ? ` (${m.context})` : '';
      return `- ${m.key}: ${m.value}${context}`;
    });

    return `\nRELEVANT MEMORIES ABOUT RED:\n${memoryLines.join('\n')}\n`;
  }

  _buildPersonalityContext(personality) {
    if (!personality) return '';

    const { traits, communicationStyle, nicknames } = personality;
    const parts = [];

    if (traits) {
      parts.push(`Current personality traits: wit=${traits.wit}/10, sarcasm=${traits.sarcasm}/10, empathy=${traits.empathy}/10, playfulness=${traits.playfulness}/10, warmth=${traits.warmth}/10`);
    }
    if (communicationStyle) {
      parts.push(`Communication style: ${communicationStyle}`);
    }
    if (nicknames && nicknames.length > 0) {
      const topNickname = nicknames.sort((a, b) => b.used - a.used)[0];
      parts.push(`Preferred nickname for Red: ${topNickname.name}`);
    }

    return parts.length > 0 ? `\nPERSONALITY CONTEXT:\n${parts.join('\n')}\n` : '';
  }

  _buildChatHistory(chats) {
    if (!chats || chats.length === 0) return '';

    return chats.slice(-6).map(c =>
      `${c.role === 'user' ? 'RED' : 'MUSE'}: ${c.content}`
    ).join('\n');
  }

  /**
   * Build a one-line active-project context note for the system prompt.
   * @param {Object|null} project - { title, description }
   */
  _buildProjectContext(project) {
    if (!project || !project.title) return '';
    const desc = project.description ? ` — ${project.description}` : '';
    return `Active Project: ${project.title}${desc}`;
  }

  _assemblePrompt({ memoryContext, personalityContext, chatHistory, userMessage }) {
    let prompt = '';

    if (memoryContext)      prompt += `${memoryContext}\n`;
    if (personalityContext) prompt += `${personalityContext}\n`;
    if (chatHistory)        prompt += `\nRECENT CONVERSATION:\n${chatHistory}\n\n`;

    prompt += `RED: ${userMessage}\n\nMUSE:`;

    return prompt;
  }
}

module.exports = new ContextBuilder();
