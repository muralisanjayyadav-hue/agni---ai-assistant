/**
 * AGNI JARVIS FREE Utilities
 * Uses only free Web APIs — no paid STT/TTS
 * Web Speech API (Chrome/Android WebView) + SpeechSynthesis
 */

// Map voice commands to real app URLs (Android deep links + web fallbacks)
export function realOpenApp(appName: string): void {
  const name = appName.toLowerCase().trim();

  const intents: Record<string, { scheme: string; web: string }> = {
    whatsapp: { scheme: 'whatsapp://send', web: 'https://web.whatsapp.com' },
    youtube: { scheme: 'vnd.youtube://', web: 'https://m.youtube.com' },
    instagram: { scheme: 'instagram://app', web: 'https://www.instagram.com' },
    google: { scheme: '', web: 'https://www.google.com' },
    gmail: { scheme: 'googlegmail://', web: 'https://mail.google.com' },
    spotify: { scheme: 'spotify://', web: 'https://open.spotify.com' },
    maps: { scheme: 'geo:0,0?q=', web: 'https://maps.google.com' },
    twitter: { scheme: 'twitter://', web: 'https://twitter.com' },
    facebook: { scheme: 'fb://', web: 'https://www.facebook.com' },
    linkedin: { scheme: 'linkedin://', web: 'https://www.linkedin.com' },
    telegram: { scheme: 'tg://', web: 'https://web.telegram.org' },
    netflix: { scheme: 'nflx://', web: 'https://www.netflix.com' },
    amazon: { scheme: '', web: 'https://www.amazon.in' },
    flipkart: { scheme: '', web: 'https://www.flipkart.com' },
    paytm: { scheme: 'paytm://', web: 'https://paytm.com' },
    gpay: { scheme: 'tez://upi/', web: 'https://pay.google.com' },
    phonepe: { scheme: 'phonepe://', web: 'https://www.phonepe.com' },
    settings: { scheme: '', web: '' },
    camera: { scheme: '', web: '' },
    calculator: { scheme: '', web: '' },
    chrome: { scheme: '', web: 'https://www.google.com' },
  };

  const matchEntry = Object.entries(intents).find(([key]) => name.includes(key));

  if (!matchEntry) {
    // Generic search
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name)}`, '_blank');
    return;
  }

  const [, { scheme, web }] = matchEntry;

  if (scheme) {
    try {
      const a = document.createElement('a');
      a.href = scheme;
      a.click();
      // After 1.5s, open web fallback if native didn't work
      if (web) {
        setTimeout(() => {
          window.open(web, '_blank');
        }, 1500);
      }
    } catch {
      if (web) window.open(web, '_blank');
    }
  } else if (web) {
    window.open(web, '_blank');
  }
}

// Parse voice command to detect app open intent
export function detectAppIntent(text: string): string | null {
  const lower = text.toLowerCase();
  const triggers = ['open ', 'launch ', 'start ', 'go to ', 'show me '];
  const apps = [
    'whatsapp', 'youtube', 'instagram', 'google', 'gmail', 'spotify',
    'maps', 'twitter', 'facebook', 'linkedin', 'telegram', 'netflix',
    'amazon', 'flipkart', 'paytm', 'gpay', 'phonepe', 'settings',
    'camera', 'calculator', 'chrome',
  ];

  const hasTrigger = triggers.some(t => lower.includes(t));
  if (!hasTrigger) return null;

  return apps.find(a => lower.includes(a)) || null;
}

// Get the best warm female voice for JARVIS
export function getWarmVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find(v => v.name.includes('Google UK English Female')) ||
    voices.find(v => v.name.includes('Samantha')) ||
    voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null
  );
}

// Speak text with JARVIS warm voice (rate 0.9, pitch 0.7)
export function jarvisSpeak(
  text: string,
  onEnd?: () => void,
  muted = false
): void {
  if (muted || typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/[*_#`~[\]]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .trim();

  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.rate = 0.9;
  utter.pitch = 0.7;
  utter.lang = 'en-IN';

  const voice = getWarmVoice();
  if (voice) utter.voice = voice;

  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utter);
}

// Request Wake Lock to keep screen on during JARVIS session
export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!('wakeLock' in navigator)) return null;
  try {
    // @ts-ignore WakeLock API may not be in all TS defs
    const lock = await navigator.wakeLock.request('screen');
    console.log('[AGNI JARVIS] Wake lock acquired');
    return lock;
  } catch {
    console.warn('[AGNI JARVIS] Wake lock failed');
    return null;
  }
}

// Request Notification permission for JARVIS alerts
export async function requestNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// Show JARVIS notification
export function showJarvisNotification(title: string, body?: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body: body || 'AGNI JARVIS is online',
    icon: '/favicon.ico',
    silent: true,
    tag: 'agni-jarvis',
  });
}
