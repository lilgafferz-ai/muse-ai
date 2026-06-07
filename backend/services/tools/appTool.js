const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');
const execAsync = promisify(exec);

class AppTool {
  constructor() {
    this.name = 'app';
    this.description = 'Open, close, minimize applications on the device. Use for launching apps like Chrome, Notepad, Spotify, and closing or minimizing them.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "open" (launch app), "close" (kill process), "minimize" (minimize window), "list_running" (list processes)'
      },
      name: {
        required: false,
        description: 'Application name (required for open/close/minimize)'
      },
      args: {
        required: false,
        description: 'Command-line arguments when opening an app'
      }
    };
  }

  async execute(params) {
    const { action, name, args } = params;
    switch (action) {
      case 'open': return await this._openApp(name, args);
      case 'close': return await this._closeApp(name);
      case 'minimize': return await this._minimizeApp(name);
      case 'list_running': return await this._listRunning();
      default: throw new Error(`Unknown action: ${action}. Use: open, close, minimize, list_running`);
    }
  }

  async _openApp(name, args) {
    if (!name) throw new Error('Application name is required');
    const knownApps = {
      'notepad': 'notepad.exe', 'chrome': 'chrome.exe',
      'firefox': 'firefox.exe', 'edge': 'msedge.exe',
      'explorer': 'explorer.exe', 'calculator': 'calc.exe',
      'cmd': 'cmd.exe', 'terminal': 'wt.exe',
      'spotify': 'spotify.exe', 'code': 'code.exe',
      'vscode': 'code.exe', 'paint': 'mspaint.exe',
      'task manager': 'taskmgr.exe', 'settings': 'ms-settings:',
    };
    const appPath = knownApps[name.toLowerCase()] || name;
    const cmd = args ? `start "" "${appPath}" ${args}` : `start "" "${appPath}"`;
    await execAsync(cmd);
    return { message: `Opened ${name}`, app: name };
  }

  async _closeApp(name) {
    if (!name) throw new Error('Application name is required');
    const processName = name.endsWith('.exe') ? name : `${name}.exe`;
    await execAsync(`taskkill /f /im ${processName} 2>nul || taskkill /f /im ${name} 2>nul`);
    return { message: `Closed ${name}`, app: name };
  }

  /**
   * Minimize using ShowWindow P/Invoke via temp PowerShell file
   */
  async _minimizeApp(name) {
    if (!name) throw new Error('Application name is required');

    const psScript = `
$sig = @'
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
'@
Add-Type -MemberDefinition $sig -Name Win32Window -Namespace Win32
$procs = Get-Process | Where-Object { $_.ProcessName -eq '${name}' -and $_.MainWindowHandle -ne 0 }
if ($procs.Count -eq 0) {
  $procs = Get-Process | Where-Object { $_.ProcessName -like '*${name}*' -and $_.MainWindowHandle -ne 0 }
}
$count = 0
foreach ($p in $procs) {
  [Win32.Win32Window]::ShowWindow($p.MainWindowHandle, 6)
  $count++
}
Write-Output "Minimized $count window(s)"
`;

    const tmpFile = path.join(os.tmpdir(), `muse_app_${Date.now()}.ps1`);
    try {
      fs.writeFileSync(tmpFile, psScript, 'utf-8');
      await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }

    return { message: `Minimized ${name}`, app: name };
  }

  async _listRunning() {
    const { stdout } = await execAsync('tasklist /fo csv /nh');
    const lines = stdout.trim().split('\n').slice(0, 30);
    const processes = lines.map(line => {
      const parts = line.replace(/"/g, '').split(',');
      return { name: parts[0], pid: parts[1], memory: parts[4] };
    });
    return { processes, count: processes.length };
  }
}

module.exports = { AppTool };
