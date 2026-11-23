'use strict';
/**
 * AGNI AI Assistant - Main Electron Process (GOD MODE)
 * Features:
 * - Single Instance Lock & Background Resilience (Throttling Disabled)
 * - System Tray + Draggable Floating Orb (Always on Top 'screen-saver' level)
 * - 12-Second Conversational Chaining Window
 * - Auto-restarting Python Brain Voice Engine
 * - Hardware System Telemetry & Global Hotkeys
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, nativeImage, screen } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const cfg = require('./config');
const sys = require('./system');
const commands = require('./commands');

// 1. Single instance lock: prevent duplicate processes
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// 2. Disable background throttling so audio and timers stay active when hidden
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const BASE = app.isPackaged ? process.resourcesPath : __dirname;
const startHidden = process.argv.includes('--hidden');

let win = null;
let orb = null;
let tray = null;
let py = null;
let pyBuf = '';
let quitting = false;
let sessionTimer = null;
let lastStats = {};
let queue = Promise.resolve();
const logs = [];

const state = {
  alwaysListening: true,
  wakeRequired: cfg.wakeWordRequired,
  session: false,
  speaking: false,
  brain: 'starting'
};

/* ---------------- helpers ---------------- */
function send(channel, payload) {
  for (const w of [win, orb]) {
    if (w && !w.isDestroyed()) {
      w.webContents.send(channel, payload);
    }
  }
}

function pushState() {
  send('state', { ...state });
  if (tray) {
    tray.setToolTip(state.alwaysListening ? 'AGNI - always listening' : 'AGNI - mic off');
    updateTrayMenu();
  }
}

function log(kind, text) {
  const entry = { t: Date.now(), kind, text };
  logs.push(entry);
  if (logs.length > 150) logs.shift();
  send('log', entry);
}

function speak(text) {
  log('agni', text);
  send('speak', text);
}

function toBrain(obj) {
  if (py && py.stdin && py.stdin.writable) {
    py.stdin.write(JSON.stringify(obj) + '\n');
  }
}

function makeIcon() {
  const s = 32;
  const buf = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if ((d < 14 && d > 10) || d <= 5) {
        const i = (y * s + x) * 4;
        buf[i] = 0xff;     // B
        buf[i + 1] = 0xd4; // G
        buf[i + 2] = 0x00; // R
        buf[i + 3] = 0xff; // A
      }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}

/* ---------------- windows ---------------- */
function webPrefs() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    backgroundThrottling: false
  };
}

function createMain() {
  win = new BrowserWindow({
    width: 1320,
    height: 800,
    minWidth: 1040,
    minHeight: 660,
    frame: false,
    backgroundColor: '#020210',
    show: !startHidden,
    icon: makeIcon(),
    title: 'AGNI',
    webPreferences: webPrefs()
  });

  win.loadFile('index.html');

  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      toOrb();
    }
  });

  win.on('minimize', (e) => {
    e.preventDefault();
    toOrb();
  });
}

function createOrb() {
  const wa = screen.getPrimaryDisplay().workArea;
  orb = new BrowserWindow({
    width: 80,
    height: 80,
    x: wa.x + wa.width - 110,
    y: wa.y + wa.height - 130,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false, // never steals keyboard/window focus from user work
    show: false,
    webPreferences: webPrefs()
  });

  orb.setAlwaysOnTop(true, 'screen-saver');
  orb.setVisibleOnAllWorkspaces(true);
  orb.loadFile('orb.html');
}

function toOrb() {
  if (win && !win.isDestroyed()) win.hide();
  if (orb && !orb.isDestroyed()) orb.showInactive();
}

function showMain() {
  if (orb && !orb.isDestroyed()) orb.hide();
  if (win && !win.isDestroyed()) {
    win.show();
    win.focus();
  }
}

