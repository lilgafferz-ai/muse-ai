const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Input Tool — Simulate typing and keyboard input on the device
 * Uses PowerShell SendKeys for reliable Windows keyboard automation
 */
class InputTool {
  constructor() {
    this.name = 'input';
    this.description = 'Type text, press keys, or send keyboard shortcuts. Use for typing into text fields, sending keyboard commands, etc.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "type" (type text), "key" (press a key combo like Ctrl+S), "write_file" (write text directly to file instead of simulating typing)'
      },
      text: {
        required: false,
        description: 'Text to type (required for type action). Use \\n for newlines.'
      },
      keys: {
        required: false,
        description: 'Key combination to press (required for key action). Examples: "Ctrl+S", "Alt+Tab", "Enter", "Escape"'
      },
      file: {
        required: false,
        description: 'File path to write to (for write_file action)'
      },
      delay: {
        required: false,
        description: 'Delay in ms between keystrokes (default: 10)'
      }
    };
  }

  async execute(params) {
    const { action, text, keys, file, delay } = params;

    switch (action) {
      case 'type':
        return await this._typeText(text, delay);
      case 'key':
        return await this._pressKey(keys);
      case 'write_file':
        return await this._writeToFile(text, file);
      default:
        throw new Error(`Unknown action: ${action}. Use: type, key, write_file`);
    }
  }

  /**
   * Type text using PowerShell SendKeys
   */
  async _typeText(text, delay = 10) {
    if (!text) throw new Error('Text is required for type action');

    // Escape special characters for PowerShell
    const escaped = text
      .replace(/`/g, '``')
      .replace(/\$/g, '`$')
      .replace(/\n/g, '{Enter}')
      .replace(/\r/g, '')
      .replace(/\t/g, '{Tab}')
      .replace(/\{/g, '{{}')
      .replace(/\}/g, '{}}');

    const psScript = `
      $text = '${escaped}'
      $wshell = New-Object -ComObject wscript.shell
      $wshell.AppActivate((Get-Process | Where { $_.MainWindowTitle -ne '' } | Select -First 1).MainWindowTitle)
      Start-Sleep -Milliseconds 200
      $wshell.SendKeys($text)
    `;

    await execAsync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`);
    return { message: `Typed ${text.length} characters`, textLength: text.length };
  }

  /**
   * Press a key combination
   */
  async _pressKey(keys) {
    if (!keys) throw new Error('Key combo is required for key action');

    // Map common key names to SendKeys format
    const keyMap = {
      'enter': '{Enter}',
      'escape': '{Esc}',
      'tab': '{Tab}',
      'backspace': '{BackSpace}',
      'delete': '{Del}',
      'up': '{Up}',
      'down': '{Down}',
      'left': '{Left}',
      'right': '{Right}',
      'home': '{Home}',
      'end': '{End}',
      'pageup': '{PgUp}',
      'pagedown': '{PgDn}',
      'space': ' ',
      'ctrl': '^',
      'alt': '%',
      'shift': '+',
      'windows': '#',
    };

    // Parse key combination like "Ctrl+S" or "Alt+Tab"
    const parts = keys.split('+').map(k => k.trim().toLowerCase());
    let sendKeysStr = '';

    for (const part of parts) {
      if (keyMap[part]) {
        sendKeysStr += keyMap[part];
      } else if (part.length === 1) {
        sendKeysStr += part.toUpperCase();
      } else {
        // Try as a literal key name
        sendKeysStr += `{${part.charAt(0).toUpperCase() + part.slice(1)}}`;
      }
    }

    const psScript = `
      $wshell = New-Object -ComObject wscript.shell
      $wshell.AppActivate((Get-Process | Where { $_.MainWindowTitle -ne '' } | Select -First 1).MainWindowTitle)
      Start-Sleep -Milliseconds 200
      $wshell.SendKeys('${sendKeysStr.replace(/'/g, "''")}')
    `;

    await execAsync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`);
    return { message: `Pressed keys: ${keys}`, keys };
  }

  /**
   * Direct file write (faster than simulated typing)
   */
  async _writeToFile(text, filePath) {
    if (!filePath) throw new Error('File path is required for write_file action');
    if (!text) throw new Error('Text is required for write_file action');

    const fs = require('fs').promises;
    await fs.mkdir(require('path').dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, text, 'utf-8');

    return { message: `Written ${text.length} characters to ${filePath}`, file: filePath };
  }
}

module.exports = { InputTool };
