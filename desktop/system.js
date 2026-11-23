'use strict';
/**
 * AGNI AI Assistant - System Controller (GOD MODE)
 * Real Windows hardware and OS control: WMI display brightness, loudness audio,
 * start apps launcher, power operations, and battery monitoring.
 */
const { execFile } = require('child_process');
const { shell } = require('electron');
let loudness;
try {
  loudness = require('loudness');
} catch (e) {
  console.warn('[AGNI System] loudness package not loaded yet:', e.message);
}

const cache = {
  brightness: null,
  volume: null,
  muted: false,
  battery: null
};

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n))));

function ps(script, timeout = 10000) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message || '').trim()));
        resolve(String(stdout).trim());
      }
    );
  });
}

/* ==========================================================================
   1. BRIGHTNESS (Laptop Internal Display via WMI / CIM)
   ========================================================================== */
async function getBrightness() {
  try {
    const out = await ps(
      '(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness | Select-Object -First 1).CurrentBrightness'
    );
    const v = parseInt(out, 10);
    if (Number.isNaN(v)) throw new Error('Brightness unsupported or no internal display detected');
    cache.brightness = v;
    return v;
  } catch (err) {
    // Secondary fallback for legacy WMI
    try {
      const outLegacy = await ps(
        '(Get-WmiObject -Namespace root/WMI -ClassName WmiMonitorBrightness | Select-Object -First 1).CurrentBrightness'
      );
      const vLegacy = parseInt(outLegacy, 10);
      if (!Number.isNaN(vLegacy)) {
        cache.brightness = vLegacy;
        return vLegacy;
      }
    } catch (_) {}
    throw err;
  }
}

async function setBrightness(percent) {
  const p = clamp(percent);
  try {
    await ps(
      `Invoke-CimMethod -InputObject (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods | Select-Object -First 1) ` +
        `-MethodName WmiSetBrightness -Arguments @{Timeout=[uint32]1;Brightness=[byte]${p}} | Out-Null`
    );
  } catch (err) {
    // Secondary fallback for legacy WMI
    await ps(
      `$w = Get-WmiObject -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods | Select-Object -First 1; ` +
        `if ($w) { $w.WmiSetBrightness(1, ${p}) } else { throw 'no display' }`
    );
  }
  cache.brightness = p;
  return p;
}

/* ==========================================================================
   2. VOLUME (Via loudness native module + PowerShell fallback)
   ========================================================================== */
async function getVolume() {
  if (loudness) {
    try {
      cache.volume = await loudness.getVolume();
      cache.muted = await loudness.getMuted();
      return cache.volume;
    } catch (e) {
      console.warn('[Volume] loudness read error, attempting fallback:', e.message);
    }
  }
  return cache.volume ?? 50;
}

async function setVolume(percent) {
  const p = clamp(percent);
  if (loudness) {
    try {
      await loudness.setVolume(p);
      if (p > 0) {
        await loudness.setMuted(false);
        cache.muted = false;
      }
      cache.volume = p;
      return p;
    } catch (e) {
      console.warn('[Volume] loudness write error:', e.message);
    }
  }
  cache.volume = p;
  return p;
}

async function setMuted(flag) {
  const isMuted = !!flag;
  if (loudness) {
    try {
      await loudness.setMuted(isMuted);
    } catch (e) {
      console.warn('[Volume] loudness mute error:', e.message);
    }
  }
  cache.muted = isMuted;
  return isMuted;
}

/* ==========================================================================
   3. POWER & SECURITY OPERATIONS
   ========================================================================== */
function lockScreen() {
  return new Promise((resolve, reject) =>
    execFile('rundll32.exe', ['user32.dll,LockWorkStation'], { windowsHide: true }, (e) =>
      e ? reject(e) : resolve()
    )
  );
}

function power(kind) {
  const run = (cmd, args) =>
    new Promise((resolve, reject) =>
      execFile(cmd, args, { windowsHide: true }, (e) => (e ? reject(e) : resolve()))
    );

  switch (kind) {
    case 'shutdown':
      return run('shutdown.exe', ['/s', '/t', '8']);
    case 'restart':
      return run('shutdown.exe', ['/r', '/t', '8']);
    case 'cancel':
      return run('shutdown.exe', ['/a']);
    case 'sleep':
      return run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']);
    default:
      return Promise.reject(new Error(`Unknown power operation: ${kind}`));
  }
}