/* ---------------- tray ---------------- */
function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open AGNI', click: showMain },
      { label: 'Floating orb', click: toOrb },
      { type: 'separator' },
      {
        label: 'Always listening',
        type: 'checkbox',
        checked: state.alwaysListening,
        click: (m) => setAlwaysListening(m.checked)
      },
      {
        label: 'Require wake word ("Agni")',
        type: 'checkbox',
        checked: state.wakeRequired,
        click: (m) => {
          state.wakeRequired = m.checked;
          pushState();
        }
      },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked, args: ['--hidden'] })
      },
      { type: 'separator' },
      {
        label: 'Quit AGNI',
        click: () => {
          quitting = true;
          app.quit();
        }
      }
    ])
  );
}

function buildTray() {
  tray = new Tray(makeIcon());
  tray.on('click', showMain);
  pushState();
}

/* ---------------- listening state & session ---------------- */
function setAlwaysListening(v) {
  state.alwaysListening = !!v;
  toBrain({ cmd: 'listen', value: state.alwaysListening });
  if (!state.alwaysListening) state.session = false;
  log('sys', state.alwaysListening ? 'Always listening: ON' : 'Always listening: OFF (mic closed)');
  pushState();
}

function openSession() {
  state.session = true;
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    state.session = false;
    pushState();
  }, cfg.sessionSeconds * 1000);
  pushState();
}

function endSession() {
  clearTimeout(sessionTimer);
  state.session = false;
  pushState();
}

const ctx = {
  toBrain,
  endSession,
  setAlwaysListening,
  openSession,
  getStats: () => lastStats
};

/* ---------------- speech -> command ---------------- */
function handleSpeech(raw, typed = false) {
  queue = queue.then(() => processSpeech(raw, typed)).catch(() => {});
}

async function processSpeech(raw, typed) {
  const text = String(raw || '').trim();
  if (!text) return;
  if (!typed && (!state.alwaysListening || state.speaking)) return;

  const tokens = text.toLowerCase().split(/\s+/);
  const wi = tokens.findIndex((tk) => cfg.wakeWords.includes(tk));
  const woke = wi >= 0;

  // Ambient speech is ignored unless wake word was uttered or session is active
  if (!typed && state.wakeRequired && !state.session && !woke) return;

  const cmd = (woke ? tokens.slice(wi + 1) : tokens).join(' ').replace(/^sir\s+/, '').trim();
  log('you', text);
  openSession();

  if (!cmd) {
    speak('Ji sir, boliye.');
    return;
  }

  try {
    const reply = await commands.run(cmd, ctx);
    if (reply) speak(reply);
  } catch (e) {
    log('err', String(e.message || e));
    speak('Sir, kuch gadbad ho gayi. Dobara try kijiye.');
  }
}

/* ---------------- Python voice engine (Auto-Restarting) ---------------- */
function onBrainMessage(line) {
  let m;
  try {
    m = JSON.parse(line);
  } catch (_) {
    return;
  }
  switch (m.type) {
    case 'level':
      send('level', m.v);
      break;
    case 'partial':
      send('partial', m.text);
      break;
    case 'final':
      send('partial', '');
      handleSpeech(m.text);
      break;
    case 'ready':
      state.brain = 'ready';
      toBrain({ cmd: 'listen', value: state.alwaysListening });
      log('sys', 'Voice engine online. Say "Agni" and give a command.');
      pushState();
      break;
    case 'error':
      state.brain = 'error';
      log('err', m.text);
      pushState();
      break;
  }
}

