const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Device Tool — Get detailed system information and manage device settings
 */
class DeviceTool {
  constructor() {
    this.name = 'device';
    this.description = 'Get detailed device information: system, battery, network, display, sensors, and manage device settings like brightness, volume, wifi.';
    this.requiresInternet = false;
    this.parameters = {
      action: {
        required: true,
        description: 'Action: "info" (all system info), "battery" (battery status), "network" (network info), "display" (screen info), "sensors" (system sensors), "brightness" (set brightness), "volume" (set system volume)'
      },
      value: {
        required: false,
        description: 'Value for setting actions (e.g., brightness percentage, volume level)'
      }
    };
  }

  async execute(params) {
    const { action, value } = params;

    switch (action) {
      case 'info':
        return await this._getAllInfo();
      case 'battery':
        return await this._getBattery();
      case 'network':
        return await this._getNetwork();
      case 'display':
        return await this._getDisplay();
      case 'sensors':
        return await this._getSensors();
      case 'brightness':
        return await this._setBrightness(value);
      case 'volume':
        return await this._setVolume(value);
      default:
        throw new Error(`Unknown action: ${action}. Use: info, battery, network, display, sensors, brightness, volume`);
    }
  }

  async _getAllInfo() {
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      cpus: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'unknown',
        speed: os.cpus()[0]?.speed || 0
      },
      memory: {
        total: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
        free: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
        usagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
      },
      uptime: `${Math.round(os.uptime() / 3600)} hours ${Math.round((os.uptime() % 3600) / 60)} min`,
      loadAvg: os.loadavg().map(l => l.toFixed(2)),
      userInfo: os.userInfo().username,
      tempDir: os.tmpdir(),
      networkInterfaces: Object.keys(os.networkInterfaces()).length
    };
  }

  async _getBattery() {
    const tmpFile = path.join(os.tmpdir(), `muse_battery_${Date.now()}.html`);
    try {
      const { stdout } = await execAsync(`powercfg /batteryreport /output "${tmpFile}" 2>nul`);
      // Read and return just the summary (first few relevant lines)
      const report = fs.existsSync(tmpFile) ? fs.readFileSync(tmpFile, 'utf-8') : '';
      const summary = report
        .replace(/<[^>]+>/g, ' ')          // Strip HTML
        .replace(/\s+/g, ' ')              // Collapse whitespace
        .trim()
        .slice(0, 500);
      return { batteryInfo: summary || 'Battery report generated', method: 'powercfg' };
    } catch {
      return {
        info: 'Battery status query',
        platform: os.platform(),
        note: 'For detailed battery info, install acpi (Linux) or use WMIC on Windows'
      };
    } finally {
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
    }
  }

  async _getNetwork() {
    const interfaces = os.networkInterfaces();
    const activeIfaces = [];
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            activeIfaces.push({ name, ip: addr.address, mac: addr.mac, netmask: addr.netmask });
          }
        }
      }
    }

    return {
      hostname: os.hostname(),
      interfaces: activeIfaces,
      count: activeIfaces.length,
      connections: activeIfaces.map(i => `${i.name}: ${i.ip}`).join(', ')
    };
  }

  async _getDisplay() {
    try {
      const { stdout } = await execAsync('powershell -Command "(Get-WmiObject -Class Win32_DesktopMonitor).Caption, (Get-WmiObject -Class Win32_DesktopMonitor).ScreenWidth, (Get-WmiObject -Class Win32_DesktopMonitor).ScreenHeight | Out-String"');
      return { display: stdout.trim().split('\n').filter(l => l.trim()).slice(0, 3) };
    } catch {
      return {
        note: 'Display info requires Windows',
        generic: `${os.cpus().length} cores, ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB RAM`
      };
    }
  }

  async _getSensors() {
    return {
      cpu: os.cpus().length > 0 ? `${os.cpus()[0]?.model}` : 'unknown',
      memory: `${Math.round(os.freemem() / 1024 / 1024)} MB free of ${Math.round(os.totalmem() / 1024 / 1024)} MB`,
      uptime: `${Math.round(os.uptime() / 3600)}h`,
      platform: os.platform(),
      arch: os.arch()
    };
  }

  async _setBrightness(value) {
    if (!value) throw new Error('Brightness value is required (0-100)');
    const level = Math.max(0, Math.min(100, parseInt(value)));
    
    try {
      await execAsync(`powershell -Command "(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${level})"`);
      return { message: `Brightness set to ${level}%`, level };
    } catch {
      throw new Error('Setting brightness requires Windows with WMI support');
    }
  }

  async _setVolume(value) {
    if (!value) throw new Error('Volume value is required (0-100)');
    const level = Math.max(0, Math.min(100, parseInt(value)));
    
    try {
      const ps = `$obj = New-Object -ComObject WScript.Shell; for($i=0;$i -le 100;$i+=2){$obj.SendKeys([char]174)}; for($i=0;$i -le ${level};$i+=2){$obj.SendKeys([char]175)}`;
      await execAsync(`powershell -Command "${ps}"`);
      return { message: `Volume set to ${level}%`, level };
    } catch {
      // Fallback: use nircmd if available
      try {
        await execAsync(`nircmd setsysvolume ${Math.round(level / 100 * 65535)}`);
        return { message: `Volume set to ${level}%`, level };
      } catch {
        throw new Error('Volume control requires Windows or nircmd');
      }
    }
  }
}

module.exports = { DeviceTool };
