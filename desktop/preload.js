'use strict';
// Runs inside the EXE window before your Next.js page loads.
// The page sees window.agni; in a normal browser window.agni does not exist.
const { contextBridge, ipcRenderer } = require('electron');

const call = (name, ...args) => ipcRenderer.invoke('agni:system', name, args);

contextBridge.exposeInMainWorld('agni', {
  isDesktop: true,
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke('agni:config'),
  system: {
    refresh: () => call('refresh'),
    getCache: () => call('getCache'),
    getBrightness: () => call('getBrightness'),
    setBrightness: (percent) => call('setBrightness', percent),
    getVolume: () => call('getVolume'),
    setVolume: (percent) => call('setVolume', percent),
    setMuted: (flag) => call('setMuted', flag),
    lockScreen: () => call('lockScreen'),
    power: (kind) => call('power', kind),
    battery: () => call('battery'),
    openUri: (url) => call('openUri', url),
    openUrl: (url) => call('openUrl', url),
    openApp: (name) => call('openApp', name)
  }
});
