const { SYSTEM_PROMPT } = require('../prompts/systemPrompt');

class ContextBuilder {
  /**
   * Build the full prompt context for the AI model
   */
  buildPrompt(userMessage, memories, personality, recentChats) {
    const memoryContext = this._buildMemoryContext(memories);
    const personalityContext = this._buildPersonalityContext(personality);
    const chatHistory = this._buildChatHistory(recentChats);

    return {
      system: SYSTEM_PROMPT,
      prompt: this._assemblePrompt({
        memoryContext,
        personalityContext,
        chatHistory,
        userMessage
      })
    };
  }

  _buildMemoryContext(memories) {
    if (!memories || memories.length === 0) return '';

    const memoryLines = memories.map(m => {
      let context = m.context ? ` (${m.context})` : '';
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

  _assemblePrompt({ memoryContext, personalityContext, chatHistory, userMessage }) {
    let prompt = '';

    if (memoryContext) prompt += `${memoryContext}\n`;
    if (personalityContext) prompt += `${personalityContext}\n`;
    if (chatHistory) prompt += `\nRECENT CONVERSATION:\n${chatHistory}\n\n`;

    prompt += `RED: ${userMessage}\n\nMUSE:`;

    return prompt;
  }
}

module.exports = new ContextBuilder();
