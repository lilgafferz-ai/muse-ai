const toolRegistry = require('./toolRegistry');
const connectivityMonitor = require('./connectivityMonitor');
const ollamaService = require('./ollamaService');
const { AGENT_PROMPT } = require('../prompts/agentPrompt');

/**
 * Agent Service — Manages Muse's agent capabilities
 * Routes user requests through: AI decides → executes tools → returns results
 */
class AgentService {
  /**
   * Process a message with full agent capabilities
   */
  async processMessage(userMessage, memories, personality, recentChats) {
    const isOnline = connectivityMonitor.isOnline;
    const toolDescriptions = toolRegistry.getToolDescriptions(isOnline);
    const toolCount = toolRegistry.getToolCount(isOnline);

    // Build agent prompt
    const systemPrompt = this._buildAgentPrompt(isOnline, toolDescriptions, toolCount);
    const conversationContext = this._buildContext(memories, personality, recentChats);

    // Full prompt for AI
    const fullPrompt = `${systemPrompt}\n\n${conversationContext}\n\nRed says: ${userMessage}\n\nWhat do you do, Muse?`;

    // Get AI response
    const response = await ollamaService.generate(fullPrompt, {
      temperature: 0.7,
      maxTokens: 500
    });

    // Parse and execute tool calls from the response
    const toolResults = await toolRegistry.executeAllCalls(response, isOnline);

    if (toolResults.length === 0) {
      // No tools used — Muse just replied normally
      return {
        response,
        usedTools: [],
        isAgent: false
      };
    }

    // Tools were used — give Muse the results and let it form a final response
    const resultContext = this._buildResultContext(toolResults);
    const finalPrompt = `${systemPrompt}\n\nYou used tools and got these results:\n${resultContext}\n\nTell Red what happened. Be natural about it — don't just list the tool outputs.`;

    const finalResponse = await ollamaService.generate(finalPrompt, {
      temperature: 0.7,
      maxTokens: 400
    });

    return {
      response: finalResponse,
      usedTools: toolResults,
      isAgent: true,
      mode: isOnline ? 'online' : 'offline'
    };
  }

  /**
   * Build the agent system prompt with tool descriptions
   */
  _buildAgentPrompt(isOnline, toolDescriptions, toolCount) {
    const mode = isOnline ? 'ONLINE' : 'OFFLINE';
    const modeDescription = isOnline
      ? 'You can search the web, read URLs, and make API calls.'
      : 'You can only use local tools (apps, files, system commands, keyboard input).';

    return `${AGENT_PROMPT}

CURRENT MODE: ${mode}
${modeDescription}

You have ${toolCount} tools available.
${toolDescriptions}

When Red asks you to DO something (open an app, type text, search the web, etc.), use the appropriate tool.
If Red just wants to chat, respond normally without using tools.

IMPORTANT: 
- Output [TOOL] blocks on their own lines
- You can use multiple tools if needed
- After using tools, tell Red what happened`;
  }

  /**
   * Build conversation context from memories and history
   */
  _buildContext(memories, personality, recentChats) {
    const parts = [];

    if (personality) {
      const { traits, communicationStyle } = personality;
      if (traits) {
        parts.push(`Personality: wit=${traits.wit}/10, sarcasm=${traits.sarcasm}/10, empathy=${traits.empathy}/10, playfulness=${traits.playfulness}/10`);
      }
      if (communicationStyle) {
        parts.push(`Style: ${communicationStyle}`);
      }
    }

    if (memories && memories.length > 0) {
      const memText = memories.map(m => `- ${m.key}: ${m.value}`).join('\n');
      parts.push(`\nRelevant memories:\n${memText}`);
    }

    if (recentChats && recentChats.length > 0) {
      const chatText = recentChats.slice(-4).map(c =>
        `${c.role === 'user' ? 'Red' : 'Muse'}: ${c.content}`
      ).join('\n');
      parts.push(`\nRecent conversation:\n${chatText}`);
    }

    return parts.join('\n');
  }

  /**
   * Build context string from tool results
   */
  _buildResultContext(toolResults) {
    return toolResults.map((r, i) => {
      if (r.success) {
        const output = typeof r.result === 'object'
          ? JSON.stringify(r.result, null, 2).slice(0, 1000)
          : r.result;
        return `[Result ${i + 1}] Tool: ${r.tool}\n${output}`;
      } else {
        return `[Result ${i + 1}] Tool: ${r.tool || 'unknown'} — ERROR: ${r.error}`;
      }
    }).join('\n\n');
  }

  /**
   * Check if a message looks like a command/task (vs casual chat)
   */
  isCommandRequest(message) {
    const cmdPatterns = [
      /^(open|launch|start|run|type|write|create|search|find|play)/i,
      /^(show|list|read|get|check|tell me about|what is)/i,
      /can you (open|type|search|find|play|write|create|run|launch)/i,
      /i need you to/i,
      /please (open|type|write|search|find|play)/i,
    ];
    return cmdPatterns.some(p => p.test(message.trim()));
  }
}

module.exports = new AgentService();
