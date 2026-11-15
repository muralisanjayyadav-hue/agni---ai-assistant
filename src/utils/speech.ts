/**
 * Realistic, Human-Quality Speech Recognition and Text-to-Speech Engine for AGNI
 *
 * Tier 1: AGNI Neural Live Audio ("Aoede", "Kore", "Puck") - warm, young, friendly Indian-English voice
 * Tier 2: Enhanced Web Speech API Fallback:
 *         - Strict exclusion of robotic voices
 *         - Auto-selection of premium neural voices
 *         - Voice Settings: Rate: 0.95, Pitch: 1.05, Volume: 1.0
 *         - Natural Conversational Pauses: 300ms after commas, 600ms after sentence boundaries
 */

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Map user-friendly language names, codes, and aliases to standard BCP-47 speech tags
 */
export const LANGUAGE_SPEECH_MAP: Record<string, string> = {
  // Indian Regional & Code-Switching Languages
  tamil: 'ta-IN',
  ta: 'ta-IN',
  'ta-in': 'ta-IN',
  tam: 'ta-IN',

  hindi: 'hi-IN',
  hi: 'hi-IN',
  'hi-in': 'hi-IN',
  hin: 'hi-IN',
  hinglish: 'hi-IN',

  telugu: 'te-IN',
  te: 'te-IN',
  'te-in': 'te-IN',
  tel: 'te-IN',
  tunglish: 'te-IN',

  kannada: 'kn-IN',
  kn: 'kn-IN',
  'kn-in': 'kn-IN',
  kan: 'kn-IN',

  malayalam: 'ml-IN',
  ml: 'ml-IN',
  'ml-in': 'ml-IN',
  mal: 'ml-IN',

  bengali: 'bn-IN',
  bn: 'bn-IN',
  'bn-in': 'bn-IN',
  ben: 'bn-IN',
  bangla: 'bn-IN',

  marathi: 'mr-IN',
  mr: 'mr-IN',
  'mr-in': 'mr-IN',
  mar: 'mr-IN',

  gujarati: 'gu-IN',
  gu: 'gu-IN',
  'gu-in': 'gu-IN',
  guj: 'gu-IN',

  punjabi: 'pa-IN',
  pa: 'pa-IN',
  'pa-in': 'pa-IN',
  pan: 'pa-IN',

  odia: 'or-IN',
  or: 'or-IN',
  'or-in': 'or-IN',
  ori: 'or-IN',

  urdu: 'ur-IN',
  ur: 'ur-IN',
  'ur-in': 'ur-IN',

  sanskrit: 'sa-IN',
  sa: 'sa-IN',
  'sa-in': 'sa-IN',

  // Global & English varieties
  english: 'en-IN',
  'english (india)': 'en-IN',
  'english (us)': 'en-US',
  'english (uk)': 'en-GB',
  en: 'en-IN',
  'en-in': 'en-IN',
  'en-us': 'en-US',
  'en-gb': 'en-GB',

  spanish: 'es-ES',
  es: 'es-ES',
  french: 'fr-FR',
  fr: 'fr-FR',
  german: 'de-DE',
  de: 'de-DE',
  japanese: 'ja-JP',
  ja: 'ja-JP',
  arabic: 'ar-SA',
  ar: 'ar-SA',
  russian: 'ru-RU',
  ru: 'ru-RU',
  portuguese: 'pt-BR',
  pt: 'pt-BR',
  korean: 'ko-KR',
  ko: 'ko-KR',
  chinese: 'zh-CN',
  zh: 'zh-CN',
};

/**
 * Resolves any language string (e.g. "Tamil", "tamil", "Hindi", "hi-IN") into a valid BCP-47 tag
 */
export function resolveLanguageCode(langOrName?: string): string {
  if (!langOrName) return 'en-IN';
  const clean = langOrName.trim().toLowerCase().replace('_', '-');
  if (LANGUAGE_SPEECH_MAP[clean]) {
    return LANGUAGE_SPEECH_MAP[clean];
  }
  // Check if starts with a known code like ta, hi, te
  const prefix = clean.split('-')[0];
  if (LANGUAGE_SPEECH_MAP[prefix]) {
    return LANGUAGE_SPEECH_MAP[prefix];
  }
  // If already a valid BCP-47 like ta-IN or en-US
  if (/^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(clean)) {
    return langOrName;
  }
  return 'en-IN';
}

