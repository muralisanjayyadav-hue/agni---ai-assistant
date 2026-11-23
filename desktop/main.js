'use strict';
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const cfg = require('./config');
const { registerSystemIpc } = require('./system-ipc');

// Desktop Voice & Mic Flags
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-features', 'MediaStreamTrack,SpeechRecognition');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const START_URL = (app.isPackaged ? cfg.prodUrl : cfg.devUrl) + '/jarvis';
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0A0A0A',
    title: 'AGNI',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),                 // AGNI-SYSTEM (2/3)
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(START_URL);

  // Links to other sites open in the normal browser, not inside AGNI
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => (win = null));
}

app.whenReady().then(() => {
  registerSystemIpc();

  const isAllowedOrigin = (urlStr) => {
    try {
      if (!urlStr) return true;
      const origin = new URL(urlStr).origin;
      return cfg.trustedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('127.0.0.1');
    } catch (_) {
      return false;
    }
  };

  const isAudioPermission = (permission) => {
    return ['media', 'microphone', 'audioCapture'].includes(permission);
  };

  // Allow microphone and audioCapture for localhost:3000 and vercel.app
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    const ok = isAudioPermission(permission) && isAllowedOrigin(wc.getURL());
    callback(ok);
  });

  session.defaultSession.setPermissionCheckHandler((wc, permission, origin) => {
    return isAudioPermission(permission) && isAllowedOrigin(origin || (wc && wc.getURL()));
  });

  createWindow();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
