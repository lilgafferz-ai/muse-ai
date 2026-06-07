const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

// Commands that are safe to run without restrictions
const ALLOWED_PREFIXES = [
  'dir', 'ls', 'echo', 'type', 'find', 'findstr',
  'where', 'which', 'systeminfo', 'ver', 'whoami',
  'tasklist', 'ipconfig', 'ping', 'tracert',
  'netstat', 'nslookup', 'date', 'time',
  'cd', 'pwd', 'get-childitem', 'get-process',
  'get-service', 'get-location',
];

// Commands that are NEVER allowed
const BLOCKED_COMMANDS = [
  'format', 'del /f', 'rd /s', 'rmdir /s', 'rm -rf',
  'shutdown', 'restart-computer', 'stop-computer',
  'net user', 'net localgroup', 'net group',
  'reg delete', 'reg add', 'diskpart',
];

/**
 * System Tool — Execute shell commands with safety guardrails
 */
class SystemTool {
  constructor() {
    this.name = 'system';
    this.description = 'Run system commands safely. Use for getting system info, checking processes, network diagnostics, etc.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: false,
        description: 'Use "info" to get system info without a command'
      },
      command: {
        required: true,
        description: 'The command to execute (safe commands only)'
      },
      shell: {
        required: false,
        description: 'Shell to use: "cmd" (default) or "powershell"'
      }
    };
  }

  async execute(params) {
    const { action, command, shell = 'cmd' } = params;

    // System info action (no command needed)
    if (action === 'info') {
      return await this.getSystemInfo();
    }

    if (!command || !command.trim()) {
      throw new Error('Command is required');
    }

    // Safety checks
    const cmdLower = command.toLowerCase().trim();

    for (const blocked of BLOCKED_COMMANDS) {
      if (cmdLower.startsWith(blocked)) {
        throw new Error(`Command "${command}" is blocked for security reasons.`);
      }
    }

    const isAllowed = ALLOWED_PREFIXES.some(prefix => cmdLower.startsWith(prefix));
    if (!isAllowed) {
      // For unlisted commands, warn but allow (user can confirm)
      return {
        warning: `Command "${command}" is not in the safe list. Review before executing.`,
        command: command,
        needsConfirmation: true,
        preview: `Would run: ${command}`
      };
    }

    // Execute command
    try {
      let cmd = command;
      if (shell === 'powershell') {
        cmd = `powershell -Command "${command.replace(/"/g, '\\"')}"`;
      }

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });

      const output = stdout.trim() || stderr.trim() || '(no output)';

      return {
        command,
        output: output.slice(0, 2000),
        shell
      };
    } catch (error) {
      if (error.killed) {
        throw new Error('Command timed out after 10 seconds');
      }
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  /**
   * Get system information summary
   */
  async getSystemInfo() {
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
      uptime: `${Math.round(os.uptime() / 60 / 60)} hours`,
      type: os.type(),
      release: os.release()
    };
  }
}

module.exports = { SystemTool };