/**
 * Accurately auto-detects language from Unicode scripts in the text:
 * Supports Tamil, Devanagari (Hindi/Marathi/Sanskrit), Telugu, Kannada, Malayalam, Bengali,
 * Gujarati, Gurmukhi (Punjabi), Odia, Arabic/Urdu, etc.
 */
export function detectLanguageFromText(text: string): string | null {
  if (!text) return null;
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Devanagari (Hindi, Marathi, Sanskrit)
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN'; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN'; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN'; // Punjabi
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or-IN'; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return 'ur-IN'; // Urdu / Arabic
  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja-JP'; // Japanese
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR'; // Korean
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN'; // Chinese
  return null;
}

export function createSpeechRecognition(preferredLang?: string): any | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // live transcription for instant responsiveness
    const targetLang = resolveLanguageCode(preferredLang || (typeof navigator !== 'undefined' ? navigator.language : 'en-IN'));
    recognition.lang = targetLang;
    return recognition;
  } catch (e) {
    console.warn('Could not initialize SpeechRecognition:', e);
    return null;
  }
}

// Active playback handles
let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let activeAbortController: AbortController | null = null;
let queueTimeout: any = null;
let isPlaybackCancelled = false;

// Cache loaded voices
let cachedVoices: SpeechSynthesisVoice[] = [];

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return voices;
}

// Pre-warm voices on load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Filter out robotic, outdated desktop voices (e.g. Microsoft David, eSpeak, Desktop synthetic)
 */
function isRoboticVoice(v: SpeechSynthesisVoice): boolean {
  const name = v.name.toLowerCase();
  // Strictly ban robotic voices
  if (
    name.includes('david') || // Ban Microsoft David
    name.includes('espeak') ||
    name.includes('mark') ||
    name.includes('desktop') ||
    name.includes('robot') ||
    name.includes('bad news') ||
    name.includes('bells') ||
    name.includes('cellos') ||
    name.includes('whisper') ||
    name.includes('trinoids')
  ) {
    return true;
  }
  return false;
}

/**
 * Intelligent voice selector that picks the most natural, human-sounding voice available,
 * prioritizing high-fidelity natural and neural voices.
 */
