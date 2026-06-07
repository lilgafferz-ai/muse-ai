const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const SAFE_DIRS = [
  process.env.USERPROFILE || process.env.HOME || 'C:\\',
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Documents'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Music'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Videos'),
  path.join(process.env.USERPROFILE || process.env.HOME || '', 'Pictures'),
];

/**
 * File Tool — Read, write, list, and search files on the device
 */
class FileTool {
  constructor() {
    this.name = 'file';
    this.description = 'Read, write, list, and search files on the device. Can read notes, configs, browse project files, etc.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "read", "write", "list", "search", "info"'
      },
      path: {
        required: false,
        description: 'File or directory path (required for read, write, list, info)'
      },
      content: {
        required: false,
        description: 'Content to write (required for write action)'
      },
      pattern: {
        required: false,
        description: 'Search pattern (required for search action, supports wildcards like *.txt)'
      },
      directory: {
        required: false,
        description: 'Directory to search in (for search action)'
      }
    };
  }

  async execute(params) {
    const { action, filePath, content, pattern, directory } = params;
    const targetPath = filePath || params.path;

    switch (action) {
      case 'read':
        return await this._readFile(targetPath);
      case 'write':
        return await this._writeFile(targetPath, content);
      case 'list':
        return await this._listDir(targetPath);
      case 'search':
        return await this._searchFiles(pattern, directory);
      case 'info':
        return await this._fileInfo(targetPath);
      default:
        throw new Error(`Unknown action: ${action}. Use: read, write, list, search, info`);
    }
  }

  async _readFile(filePath) {
    if (!filePath) throw new Error('File path is required');
    try {
      const resolvedPath = path.resolve(filePath);
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const lines = content.split('\n');
      return {
        file: filePath,
        size: content.length,
        lines: lines.length,
        content: content.slice(0, 3000) // Limit to first 3000 chars
      };
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`File not found: ${filePath}`);
      throw new Error(`Cannot read file: ${error.message}`);
    }
  }

  async _writeFile(filePath, content) {
    if (!filePath) throw new Error('File path is required');
    if (content === undefined || content === null) throw new Error('Content is required');

    try {
      const resolvedPath = path.resolve(filePath);
      // Only allow writes to safe directories + the project directory
      const projectDir = path.resolve(process.cwd());
      const isInSafeDir = SAFE_DIRS.some(dir => resolvedPath.startsWith(dir));
      const isInProject = resolvedPath.startsWith(projectDir);

      if (!isInSafeDir && !isInProject) {
        throw new Error(`Writing to "${filePath}" is not allowed. Files can only be written to: Desktop, Documents, Downloads, or the project directory.`);
      }

      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      await fs.writeFile(resolvedPath, content, 'utf-8');
      return { message: `Written to ${filePath}`, size: content.length };
    } catch (error) {
      if (error.message.includes('not allowed')) throw error;
      throw new Error(`Cannot write file: ${error.message}`);
    }
  }

  async _listDir(dirPath) {
    const targetDir = dirPath || '.';
    try {
      const resolvedPath = path.resolve(targetDir);
      const items = await fs.readdir(resolvedPath);
      const details = [];

      for (const item of items.slice(0, 50)) {
        try {
          const stat = await fs.stat(path.join(resolvedPath, item));
          details.push({
            name: item,
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.isDirectory() ? null : stat.size,
            modified: stat.mtime
          });
        } catch {
          details.push({ name: item, type: 'unknown' });
        }
      }

      return {
        directory: targetDir,
        items: details,
        count: details.length,
        total: items.length
      };
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Directory not found: ${targetDir}`);
      throw new Error(`Cannot list directory: ${error.message}`);
    }
  }

  async _searchFiles(pattern, directory) {
    if (!pattern) throw new Error('Search pattern is required');

    const searchDir = directory || '.';
    try {
      // Use PowerShell for recursive file search
      const psCommand = `Get-ChildItem -Path "${searchDir}" -Recurse -Filter "${pattern}" -ErrorAction SilentlyContinue | Select-Object FullName, Length, LastWriteTime | ConvertTo-Json`;
      const { stdout } = await execAsync(`powershell -Command "${psCommand}"`);
      
      let results;
      try {
        results = JSON.parse(stdout);
      } catch {
        results = [];
      }

      if (!Array.isArray(results)) results = [results];

      return {
        pattern,
        directory: searchDir,
        matches: results.slice(0, 30).map(r => ({
          path: r.FullName,
          size: r.Length,
          modified: r.LastWriteTime
        })),
        count: Math.min(results.length, 30),
        total: results.length
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async _fileInfo(filePath) {
    if (!filePath) throw new Error('File path is required');
    try {
      const resolvedPath = path.resolve(filePath);
      const stat = await fs.stat(resolvedPath);
      return {
        file: filePath,
        type: stat.isDirectory() ? 'directory' : 'file',
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime,
        accessed: stat.atime,
        permissions: stat.mode.toString(8).slice(-3)
      };
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Not found: ${filePath}`);
      throw new Error(`Cannot get info: ${error.message}`);
    }
  }
}

module.exports = { FileTool };
