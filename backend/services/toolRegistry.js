/**
 * Muse Agent Tool Registry
 * Manages tool registration, capability descriptions, and execution
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.initialized = false;
  }

  /**
   * Register all available tools
   */
  async initialize() {
    const { AppTool } = require('./tools/appTool');
    const { SystemTool } = require('./tools/systemTool');
    const { FileTool } = require('./tools/fileTool');
    const { InputTool } = require('./tools/inputTool');
    const { MediaTool } = require('./tools/mediaTool');
    const { BrowserTool } = require('./tools/browserTool');

    const tools = [
      new AppTool(),
      new SystemTool(),
      new FileTool(),
      new InputTool(),
      new MediaTool(),
      new BrowserTool(),
    ];

    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }

    this.initialized = true;
    console.log(`[ToolRegistry] Registered ${tools.length} tools`);
  }

  /**
   * Get tool descriptions formatted for the AI prompt
   */
  getToolDescriptions(isOnline = false) {
    const lines = [];
    lines.push('\n## AVAILABLE TOOLS');
    lines.push('You have the following tools available to interact with Red\'s device.');

    for (const [name, tool] of this.tools) {
      if (tool.requiresInternet && !isOnline) continue;

      lines.push(`\n### ${tool.name}`);
      lines.push(`Description: ${tool.description}`);
      lines.push(`Parameters:`);
      for (const [param, info] of Object.entries(tool.parameters)) {
        lines.push(`  - ${param} (${info.required ? 'required' : 'optional'}): ${info.description}`);
      }
    }

    lines.push(`\nTo use a tool, output exactly:\n[TOOL]\ntool: <tool_name>\nparam1: value1\nparam2: value2\n[/TOOL]\n\nThe tool will be executed and the result shown to you. You can chain multiple tools if needed.`);

    return lines.join('\n');
  }

  /**
   * Parse [TOOL] blocks from AI response
   */
  parseToolCalls(text) {
    const calls = [];
    const regex = /\[TOOL\]\s*([\s\S]*?)\[\/TOOL\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const block = match[1].trim();
      const lines = block.split('\n');
      const parsed = { tool: '', params: {} };

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim().toLowerCase();
        const value = line.slice(colonIndex + 1).trim();

        if (key === 'tool') {
          parsed.tool = value;
        } else if (key) {
          parsed.params[key] = value;
        }
      }

      if (parsed.tool) {
        calls.push(parsed);
      }
    }

    return calls;
  }

  /**
   * Execute a single tool call
   */
  async executeToolCall(toolCall, isOnline = false) {
    const { tool: toolName, params } = toolCall;
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}. Available: ${Array.from(this.tools.keys()).join(', ')}`
      };
    }

    if (tool.requiresInternet && !isOnline) {
      return {
        success: false,
        error: `Tool "${toolName}" requires internet connection, but device is offline.`
      };
    }

    try {
      console.log(`[Agent] Executing tool: ${toolName}`, params);
      const result = await tool.execute(params);
      return {
        success: true,
        tool: toolName,
        result: result
      };
    } catch (error) {
      console.error(`[Agent] Tool ${toolName} failed:`, error);
      return {
        success: false,
        tool: toolName,
        error: error.message
      };
    }
  }

  /**
   * Execute all tool calls found in text and return results
   */
  async executeAllCalls(text, isOnline = false) {
    const calls = this.parseToolCalls(text);
    const results = [];

    for (const call of calls) {
      const result = await this.executeToolCall(call, isOnline);
      results.push(result);
    }

    return results;
  }

  /**
   * Get total available tools count
   */
  getToolCount(isOnline = false) {
    let count = 0;
    for (const [, tool] of this.tools) {
      if (!tool.requiresInternet || isOnline) count++;
    }
    return count;
  }
}

module.exports = new ToolRegistry();
