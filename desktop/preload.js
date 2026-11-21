'use strict';
/**
 * AGNI AI Assistant - Preload Bridge (GOD MODE)
 * Secure, context-isolated bridge between Electron Main process and UI Renderers.
 */
const { contextBridge, ipcRenderer } = require('electron');

const VALID_CHANNELS = ['state', 'level', 'partial', 'log', 'speak', 'stats'];

contextBridge.exposeInMainWorld('agni', {
  on: (channel, cb) => {
    if (VALID_CHANNELS.includes(channel) && typeof cb === 'function') {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  },
  init: () => ipcRenderer.invoke('init'),
  command: (text) => ipcRenderer.send('command', String(text || '')),
  setAlways: (v) => ipcRenderer.send('set-always', !!v),
  setWake: (v) => ipcRenderer.send('set-wake', !!v),
  ttsState: (v) => ipcRenderer.send('tts-state', !!v),
  toOrb: () => ipcRenderer.send('to-orb'),
  showMain: () => ipcRenderer.send('show-main'),
  quit: () => ipcRenderer.send('quit'),
  orbDragStart: () => ipcRenderer.send('orb-drag-start'),
  orbDrag: (dx, dy) => ipcRenderer.send('orb-drag', Number(dx) || 0, Number(dy) || 0)
});