export function findRealisticVoice(
  profile: 'natural-warm' | 'natural-clarity' | 'indian-accent' | 'studio-deep' = 'natural-warm',
  lang: string = 'en-IN'
): SpeechSynthesisVoice | null {
  const allVoices = getAvailableVoices();
  if (!allVoices.length) return null;

  // Filter out known robotic voices
  const voices = allVoices.filter((v) => !isRoboticVoice(v));
  const pool = voices.length > 0 ? voices : allVoices;

  const resolvedLang = resolveLanguageCode(lang);
  const targetLangNorm = resolvedLang.toLowerCase().replace('_', '-');
  const targetPrefix = targetLangNorm.split('-')[0];

  // 1. Language-specific matching if language is non-English (e.g. Tamil, Hindi, Telugu, Kannada, etc.)
  if (!targetPrefix.startsWith('en')) {
    // Check for premium natural voices like "Google Hindi Female", "Microsoft Valluvar", "Microsoft Swara", etc.
    const priorityKeywords = [
      'natural',
      'neural',
      'online',
      'google',
      'valluvar', // Microsoft Tamil
      'swara',    // Microsoft Hindi
      'madhur',   // Microsoft Hindi
      'neerja',   // Microsoft Hindi
      'mohan',    // Microsoft Telugu
      'chitra',   // Microsoft Telugu
      'gagan',    // Microsoft Kannada
      'sapna',    // Microsoft Kannada
      'sobhan',   // Microsoft Malayalam
      'aarohi',   // Microsoft Marathi
      'bashkar',  // Microsoft Bengali
      'tanishaa', // Microsoft Bengali
      'dhwani',   // Microsoft Gujarati
      'niranjan', // Microsoft Gujarati
      'தமிழ்',
      'हिन्दी',
      'తెలుగు',
      'ಕನ್ನಡ',
      'മലയാളം',
      'বাংলা',
    ];

    for (const kw of priorityKeywords) {
      const match = pool.find((v) => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        const vName = v.name.toLowerCase();
        return (vLang === targetLangNorm || vLang.startsWith(targetPrefix)) && vName.includes(kw);
      });
      if (match) return match;
    }

    const exactMatch = pool.find((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang === targetLangNorm;
    });
    if (exactMatch) return exactMatch;

    const prefixMatch = pool.find((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang.startsWith(targetPrefix);
    });
    if (prefixMatch) return prefixMatch;

    // CRITICAL: DO NOT return an English voice for Tamil/Hindi text!
    // Returning null allows the browser engine to use its system native voice for targetLangNorm without crashing or being mute.
    return null;
  }

  // 2. High-priority human-sounding natural FEMALE voices for AGNI:
  // Strictly ordered by acoustic warmth and natural female timbre:
  const rankedVoices = [
    // Top-tier natural female neural voices
    'google uk english female',
    'microsoft aria online (natural)',
    'microsoft aria',
    'google hindi female',
    'microsoft jenny online (natural)',
    'microsoft neerja online (natural)',
    'microsoft swara online (natural)',
    'microsoft zira',
    'samantha (enhanced)',
    'samantha',
    'karen (enhanced)',
    'karen',
    'serena',
    'ava',
    'veena',
    'heera',
    'google us english female',
    'google english',
  ];

  for (const preferred of rankedVoices) {
    const found = pool.find((v) => v.name.toLowerCase().includes(preferred));
    if (found) return found;
  }

  // 3. Indian English / Indian Accent matching
  if (profile === 'indian-accent' || targetLangNorm === 'en-in') {
    const indianVoice = pool.find(
      (v) =>
        (v.lang.toLowerCase().includes('in') || v.lang.startsWith('hi')) &&
        (v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('google') ||
          v.name.toLowerCase().includes('online'))
    ) || pool.find((v) => v.lang.toLowerCase().includes('in'));
    if (indianVoice) return indianVoice;
  }

  // 4. Any voice with "Natural", "Neural", or "Online"
  const neuralVoice = pool.find((v) => {
    const name = v.name.toLowerCase();
    return (
      (name.includes('natural') || name.includes('neural') || name.includes('online')) &&
      (v.lang.startsWith('en') || v.lang.toLowerCase().includes('in'))
    );
  });
  if (neuralVoice) return neuralVoice;

  // 5. System high-quality voice
  const googleVoice = pool.find((v) => v.name.toLowerCase().includes('google') && v.lang.startsWith('en'));
  if (googleVoice) return googleVoice;

  // 6. Safe English fallback (never robotic)
  const englishVoice = pool.find((v) => v.lang.startsWith('en'));
  return englishVoice || pool[0] || null;
}

/**
 * Extract a concise, spoken-friendly snippet for brisk, natural voice feedback in chats
 * so AGNI doesn't talk endlessly when reading long messages aloud.
 */
