'use strict';
/**
 * AGNI AI Assistant - Natural Language Command Processor (GOD MODE)
 * Multi-lingual parser (English + Hinglish) with conversational context chaining,
 * hardware system control execution, dangerous action safety, and local Ollama brain fallback.
 */
const sys = require('./system');
const cfg = require('./config');

const clamp = (n) => Math.max(0, Math.min(100, n));

/* ---------- State & Context Memory ---------- */
let lastContext = null; // 'brightness' | 'volume' | 'app'
let lastContextTimer = null;

function setContext(ctxName) {
  lastContext = ctxName;
  if (lastContextTimer) clearTimeout(lastContextTimer);
  lastContextTimer = setTimeout(() => {
    lastContext = null;
  }, (cfg.sessionSeconds || 12) * 1000);
}

/* ---------- Normalization & Number Parsing ---------- */
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/per\s*cent/g, 'percent')
    .replace(/[.,!?;:"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NUM = {
  zero: 0, shunya: 0, sunya: 0, ten: 10, dus: 10, twenty: 20, bees: 20, bis: 20,
  thirty: 30, tees: 30, tis: 30, forty: 40, chaalis: 40, fifty: 50, pachas: 50,
  sixty: 60, saath: 60, sath: 60, seventy: 70, sattar: 70, eighty: 80, assi: 80,
  ninety: 90, nabbe: 90, hundred: 100, sau: 100, full: 100, max: 100, maximum: 100,
  half: 50, adha: 50, quarter: 25
};

const UNITS = {
  one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4,
  five: 5, paanch: 5, panch: 5, six: 6, chhah: 6, che: 6, seven: 7, saat: 7,
  eight: 8, aath: 8, nine: 9, nau: 9
};

function parseLevel(t) {
  const d = t.match(/\b(\d{1,3})\b/);
  if (d) return clamp(parseInt(d[1], 10));

  let total = null;
  for (const w of t.split(' ')) {
    if (NUM[w] !== undefined) {
      total = NUM[w];
    } else if (UNITS[w] !== undefined) {
      if (total !== null && total >= 20 && total < 100 && total % 10 === 0) {
        total += UNITS[w];
      } else if (total === null && /\bpercent\b/.test(t)) {
        total = UNITS[w];
      }
    }
  }
  return total;
}

const UP = /\b(badha\w*|increase|up|zyada|jyada|more|higher|raise|tez|louder|bada|thoda aur)\b/;
const DOWN = /\b(kam|ghata\w*|decrease|down|less|lower|dim|dheema|halka|low|slow|quiet)\b/;
const YES = /^(yes|yeah|yep|haan|han|ha|haa|confirm|confirmed|ok|okay|sure|ji|kar do|kardo|proceed)\b/;
const NO = /^(no|nahi|nahin|cancel|ruko|mat|stop|nope)\b/;

/* ---------- Pending Confirmation (Safety Flow) ---------- */
let pending = null;
function needConfirm(fn, prompt) {
  if (!cfg.confirmDangerous) return fn();
  if (pending) clearTimeout(pending.timer);
  pending = { fn, timer: setTimeout(() => (pending = null), 12000) };
  return prompt;
}

/* ---------- Local AI Brain (Ollama) ---------- */
const history = [];
const SYSTEM_PROMPT =
  "You are AGNI, Sanjay's personal AI assistant, inspired by JARVIS from Iron Man. " +
  "You speak in natural Hinglish (Hindi + English mix in Roman script). " +
  "Keep your replies to 1 or 2 concise, crisp spoken sentences. " +
  "Always address the user respectfully as 'sir'. Do not use markdown, bullet points, or emojis.";

async function askBrain(question) {
  if (!cfg.ollama || !cfg.ollama.enabled) {
    return 'Sir, ye command mujhe samajh nahi aaya.';
  }
  try {
    history.push({ role: 'user', content: question });
    while (history.length > 8) history.shift();

    const res = await fetch(cfg.ollama.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.ollama.model,
        stream: false,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        options: { temperature: 0.6, num_predict: 140 }
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await res.json();
    const text = (data.message && data.message.content ? data.message.content : '').trim();
    if (!text) throw new Error('Empty model response');

    history.push({ role: 'assistant', content: text });
    return text;
  } catch (_) {
    history.pop();
    return "Sir, mera AI brain abhi offline hai. Ollama start karke 'ollama run llama3.2:3b' kar dijiye.";
  }
}

/* ---------- Command Handlers ---------- */
async function doBrightness(t) {
  setContext('brightness');
  try {
    let lvl = parseLevel(t);
    if (lvl === null) {
      const cur = sys.cache.brightness !== null ? sys.cache.brightness : await sys.getBrightness();
      if (UP.test(t)) lvl = cur + 20;
      else if (DOWN.test(t)) lvl = cur - 20;
      else return 'Sir, brightness kitne percent karni hai?';
    }
    const v = await sys.setBrightness(lvl);
    if (v >= 100) return 'Brightness full kar di hai sir.';
    if (v <= 0) return 'Brightness zero percent kar di hai sir.';
    return `Brightness ${v} percent kar di hai sir.`;
  } catch (_) {
    return 'Sir, is display par brightness control available nahi hai. Ye sirf laptop screen par kaam karta hai.';
  }
}

async function doVolume(t) {
  setContext('volume');
  try {
    if (/\bunmute\b|awaaz chalu|sound on/.test(t)) {
      await sys.setMuted(false);
      return 'Volume unmute kar diya hai sir.';
    }
    if (/\bmute\b|\bchup\b/.test(t)) {
      await sys.setMuted(true);
      return 'Volume mute kar diya hai sir.';
    }
    let lvl = parseLevel(t);
    if (lvl === null) {
      const cur = sys.cache.volume !== null ? sys.cache.volume : await sys.getVolume();
      if (UP.test(t)) lvl = cur + 15;
      else if (DOWN.test(t)) lvl = cur - 15;
      else return 'Sir, volume kitne percent karna hai?';
    }
    const v = await sys.setVolume(lvl);
    if (v >= 100) return 'Volume full kar diya hai sir.';
    if (v <= 0) return 'Volume zero kar diya hai sir.';
    return `Volume ${v} percent kar diya hai sir.`;
  } catch (_) {
    return 'Sir, volume control karne mein dikkat aa rahi hai.';
  }
}

const HOTKEYS = [
  [/\bselect all\b/, ['ctrl', 'a'], 'Select all kar diya sir.'],
  [/\bcopy\b/, ['ctrl', 'c'], 'Copy kar diya sir.'],
  [/\bpaste\b/, ['ctrl', 'v'], 'Paste kar diya sir.'],
  [/\bcut\b/, ['ctrl', 'x'], 'Cut kar diya sir.'],
  [/\bundo\b/, ['ctrl', 'z'], 'Undo kar diya sir.'],
  [/\bsave\b/, ['ctrl', 's'], 'Save kar diya sir.'],
  [/\b(new tab)\b/, ['ctrl', 't'], 'Naya tab khol diya sir.'],
  [/\b(close tab)\b/, ['ctrl', 'w'], 'Tab band kar diya sir.'],
  [/\b(next tab)\b/, ['ctrl', 'tab'], 'Agla tab sir.'],
  [/\b(switch window|window badlo)\b/, ['alt', 'tab'], 'Window badal di sir.'],
  [/\b(show desktop|minimize all|desktop dikhao)\b/, ['win', 'd'], 'Desktop dikha diya sir.'],
  [/\b(close window|window band)\b/, ['alt', 'f4'], 'Window band kar di sir.'],
  [/\b(screenshot|screen shot)\b/, ['win', 'shift', 's'], 'Screenshot tool khol diya sir.'],
  [/\b(refresh|reload)\b/, ['f5'], 'Refresh kar diya sir.'],
  [/\bfull ?screen\b/, ['f11'], 'Fullscreen toggle kar diya sir.']
];

const KEYS = [
  'enter', 'escape', 'tab', 'space', 'backspace', 'delete',
  'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown'
];

function niceName(s) {
  return String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanTarget(s) {
  return String(s || '')
    .replace(/\b(kar do|kardo|kar dijiye|please|sir|for me|app|application|ko|the|my|mera|meri)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ==========================================================================
   MAIN COMMAND PARSER & DISPATCHER
   ========================================================================== */
async function run(raw, ctx) {
  const t = normalize(raw);
  if (!t) return null;

  // 0. Safety confirmation flow (shutdown/restart pending)
  if (pending) {
    if (YES.test(t)) {
      const p = pending;
      pending = null;
      clearTimeout(p.timer);
      return p.fn();
    }
    if (NO.test(t)) {
      clearTimeout(pending.timer);
      pending = null;
      return 'Theek hai sir, cancel kar diya.';
    }
    clearTimeout(pending.timer);
    pending = null;
  }

  // 1. Session Standby / Mute Commands
  if (/\b(standby|stand by|sleep mode|go to sleep|so jao|that'?s all|bas itna|kuch nahi|nothing)\b/.test(t)) {
    ctx.endSession();
    lastContext = null;
    return 'Theek hai sir, main yahin hoon. Jab zarurat ho, Agni bol dijiye.';
  }
  if (
    /\b(mic|microphone|listening)\b.*\b(off|band)\b/.test(t) ||
    /\b(off|band)\b.*\b(mic|microphone|listening)\b/.test(t)
  ) {
    ctx.setAlwaysListening(false);
    return 'Listening band kar di hai sir. Wapas on karne ke liye Control Alt M dabaiye.';
  }

  // 2. Context Chaining: "fifty percent karo" or "kam karo" without stating parameter
  if (lastContext === 'brightness' && (/\bpercent\b/.test(t) || UP.test(t) || DOWN.test(t)) && !/\bvolume\b/.test(t)) {
    return doBrightness(t);
  }
  if (lastContext === 'volume' && (/\bpercent\b/.test(t) || UP.test(t) || DOWN.test(t)) && !/\bbrightness\b/.test(t)) {
    return doVolume(t);
  }

  // 3. Hardware Brightness Control
  if (/\b(brightness|brightnes|roshni|screen light)\b/.test(t)) {
    return doBrightness(t);
  }

  // 4. Hardware Volume & Mute Control
  if (
    /\b(volume|awaaz|awaz|aawaz|sound)\b/.test(t) ||
    /^(un)?mute\b/.test(t) ||
    /\bmute (kar|karo|the)\b/.test(t)
  ) {
    return doVolume(t);
  }

  // 5. Power & System State
  if (/\b(shutdown|shut down|power off|laptop band)\b/.test(t) && /\b(cancel|abort|ruko)\b/.test(t)) {
    await sys.power('cancel').catch(() => {});
    return 'Shutdown cancel kar diya hai sir.';
  }
  if (/\b(shut ?down|power off|laptop band|pc band)\b/.test(t)) {
    return needConfirm(async () => {
      await sys.power('shutdown');
      return 'Theek hai sir, aath second mein laptop shutdown ho raha hai.';
    }, "Sir, laptop shutdown karna hai? Confirm karne ke liye 'haan' bolein.");
  }
  if (/\b(restart|reboot)\b/.test(t)) {
    return needConfirm(async () => {
      await sys.power('restart');
      return 'Theek hai sir, aath second mein restart ho raha hai.';
    }, "Sir, laptop restart karna hai? Confirm karne ke liye 'haan' bolein.");
  }
  if (/\b(lock)\b/.test(t) && /\b(screen|laptop|pc|computer|system)\b|^lock\b/.test(t)) {
    await sys.lockScreen();
    return 'Screen lock kar di hai sir.';
  }
  if (/\b(laptop|pc|computer|system)\b.*\bsleep\b|\bsleep\b.*\b(laptop|pc|computer|system)\b/.test(t)) {
    setTimeout(() => sys.power('sleep').catch(() => {}), 1500);
    return 'Laptop ko sleep mode mein bhej raha hoon sir.';
  }

  // 6. Media Keys
  if (/^(play|pause|resume)( music| song| video| gaana)?$/.test(t)) {
    ctx.toBrain({ cmd: 'key', keys: ['playpause'] });
    return 'Ho gaya sir.';
  }
  if (/\b(next|agla)\b.*\b(song|track|gaana)\b/.test(t)) {
    ctx.toBrain({ cmd: 'key', keys: ['nexttrack'] });
    return 'Agla gaana sir.';
  }
  if (/\b(previous|pichla)\b.*\b(song|track|gaana)\b/.test(t)) {
    ctx.toBrain({ cmd: 'key', keys: ['prevtrack'] });
    return 'Pichla gaana sir.';
  }

  // 7. Search & Play on YouTube / Google / GitHub
  let m = t.match(/^(?:play|chalao|chala do)\s+(.+?)(?:\s+(?:on|par|pe)\s+youtube)?$/);
  if (m) {
    const q = cleanTarget(m[1]);
    await sys.openUrl('https://www.youtube.com/results?search_query=' + encodeURIComponent(q));
    return `YouTube par ${q} chala diya hai sir.`;
  }
  m = t.match(/^(?:search|google|dhundo|dhoondo|find)\s+(.+?)(?:\s+(?:on|par|pe)\s+(youtube|google|github))?$/);
  if (m) {
    const q = encodeURIComponent(cleanTarget(m[1]));
    const site = m[2] || 'google';
    const url =
      site === 'youtube'
        ? 'https://www.youtube.com/results?search_query=' + q
        : site === 'github'
        ? 'https://github.com/search?q=' + q
        : 'https://www.google.com/search?q=' + q;
    await sys.openUrl(url);
    return `${niceName(site)} par ${cleanTarget(m[1])} search kar diya hai sir.`;
  }

  // 8. Open Apps & Websites
  m =
    t.match(/^(?:please |zara )?(?:open|launch|start|run|kholo|khol do|khol)\s+(.+)$/) ||
    t.match(/^(.+?)\s+(?:kholo|khol do|khol|open kar do|open kar|chalu kar do|start kar do)$/);
  if (m) {
    const target = cleanTarget(m[1]);
    if (target) {
      setContext('app');
      try {
        await sys.openApp(target);
        return `${niceName(target)} khol diya hai sir.`;
      } catch (_) {
        return `Sir, mujhe ${target} nahi mila.`;
      }
    }
  }

  // 9. Keyboard & Mouse Input Automation
  m = t.match(/^(?:type|likho|write|typing)\s+(.+)$/);
  if (m) {
    ctx.toBrain({ cmd: 'type', text: raw.replace(/^\s*(type|likho|write|typing)\s+/i, '') });
    return 'Likh diya hai sir.';
  }
  if (/\bdouble click\b/.test(t)) {
    ctx.toBrain({ cmd: 'click', button: 'left', clicks: 2 });
    return 'Double click kar diya sir.';
  }
  if (/\bright click\b/.test(t)) {
    ctx.toBrain({ cmd: 'click', button: 'right', clicks: 1 });
    return 'Right click kar diya sir.';
  }
  if (/\bclick\b/.test(t)) {
    ctx.toBrain({ cmd: 'click', button: 'left', clicks: 1 });
    return 'Click kar diya sir.';
  }
  m = t.match(/\bscroll\s+(up|down)\b|\b(upar|neeche)\s+scroll\b/);
  if (m) {
    const up = m[1] === 'up' || m[2] === 'upar';
    ctx.toBrain({ cmd: 'scroll', amount: up ? 600 : -600 });
    return up ? 'Upar scroll kar diya sir.' : 'Neeche scroll kar diya sir.';
  }
  m = t.match(/\b(?:mouse|cursor)\s+(up|down|left|right)\b/);
  if (m) {
    const d = { up: [0, -200], down: [0, 200], left: [-200, 0], right: [200, 0] }[m[1]];
    ctx.toBrain({ cmd: 'move', dx: d[0], dy: d[1] });
    return 'Mouse hila diya sir.';
  }
  m = t.match(/^press\s+(\w+)$/);
  if (m) {
    const k = m[1] === 'esc' ? 'escape' : m[1];
    if (KEYS.includes(k)) {
      ctx.toBrain({ cmd: 'key', keys: [k] });
      return `${niceName(k)} daba diya sir.`;
    }
  }
  for (const [re, keys, msg] of HOTKEYS) {
    if (re.test(t)) {
      ctx.toBrain({ cmd: 'key', keys });
      return msg;
    }
  }

  // 10. System Telemetry & Information
  if (/\b(time|samay|kitne baje)\b/.test(t)) {
    return 'Sir, abhi ' + new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) + ' ho rahe hain.';
  }
  if (/\b(date|tarikh|aaj kya din)\b/.test(t)) {
    return 'Sir, aaj ' + new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' hai.';
  }
  if (/\bbattery\b/.test(t)) {
    try {
      const b = await sys.battery();
      if (!b) return 'Sir, is system mein battery detect nahi hui.';
      return `Sir, battery ${b.percent} percent hai${b.charging ? ' aur charging ho rahi hai' : ''}.`;
    } catch (_) {
      return 'Sir, battery ki jaankari nahi mil paayi.';
    }
  }
  if (/\b(cpu|processor)\b/.test(t)) {
    return `Sir, CPU usage ${ctx.getStats().cpu || 0} percent hai.`;
  }
  if (/\b(ram|memory)\b/.test(t)) {
    return `Sir, RAM usage ${ctx.getStats().ram || 0} percent hai.`;
  }
  if (/\b(system status|status report|status)\b/.test(t)) {
    const s = ctx.getStats();
    const b = await sys.battery().catch(() => null);
    const batStr = b ? `, battery ${b.percent}%` : '';
    return `Sir, CPU ${s.cpu || 0} percent, RAM ${s.ram || 0} percent, brightness ${s.brightness == null ? 'normal' : s.brightness + ' percent'}${batStr}. Sab kuch theek hai.`;
  }

  // 11. Conversational Polite Salutations
  if (/^(hello|hi|hey|namaste|good morning|good evening|good afternoon|kaise ho|how are you)\b/.test(t)) {
    return 'Namaste sir, main hamesha ready hoon. Boliye kya karna hai?';
  }
  if (/\b(thank|thanks|shukriya|dhanyavaad|dhanyawad)\b/.test(t)) {
    return 'Aapka swagat hai sir.';
  }

  // 12. Local AI Brain Fallback (Ollama)
  return askBrain(raw);
}

module.exports = { run, normalize, parseLevel };