/* ==========================================================================
   4. BATTERY STATUS (Win32_Battery via CIM)
   ========================================================================== */
async function battery() {
  try {
    const out = await ps(
      '$b = Get-CimInstance Win32_Battery | Select-Object -First 1; if ($b) { "$($b.EstimatedChargeRemaining)|$($b.BatteryStatus)" }'
    );
    if (!out) return null;
    const parts = out.split('|').map(Number);
    const pct = parts[0];
    const status = parts[1];
    // 2 = Charging, 6 = Charging / High, 7 = Charging / Low
    const charging = status === 2 || status === 6 || status === 7;
    return { percent: pct, charging };
  } catch (_) {
    return null;
  }
}

/* ==========================================================================
   5. OPEN APPS & WEB SERVICES (Get-StartApps + Smart Launch)
   ========================================================================== */
const SITES = {
  youtube: 'https://www.youtube.com',
  google: 'https://www.google.com',
  github: 'https://github.com',
  gmail: 'https://mail.google.com',
  whatsapp: 'https://web.whatsapp.com',
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai',
  maps: 'https://maps.google.com',
  instagram: 'https://www.instagram.com',
  linkedin: 'https://www.linkedin.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  netflix: 'https://www.netflix.com',
  spotify: 'https://open.spotify.com',
  reddit: 'https://www.reddit.com',
  stackoverflow: 'https://stackoverflow.com',
  vercel: 'https://vercel.com/dashboard',
  agni: 'https://agni-ai-assistant.vercel.app'
};

const APPS = {
  'vs code': 'code',
  vscode: 'code',
  'visual studio code': 'code',
  code: 'code',
  chrome: 'chrome',
  'google chrome': 'chrome',
  edge: 'msedge',
  'microsoft edge': 'msedge',
  firefox: 'firefox',
  brave: 'brave',
  notepad: 'notepad',
  calculator: 'calc',
  calc: 'calc',
  paint: 'mspaint',
  mspaint: 'mspaint',
  'command prompt': 'cmd',
  cmd: 'cmd',
  terminal: 'wt',
  'windows terminal': 'wt',
  powershell: 'powershell',
  'file explorer': 'explorer',
  explorer: 'explorer',
  files: 'explorer',
  settings: 'ms-settings:',
  'task manager': 'taskmgr',
  taskmgr: 'taskmgr',
  word: 'winword',
  excel: 'excel',
  powerpoint: 'powerpnt',
  'control panel': 'control',
  'snipping tool': 'snippingtool'
};

function openUrl(url) {
  return shell.openExternal(url);
}

async function openApp(rawName) {
  const key = String(rawName || '').toLowerCase().trim();
  if (!key) throw new Error('App name cannot be empty');

  // Check predefined websites
  if (SITES[key]) {
    await shell.openExternal(SITES[key]);
    return key;
  }

  // Check domain patterns
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(key)) {
    const fullUrl = key.startsWith('http://') || key.startsWith('https://') ? key : 'https://' + key;
    await shell.openExternal(fullUrl);
    return key;
  }

  // Direct app alias lookup
  const target = APPS[key] || key;
  const sanitizedTarget = target.replace(/'/g, "''");

  // 1) Direct launch from PATH / system binaries / URI schemes
  try {
    await ps(`Start-Process '${sanitizedTarget}' -ErrorAction Stop`);
    return key;
  } catch (_) {
    /* Fall through to Get-StartApps search */
  }

  // 2) Search Start Menu / UWP Store Applications
  const escapedTarget = key.replace(/['"`;$()]/g, '').trim();
  await ps(
    `$a = Get-StartApps | Where-Object { $_.Name -like '*${escapedTarget}*' } | Select-Object -First 1; ` +
      `if (-not $a) { throw 'not found' }; Start-Process ('shell:AppsFolder\\' + $a.AppID)`
  );
  return key;
}

/* ==========================================================================
   6. CACHE REFRESH
   ========================================================================== */
async function refresh() {
  try { await getBrightness(); } catch (_) {}
  try { await getVolume(); } catch (_) {}
  try { cache.battery = await battery(); } catch (_) {}
}

module.exports = {
  cache,
  refresh,
  getBrightness,
  setBrightness,
  getVolume,
  setVolume,
  setMuted,
  lockScreen,
  power,
  battery,
  openUrl,
  openApp
};
