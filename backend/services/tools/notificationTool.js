const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Notification Tool — Send desktop notifications and speak alerts
 * Uses temp .ps1 files for safe PowerShell execution (avoids injection)
 */
class NotificationTool {
  constructor() {
    this.name = 'notification';
    this.description = 'Send desktop notifications and speak text alerts. Use for reminders, notifications, alarms, and spoken messages.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "notify" (desktop notification), "speak" (TTS alert), "remind" (set timer reminder)'
      },
      title: {
        required: false,
        description: 'Notification title (for notify action)'
      },
      message: {
        required: true,
        description: 'The notification or speech content'
      },
      delay: {
        required: false,
        description: 'Delay in seconds before sending (for remind action, default: 0)'
      }
    };
    this._notifier = null;
  }

  /**
   * Lazy-load node-notifier so missing dependency doesn't break other features
   */
  _getNotifier() {
    if (!this._notifier) {
      try {
        this._notifier = require('node-notifier');
      } catch {
        return null;
      }
    }
    return this._notifier;
  }

  async execute(params) {
    const { action, title, message, delay } = params;

    switch (action) {
      case 'notify':
        return await this._sendNotification(title, message);
      case 'speak':
        return await this._speakText(message);
      case 'remind':
        return await this._setReminder(message, parseInt(delay) || 0);
      default:
        throw new Error(`Unknown action: ${action}. Use: notify, speak, remind`);
    }
  }

  async _sendNotification(title, message) {
    if (!message) throw new Error('Message is required');

    const notifier = this._getNotifier();
    if (!notifier) {
      // Fallback: use PowerShell popup
      const psScript = `
        (New-Object -ComObject WScript.Shell).Popup("${message.replace(/"/g, '`"').replace(/\n/g, ' ')}", 5, "${(title || 'Nexora').replace(/"/g, '`"')}", 64)
      `;
      const tmpFile = path.join(os.tmpdir(), `muse_notify_${Date.now()}.ps1`);
      try {
        fs.writeFileSync(tmpFile, psScript, 'utf-8');
        await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`);
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
      return { message: `Notification sent: ${message}`, sent: true, method: 'fallback' };
    }

    return new Promise((resolve, reject) => {
      notifier.notify({
        title: title || 'Nexora',
        message: message,
        sound: true,
        wait: false,
        appID: 'Nexora',
      }, (err) => {
        if (err) reject(new Error(`Notification failed: ${err.message}`));
        else resolve({ message: `Notification sent: ${message}`, sent: true });
      });
    });
  }

  async _speakText(text) {
    if (!text) throw new Error('Text is required for speak action');

    // Safe: write to temp .ps1 file to avoid shell injection
    const psScript = `
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.Speak(@'
${text.replace(/'/g, "''")}
'@)
`;
    const tmpFile = path.join(os.tmpdir(), `muse_speak_${Date.now()}.ps1`);
    try {
      fs.writeFileSync(tmpFile, psScript, 'utf-8');
      // Fire and forget — don't block the response
      execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`).catch(() => {});
      return { message: `Speaking: ${text.slice(0, 100)}`, spoken: true };
    } catch (error) {
      throw new Error(`Speech failed: ${error.message}`);
    } finally {
      // Clean up temp file after a short delay (give time for PS to load it)
      setTimeout(() => {
        try { fs.unlinkSync(tmpFile); } catch {}
      }, 5000);
    }
  }

  async _setReminder(message, delaySeconds) {
    if (!message) throw new Error('Message is required');

    setTimeout(() => {
      this._sendNotification('Nexora Reminder', message).catch(() => {});
      this._speakText(`Reminder: ${message}`).catch(() => {});
    }, delaySeconds * 1000);

    const when = delaySeconds > 0 
      ? `in ${delaySeconds >= 60 ? Math.round(delaySeconds / 60) + ' minutes' : delaySeconds + ' seconds'}`
      : 'now';
    
    return { message: `Reminder set for ${when}: ${message}`, scheduledIn: delaySeconds };
  }
}

module.exports = { NotificationTool };
