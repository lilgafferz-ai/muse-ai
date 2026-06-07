const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');
const execAsync = promisify(exec);

const MEDIA_EXTENSIONS = [
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a',
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm',
  '.m3u', '.m3u8', '.pls',
];

const MEDIA_KEYS = {
  play_pause: 0xB3,
  next_track: 0xB0,
  prev_track: 0xB1,
  stop: 0xB2,
  volume_up: 0xAF,
  volume_down: 0xAE,
  mute: 0xAD,
};

/**
 * Enhanced Media Tool — Play audio/video files AND control playback
 */
class MediaTool {
  constructor() {
    this.name = 'media';
    this.description = 'Play music/videos AND control playback (play/pause/next/prev/volume). Use "control" action for playback commands, "play" for opening files.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "play" (play a file), "control" (playback control), "open_folder" (open music folder), "playlist" (list playable files)'
      },
      command: {
        required: false,
        description: 'Control command (required for "control" action): "play_pause", "next", "prev", "stop", "volume_up", "volume_down", "mute"'
      },
      file: {
        required: false,
        description: 'Path to media file (required for play action)'
      },
      directory: {
        required: false,
        description: 'Directory to search or open'
      }
    };
  }

  async execute(params) {
    const { action, command, file, directory } = params;

    switch (action) {
      case 'play':
        return await this._playMedia(file);
      case 'control':
        return await this._controlPlayback(command);
      case 'open_folder':
        return await this._openFolder(directory);
      case 'playlist':
        return await this._listPlayable(directory);
      default:
        throw new Error(`Unknown action: ${action}. Use: play, control, open_folder, playlist`);
    }
  }

  async _playMedia(filePath) {
    if (!filePath) throw new Error('File path is required for play action');
    const resolvedPath = path.resolve(filePath);
    try {
      await execAsync(`start "" "${resolvedPath}"`);
      return { message: `Playing ${path.basename(resolvedPath)}`, file: resolvedPath };
    } catch (error) {
      throw new Error(`Cannot play media: ${error.message}`);
    }
  }

  /**
   * Control playback using PowerShell with C# P/Invoke for media keys.
   * Writes a temp .ps1 file to avoid breaking C# verbatim strings.
   */
  async _controlPlayback(command) {
    if (!command) throw new Error('Control command is required');
    const keyCode = MEDIA_KEYS[command];
    if (!keyCode) {
      throw new Error(`Unknown control command: ${command}`);
    }

    const psScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MediaKey {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Send(byte key) {
        keybd_event(key, 0, 0, UIntPtr.Zero);
        keybd_event(key, 0, 2, UIntPtr.Zero);
    }
}
"@
[MediaKey]::Send(0x${keyCode.toString(16)})
`;

    // Write to temp file and execute (preserves newlines for C# verbatim strings)
    const tmpFile = path.join(os.tmpdir(), `muse_media_${Date.now()}.ps1`);
    try {
      fs.writeFileSync(tmpFile, psScript, 'utf-8');
      await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }

    const commandLabels = {
      play_pause: 'Play/Pause toggled',
      next: 'Skipped to next track',
      prev: 'Went to previous track',
      stop: 'Playback stopped',
      volume_up: 'Volume increased',
      volume_down: 'Volume decreased',
      mute: 'Audio muted/unmuted',
    };

    return { message: commandLabels[command] || `Sent ${command} command`, command };
  }

  async _openFolder(dirPath) {
    const targetDir = dirPath || path.join(os.homedir(), 'Music');
    try {
      const resolvedPath = path.resolve(targetDir);
      await execAsync(`start "" "${resolvedPath}"`);
      return { message: `Opened folder: ${targetDir}`, directory: targetDir };
    } catch (error) {
      throw new Error(`Cannot open folder: ${error.message}`);
    }
  }

  async _listPlayable(dirPath) {
    const targetDir = dirPath || '.';
    try {
      const files = await fs.promises.readdir(targetDir);
      const mediaFiles = files.filter(f => MEDIA_EXTENSIONS.includes(path.extname(f).toLowerCase()));
      return { directory: targetDir, files: mediaFiles.slice(0, 30), count: mediaFiles.length, total: files.length };
    } catch (error) {
      throw new Error(`Cannot scan directory: ${error.message}`);
    }
  }
}

module.exports = { MediaTool };