export function getSpokenSnippet(text: string, maxSentences = 2, maxChars = 280): string {
  if (!text) return '';
  const clean = text
    .replace(/```[\s\S]*?```/g, 'Here is the code.')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[*#_`~>[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If text is already brief, return it directly
  if (clean.length <= maxChars) return clean;

  // Match complete sentences (Latin and Indic scripts)
  const sentences = clean.match(/[^.!?।॥\n]+[.!?।॥\n]+/g);
  if (sentences && sentences.length > 0) {
    let summary = '';
    for (let i = 0; i < Math.min(sentences.length, maxSentences); i++) {
      if ((summary + sentences[i]).length > maxChars && summary.length > 0) break;
      summary += sentences[i].trim() + ' ';
    }
    const result = summary.trim();
    if (result.length > 20) return result;
  }
  return clean.slice(0, maxChars).trim() + '...';
}

function splitIntoPacedSegments(text: string): string[] {
  // Split on sentence boundaries so each sentence is a smooth, natural utterance
  // Avoid micro-chopping on commas which causes unnatural pauses and delay
  const sentences = text.match(/[^.!?।॥\n]+[.!?।॥\n]*/g);
  if (sentences && sentences.length > 0) {
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return [text.trim()].filter(Boolean);
}

export interface SpeakOptions {
  rate?: number; // Default 1.02 (lively, natural conversational cadence)
  pitch?: number; // Default 1.05 (warm and youthful)
  volume?: number; // Default 1.0
  profile?: 'natural-warm' | 'natural-clarity' | 'indian-accent' | 'studio-deep';
  agniVoice?: 'Aoede' | 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon';
  lang?: string;
  skipNativeAudio?: boolean; // force web speech fallback
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Fast Web Speech API with smooth sentence queuing and natural, lively cadence
 */
function speakViaWebSpeech(text: string, options?: SpeakOptions): boolean {
  if (!isSpeechSynthesisSupported()) {
    console.warn('SpeechSynthesis is not supported in this environment.');
    options?.onError?.(new Error('SpeechSynthesis not supported'));
    return false;
  }

  try {
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Here is the code snippet.')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/[*#_`~>[\]()]/g, ' ')
      .replace(/•/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return false;

    // Split text into smooth sentence segments without artificial delay pauses
    const segments = splitIntoPacedSegments(cleanText);
    const rate = options?.rate ?? 1.02; // 1.02 for natural brisk human speech
    const pitch = options?.pitch ?? 1.05; // 1.05 for warm, youthful tone
    const volume = options?.volume ?? 1.0;

    // Determine target language: auto-detect from Unicode script or resolve from options
    const scriptLang = detectLanguageFromText(cleanText);
    const requestedLang = options?.lang ? resolveLanguageCode(options.lang) : null;
    const lang = scriptLang || requestedLang || 'en-IN';
    const profile = options?.profile || 'natural-warm';

    const selectedVoice = findRealisticVoice(profile, lang);

    let currentIndex = 0;

    const speakSegment = (index: number) => {
      if (isPlaybackCancelled || index >= segments.length) {
        currentUtterance = null;
        notifySpeechState(false);
        options?.onEnd?.();
        return;
      }

      const segmentText = segments[index];
      const utterance = new SpeechSynthesisUtterance(segmentText);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = lang;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        if (isPlaybackCancelled) return;
        currentIndex = index + 1;

        if (currentIndex < segments.length) {
          // Immediately proceed to the next sentence without artificial dead-air delays
          speakSegment(currentIndex);
        } else {
          currentUtterance = null;
          notifySpeechState(false);
          options?.onEnd?.();
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('Speech synthesis utterance error:', e);
          // If a custom selected voice failed or wasn't supported, retry once cleanly with native browser voice
          if (selectedVoice && !isPlaybackCancelled) {
            try {
              const retryUtterance = new SpeechSynthesisUtterance(segmentText);
              retryUtterance.rate = rate;
              retryUtterance.pitch = pitch;
              retryUtterance.volume = volume;
              retryUtterance.lang = lang;
              retryUtterance.onend = () => {
                currentUtterance = null;
                notifySpeechState(false);
                options?.onEnd?.();
              };
              currentUtterance = retryUtterance;
              window.speechSynthesis.speak(retryUtterance);
              return;
            } catch {}
          }
        }
        currentUtterance = null;
        notifySpeechState(false);
        options?.onError?.(e);
      };

      currentUtterance = utterance;
      notifySpeechState(true);
      window.speechSynthesis.speak(utterance);
    };

    // Start speaking segments immediately
    speakSegment(0);
    return true;
  } catch (err) {
    console.warn('Failed to speak via Web Speech:', err);
    notifySpeechState(false);
    options?.onError?.(err);
    return false;
  }
}

/**
 * Main AGNI Speak Function:
 * 1. For Tamil, Hindi, Telugu, and other regional Indian scripts, directly routes to high-quality
 *    native Web Speech engine for authentic pronunciation and immediate response.
 * 2. For English/Latin text, tries AGNI Neural Native Audio ("Aoede" / "Kore" / "Puck") via /api/tts.
 * 3. Smoothly falls back to Web Speech API if native audio is rate-limited or unavailable.
 */
export function speakText(text: string, options?: SpeakOptions): boolean {
  // Reset cancellation flag and stop any currently playing speech
  stopSpeaking();
  isPlaybackCancelled = false;

  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Here is the code snippet.')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[*#_`~>[\]()]/g, ' ')
    .replace(/•/g, ', ')
    .trim();

  if (!cleanText) return false;

  // Auto-detect if text contains non-Latin scripts (Tamil, Hindi Devanagari, Telugu, Bengali, etc.)
  const scriptLang = detectLanguageFromText(cleanText);
  const resolvedOptLang = options?.lang ? resolveLanguageCode(options.lang) : null;
  const isRegionalOrNonEnglish = scriptLang !== null || (resolvedOptLang && !resolvedOptLang.startsWith('en'));

  // If text is in a regional Indian language (Tamil, Hindi, etc.) or skipNativeAudio is requested,
  // use Web Speech directly to ensure correct pronunciation & prevent English voice garbling
  if (options?.skipNativeAudio || isRegionalOrNonEnglish || typeof window === 'undefined') {
    return speakViaWebSpeech(cleanText, {
      ...options,
      lang: scriptLang || resolvedOptLang || options?.lang || 'en-IN',
    });
  }

  // Attempt AGNI Neural Native Audio for English (Aoede: warm, youthful, friendly Indian-English voice)
  const targetVoice = options?.agniVoice || options?.profile === 'studio-deep' ? 'Puck' : 'Aoede';
  activeAbortController = new AbortController();

  notifySpeechState(true);

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanText,
      voice: targetVoice,
    }),
    signal: activeAbortController.signal,
  })
    .then(async (res) => {
      if (isPlaybackCancelled) return;
      if (!res.ok) {
        throw new Error(`TTS server responded with ${res.status}`);
      }
      const data = await res.json();
      if (isPlaybackCancelled) return;

      // If server instructed fallback (e.g. rate limit, offline), use Web Speech
      if (data.fallback || !data.audioUrl) {
        speakViaWebSpeech(cleanText, options);
        return;
      }

      // Play AGNI Neural Native Audio
      const audio = new Audio(data.audioUrl);
      audio.volume = options?.volume ?? 1.0;
      audio.playbackRate = options?.rate ?? 1.02; // 1.02 natural conversational rate

      audio.onended = () => {
        currentAudioElement = null;
        notifySpeechState(false);
        options?.onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('Native audio playback error, falling back:', e);
        currentAudioElement = null;
        if (!isPlaybackCancelled) {
          speakViaWebSpeech(cleanText, options);
        }
      };

      currentAudioElement = audio;
      audio.play().catch((err) => {
        console.warn('Audio play prevented or interrupted:', err);
        currentAudioElement = null;
        if (!isPlaybackCancelled) {
          speakViaWebSpeech(cleanText, options);
        }
      });
    })
    .catch((err) => {
      if (err.name === 'AbortError' || isPlaybackCancelled) {
        return;
      }
      console.warn('AGNI Native Audio request notice, falling back to Web Speech:', err.message);
      if (!isPlaybackCancelled) {
        speakViaWebSpeech(cleanText, options);
      }
    });

  return true;
}

