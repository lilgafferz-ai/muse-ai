const dns = require('dns');
const { EventEmitter } = require('events');

/**
 * Connectivity Monitor — Detects online/offline state
 * Pings common services to determine if the device has internet access
 */
class ConnectivityMonitor extends EventEmitter {
  constructor() {
    super();
    this.isOnline = false;
    this.checked = false;
    this.checkInterval = null;
    this.checkIntervalMs = 30000; // Check every 30 seconds
    this.PING_HOSTS = [
      'google.com',
      'cloudflare.com',
      '1.1.1.1'
    ];
  }

  /**
   * Start monitoring connectivity
   */
  start() {
    this._check();
    this.checkInterval = setInterval(() => this._check(), this.checkIntervalMs);
    console.log('[Connectivity] Monitor started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check internet connectivity
   */
  async _check() {
    const wasOnline = this.isOnline;

    for (const host of this.PING_HOSTS) {
      try {
        await new Promise((resolve, reject) => {
          dns.resolve(host, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        this.isOnline = true;
        this.checked = true;

        if (wasOnline !== this.isOnline) {
          console.log('[Connectivity] Now online');
          this.emit('online');
        }
        return;
      } catch {
        continue;
      }
    }

    this.isOnline = false;
    this.checked = true;

    if (wasOnline !== this.isOnline) {
      console.log('[Connectivity] Now offline');
      this.emit('offline');
    }
  }

  /**
   * Quick check — returns current cached status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      checked: this.checked,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Force a fresh check
   */
  async forceCheck() {
    await this._check();
    return this.getStatus();
  }
}

module.exports = new ConnectivityMonitor();
