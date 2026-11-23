'use strict';
// Exposes system.js to the /jarvis page, safely.
//  - only whitelisted functions can be called
//  - only pages from config.trustedOrigins may call them
//  - arguments are validated
//  - shutdown / restart need a native confirmation dialog (the page cannot skip it)
const { ipcMain, dialog, BrowserWindow } = require('electron');
const sys = require('./system');
const cfg = require('./config');

const num = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error('Invalid number');
  return n;
};

const handlers = {
  refresh: () => sys.refresh().then(() => ({ ...sys.cache })),
  getCache: () => ({ ...sys.cache }),
  getBrightness: () => sys.getBrightness(),
  setBrightness: (p) => sys.setBrightness(num(p)),
  getVolume: () => sys.getVolume(),
  setVolume: (p) => sys.setVolume(num(p)),
  setMuted: (flag) => sys.setMuted(!!flag),
  lockScreen: () => sys.lockScreen(),
  battery: () => sys.battery(),
  openUri: (url) => openHttp(url),
  openUrl: (url) => openHttp(url), // alias
  openApp: (name) => {
    if (typeof name !== 'string' || !name.trim() || name.length > 60) throw new Error('Invalid app name');
    return sys.openApp(name);
  }
};

function openHttp(url) {
  const u = new URL(String(url)); // throws on garbage
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Only http(s) links are allowed');
  return sys.openUrl(u.toString());
}

function isTrusted(event) {
  try {
    const url = (event.senderFrame && event.senderFrame.url) || event.sender.getURL();
    return cfg.trustedOrigins.includes(new URL(url).origin);
  } catch (_) {
    return false;
  }
}

async function confirmPower(event, kind) {
  const win = BrowserWindow.fromWebContents(event.sender);
  const label = kind === 'shutdown' ? 'shut down' : kind === 'restart' ? 'restart' : 'sleep';
  const { response } = await dialog.showMessageBox(win || undefined, {
    type: 'warning',
    buttons: ['Yes, ' + label, 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'AGNI',
    message: `AGNI wants to ${label} this laptop. Allow?`
  });
  if (response !== 0) throw new Error('cancelled');
}

function registerSystemIpc() {
  ipcMain.handle('agni:system', async (event, name, args) => {
    if (!isTrusted(event)) throw new Error('Untrusted page');
    if (name === 'power') {
      const kind = String((args || [])[0]);
      if (!['shutdown', 'restart', 'cancel', 'sleep'].includes(kind)) throw new Error('Unknown power action');
      if (kind !== 'cancel') await confirmPower(event, kind);
      return sys.power(kind);
    }
    const fn = Object.prototype.hasOwnProperty.call(handlers, name) ? handlers[name] : null;
    if (!fn) throw new Error('Unknown system function: ' + name);
    return fn(...(Array.isArray(args) ? args : []));
  });

  ipcMain.handle('agni:config', (event) => {
    if (!isTrusted(event)) throw new Error('Untrusted page');
    return { wakeWords: cfg.wakeWords, sessionSeconds: cfg.sessionSeconds, wakeWordRequired: cfg.wakeWordRequired };
  });
}

module.exports = { registerSystemIpc };