function getBrainScript() {
  const p1 = path.join(BASE, 'python', 'brain.py');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(BASE, 'brain.py');
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function startBrain() {
  const script = getBrainScript();
  const model = path.isAbsolute(cfg.voskModel) ? cfg.voskModel : path.join(BASE, cfg.voskModel);
  state.brain = 'starting';
  pushState();

  py = spawn(cfg.python, ['-u', script, model], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  py.stdout.setEncoding('utf8');
  py.stdout.on('data', (d) => {
    pyBuf += d;
    let i;
    while ((i = pyBuf.indexOf('\n')) >= 0) {
      const line = pyBuf.slice(0, i).trim();
      pyBuf = pyBuf.slice(i + 1);
      if (line) onBrainMessage(line);
    }
  });

  py.stderr.on('data', (d) => log('sys', 'python: ' + d.toString().trim().slice(0, 240)));

  py.on('error', (e) => {
    state.brain = 'error';
    log('err', `Could not start Python ("${cfg.python}"): ${e.message}`);
    pushState();
  });

  py.on('exit', (code) => {
    py = null;
    if (quitting) return;
    if (code === 2) {
      state.brain = 'error'; // Missing model or requirements
      pushState();
      setTimeout(startBrain, 10000); // Retry with gentle backoff
      return;
    }
    state.brain = 'restarting';
    pushState();
    setTimeout(startBrain, 2500); // Continuous auto-restart so AGNI never stops listening
  });
}

/* ---------------- system stats ---------------- */
let prevCpu = os.cpus();
function cpuLoad() {
  const now = os.cpus();
  let idle = 0;
  let total = 0;
  now.forEach((c, i) => {
    const p = prevCpu[i];
    for (const k in c.times) total += c.times[k] - p.times[k];
    idle += c.times.idle - p.times.idle;
  });
  prevCpu = now;
  return total ? Math.round(100 * (1 - idle / total)) : 0;
}

function statsTick() {
  const total = os.totalmem();
  const free = os.freemem();
  lastStats = {
    cpu: cpuLoad(),
    ram: Math.round(100 * (1 - free / total)),
    ramUsed: +((total - free) / 1073741824).toFixed(1),
    ramTotal: +(total / 1073741824).toFixed(1),
    brightness: sys.cache.brightness,
    volume: sys.cache.muted ? 0 : sys.cache.volume,
    muted: sys.cache.muted,
    battery: sys.cache.battery ? sys.cache.battery.percent : null
  };
  send('stats', lastStats);
}

/* ---------------- IPC ---------------- */
ipcMain.handle('init', () => ({ state: { ...state }, logs }));
ipcMain.on('command', (_e, text) => handleSpeech(text, true));
ipcMain.on('set-always', (_e, v) => setAlwaysListening(v));
ipcMain.on('set-wake', (_e, v) => {
  state.wakeRequired = !!v;
  pushState();
});

ipcMain.on('tts-state', (_e, speaking) => {
  state.speaking = !!speaking;
  if (speaking) {
    toBrain({ cmd: 'mute', value: true }); // Mute mic while AGNI is speaking to prevent self-trigger
  } else {
    setTimeout(() => {
      if (!state.speaking) toBrain({ cmd: 'mute', value: false });
    }, 350);
    if (state.session) openSession(); // Reset the 12-second window starting AFTER speech concludes
  }
  pushState();
});

ipcMain.on('to-orb', toOrb);
ipcMain.on('show-main', showMain);
ipcMain.on('quit', () => {
  quitting = true;
  app.quit();
});

let orbStart = [0, 0];
ipcMain.on('orb-drag-start', () => {
  if (orb && !orb.isDestroyed()) orbStart = orb.getPosition();
});
ipcMain.on('orb-drag', (_e, dx, dy) => {
  if (orb && !orb.isDestroyed()) {
    orb.setPosition(Math.round(orbStart[0] + dx), Math.round(orbStart[1] + dy));
  }
});

/* ---------------- lifecycle ---------------- */
app.on('second-instance', showMain);
app.on('window-all-closed', () => {
  /* Stay running in background system tray */
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('before-quit', () => {
  quitting = true;
  if (py) py.kill();
});

app.whenReady().then(() => {
  createMain();
  createOrb();
  buildTray();
  if (startHidden) toOrb();

  globalShortcut.register('Control+Alt+A', () => (win && win.isVisible() ? toOrb() : showMain()));
  globalShortcut.register('Control+Alt+M', () => setAlwaysListening(!state.alwaysListening));

  if (app.isPackaged && !app.getLoginItemSettings().wasOpenedAtLogin && !app.getLoginItemSettings().openAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
  }

  startBrain();
  sys.refresh().then(statsTick);
  setInterval(statsTick, 2000);
  setInterval(() => sys.refresh(), 15000);
});