// Global speaking state listeners
type SpeechStateListener = (isSpeaking: boolean) => void;
const speechListeners = new Set<SpeechStateListener>();

export function notifySpeechState(isSpeaking: boolean): void {
  speechListeners.forEach((listener) => {
    try {
      listener(isSpeaking);
    } catch {}
  });
}

export function subscribeSpeechState(listener: SpeechStateListener): () => void {
  speechListeners.add(listener);
  listener(isCurrentlySpeaking());
  return () => {
    speechListeners.delete(listener);
  };
}

export function stopSpeaking(): void {
  isPlaybackCancelled = true;

  if (queueTimeout) {
    clearTimeout(queueTimeout);
    queueTimeout = null;
  }

  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }

  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.src = '';
    } catch (e) {
      console.warn('Error pausing audio element:', e);
    }
    currentAudioElement = null;
  }

  if (isSpeechSynthesisSupported()) {
    try {
      if (currentUtterance) {
        currentUtterance.onend = null;
        currentUtterance.onerror = null;
      }
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
      currentUtterance = null;

      // Chrome/Safari safety follow-up
      setTimeout(() => {
        try {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
          }
        } catch {}
      }, 50);
    } catch (e) {
      console.warn('Error stopping Web Speech:', e);
    }
  }

  notifySpeechState(false);
}

export function isCurrentlySpeaking(): boolean {
  const isAudioPlaying = currentAudioElement !== null && !currentAudioElement.paused;
  const isSynthSpeaking = isSpeechSynthesisSupported() && (window.speechSynthesis.speaking || currentUtterance !== null);
  return isAudioPlaying || isSynthSpeaking;
}
