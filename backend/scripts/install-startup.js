/**
 * Muse Auto-Start Installer
 * Registers the backend to start automatically with Windows
 * 
 * Usage:
 *   node scripts/install-startup.js       — Install startup
 *   node scripts/install-startup.js remove — Remove startup
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_NAME = 'MuseAI_Backend';
const PROJECT_DIR = path.resolve(__dirname, '..');
const NODE_PATH = process.execPath;
const SERVER_SCRIPT = path.join(PROJECT_DIR, 'server.js');

function getStartupScriptPath() {
  const startupDir = path.join(
    process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming'),
    'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
  );
  return path.join(startupDir, `${SCRIPT_NAME}.bat`);
}

function createStartupScript() {
  const scriptPath = getStartupScriptPath();
  const content = `@echo off
title Muse AI Backend
cd /d "${PROJECT_DIR}"
echo [Muse] Starting backend...
start /B "" "${NODE_PATH}" "${SERVER_SCRIPT}"
echo [Muse] Backend started in background.
`;

  try {
    const dir = path.dirname(scriptPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(scriptPath, content, 'utf-8');
    console.log(`[Muse] Startup script created: ${scriptPath}`);
    return true;
  } catch (error) {
    console.error(`[Muse] Failed to create startup script: ${error.message}`);
    return false;
  }
}

function removeStartupScript() {
  const scriptPath = getStartupScriptPath();
  try {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
      console.log(`[Muse] Startup script removed: ${scriptPath}`);
    } else {
      console.log('[Muse] No startup script found.');
    }
    return true;
  } catch (error) {
    console.error(`[Muse] Failed to remove startup script: ${error.message}`);
    return false;
  }
}

function createCloseShortcut() {
  // Create a script to easily stop Muse
  const stopScriptPath = path.join(PROJECT_DIR, 'stop-muse.bat');
  const content = `@echo off
echo Stopping Muse backend...
taskkill /f /fi "WINDOWTITLE eq Muse AI Backend*" 2>nul
taskkill /f /im node.exe /fi "WINDOWTITLE eq node*" 2>nul
echo Muse stopped.
pause
`;
  try {
    fs.writeFileSync(stopScriptPath, content, 'utf-8');
    console.log(`[Muse] Stop script created: ${stopScriptPath}`);
  } catch {}
}

// Main
const action = process.argv[2]?.toLowerCase();

if (action === 'remove' || action === 'uninstall') {
  removeStartupScript();
  console.log('[Muse] Auto-start removed. Restart to take effect.');
} else {
  const installed = createStartupScript();
  createCloseShortcut();

  if (installed) {
    console.log('[Muse] ✅ Auto-start installed!');
    console.log('[Muse] Backend will start automatically on next boot.');
    console.log('[Muse] To remove: node scripts/install-startup.js remove');
    console.log('[Muse] To stop: run stop-muse.bat');
  } else {
    console.log('[Muse] ❌ Auto-start installation failed.');
    process.exit(1);
  }
}
