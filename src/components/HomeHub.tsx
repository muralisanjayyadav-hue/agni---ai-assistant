import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  MessageSquare,
  Mic,
  MicOff,
  Sparkles,
  ChevronDown,
  GraduationCap,
  Eye,
  Search,
  FileText,
  Cpu,
  Brain,
  MessageCircle,
  HardDrive,
  Smartphone,
  Radio,
  Volume2,
  Check,
  Compass,
  ArrowRight,
  Layers,
  Globe,
  Heart,
  Trophy,
  Lock,
  PenTool,
  CalendarCheck,
  Crosshair,
  WifiOff,
  Wifi,
  Target,
  Zap,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { TabMode, UserPreferences, AuthUser } from '../types';
import { isSpeechRecognitionSupported, createSpeechRecognition, speakText } from '../utils/speech';
import { SUPPORTED_LANGUAGES, getLanguageOption } from '../data/languages';
import { isCofounderEmail } from '../utils/security';
import { GOLD_FOUNDERS, getFounderName } from '../lib/auth';

const DEFAULT_FOUNDER_BIO = `M. Sanjay is the founder of AGNI. He founded AGNI to solve day-to-day life problems faced by people. His vision is Project AGNI - Made in India, To Serve the World - a unified multimodal personal AI assistant that can explain concepts step-by-step, analyze diagrams, fetch live discoveries, and organize tasks, just like a true human friend. He believes AI should be helpful, humble, and human.`;

interface HomeHubProps {
  userPreferences: UserPreferences;
  onSelectTab: (tab: TabMode) => void;
  onQuickPrompt: (tab: TabMode, promptText: string) => void;
  recentHistoryCount: number;
  onOpenSiri?: () => void;
  onOpenTerms?: (tab?: 'terms' | 'privacy' | 'student' | 'about') => void;
  onUpdatePreferences?: (updated: Partial<UserPreferences>) => void;
  authUser?: AuthUser | null;
  onOpenFounderAccess?: () => void;
  customFounderBio?: string;
  isOfflineMode?: boolean;
  onToggleOfflineMode?: (enabled: boolean) => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({
  userPreferences,
  onSelectTab,
  onQuickPrompt,
  recentHistoryCount,
  onOpenSiri,
  onOpenTerms,
  onUpdatePreferences,
  authUser,
  onOpenFounderAccess,
  customFounderBio,
  isOfflineMode = false,
  onToggleOfflineMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'flash' | 'academic' | 'voice' | 'vision'>('flash');
  const [isFounderSpeaking, setIsFounderSpeaking] = useState(false);

  const handlePlayFounderSpeech = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsFounderSpeaking(true);
    speakText('I was proudly created by Founder M. Sanjay to help you in your day-to-day life!', {
      rate: 0.95,
      pitch: 1.05,
      profile: 'natural-warm',
      onEnd: () => setIsFounderSpeaking(false),
      onError: () => setIsFounderSpeaking(false),
    });
  };
  
  // Hardware key simulator state (long press Vol+ & Power)
  const [isHoldingHardwareKeys, setIsHoldingHardwareKeys] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const recognitionRef = useRef<any | null>(null);

  const currentLang = getLanguageOption(userPreferences.language);

  // Clean up speech recognition & timers
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  const toggleMic = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      console.warn('Speech recognition not supported.');
      return;
    }

    try {
      const selectedLanguage = currentLang?.speechCode || 'en-IN';
      const recognition = createSpeechRecognition(selectedLanguage);
      if (!recognition) return;

      // ─── CRITICAL settings for LIVE typing ───────────────────────────
      recognition.continuous = true;
      recognition.interimResults = true;    // MUST be true
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;
      // ─────────────────────────────────────────────────────────────────

      recognitionRef.current = recognition;

      let retryCount = 0;
      const MAX_RETRY = 3;

      recognition.onstart = () => {
        retryCount = 0;
        setIsListening(true);
        console.log('[HomeHub STT] Started');
      };

      let accumulatedFinal = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedFinal += chunk + ' ';
          } else {
            interim += chunk + ' ';
          }
        }
        const liveText = (accumulatedFinal + interim).trim();
        console.log('[HomeHub STT] LIVE:', liveText);

        // Update React state so input re-renders
        setInputText(liveText);

        // Direct DOM push as safety net
        try {
          const el = document.getElementById('home-message-input') as HTMLInputElement | null;
          if (el) {
            el.value = liveText;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch {}
      };

      recognition.onerror = (event: any) => {
        console.log("[AGNI Voice] Error:", event.error, event);
        const err = event.error as string;
        console.warn('[HomeHub STT] Error:', err);

        if (err === 'network') {
          if (retryCount < MAX_RETRY) {
            retryCount++;
            console.log(`[AGNI Voice] Network error, retrying ${retryCount}/${MAX_RETRY} in 1s...`);
            const statusEl = document.getElementById('live-voice-status');
            if (statusEl) statusEl.textContent = `Network issue, retrying ${retryCount}/${MAX_RETRY}...`;
            setTimeout(() => {
              if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) {}
              }
            }, 1000);
            return;
          } else {
            const statusEl = document.getElementById('live-voice-status');
            const fallbackMsg = "Network error - Please check internet, or type manually. Retrying with Groq Whisper...";
            if (statusEl) statusEl.textContent = fallbackMsg;
            setIsListening(false);
            return;
          }
        }

        if (err === 'not-allowed' || err === 'permission-denied') {
          const msg = "Mic blocked - Click lock icon in address bar and Allow mic";
          const statusEl = document.getElementById('live-voice-status');
          if (statusEl) statusEl.textContent = msg;
          setIsListening(false);
          return;
        }

        if (err === 'no-speech' || err === 'audio-capture') {
          // auto-restart on benign errors
          setTimeout(() => {
            if (recognitionRef.current) {
              try { recognitionRef.current.start(); } catch {}
            }
          }, 400);
          return;
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // Do not clear input; do not auto-restart in HomeHub (single-shot mic)
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('[HomeHub STT] Start failed:', err);
      setIsListening(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputText.trim();
    if (!prompt) return;

    const lower = prompt.toLowerCase();
    if (
      /\b(agni (find bugs|check health|diagnose)|run diagnostics|find issues|find bugs|check bugs|diagnose|diagnostics|check health)\b/i.test(lower)
    ) {
      onSelectTab('diagnostics');
      setInputText('');
      return;
    }

    // Route prompt directly to AI Chat
    onQuickPrompt('chat', prompt);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Hardware button simulator: Press and hold [Vol+] + [Power]
  const startHardwareLongPress = () => {
    setIsHoldingHardwareKeys(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 1200; // 1.2 seconds hold

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        setIsHoldingHardwareKeys(false);
        setHoldProgress(0);
        // Trigger AGNI Voice Assistant
        if (onOpenSiri) {
          onOpenSiri();
        }
      }
    }, 40);
  };

  const cancelHardwareLongPress = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setIsHoldingHardwareKeys(false);
    setHoldProgress(0);
  };

  // 4 Curated ChatGPT Starter Cards with Indian academic & everyday context
  const classicPromptCards = [
    {
      title: 'Solve NCERT / JEE / NEET doubt',
      desc: 'Step-by-step solutions with derivations and core concepts',
      prompt: 'Explain the difference between isothermal and adiabatic processes with formulas and exam tips',
      icon: GraduationCap,
      category: 'Exam Doubt',
    },
    {
      title: 'Analyze handwritten question photo',
      desc: 'Upload a textbook picture or problem diagram for instant breakdown',
      prompt: 'Can you examine this physics problem and explain the free body diagram step by step?',
      icon: Eye,
      category: 'Vision AI',
    },
    {
      title: 'Revision flashcards & cheat sheet',
      desc: 'Instant interactive flashcards and high-yield notes',
      prompt: 'Generate a 3D revision flashcard pack for Organic Chemistry Aldol Condensation mechanism',
      icon: FileText,
      category: 'Exams & Revision',
    },
    {
      title: 'WhatsApp & Telegram voice bot',
      desc: 'Forward textbook photos or voice notes for instant audio solutions',
      prompt: 'How do I forward textbook photos to AGNI on WhatsApp and receive voice explanations?',
      icon: MessageCircle,
      category: 'Voice Assistant',
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex flex-col justify-between max-w-4xl mx-auto px-4 py-6 sm:px-6">
      {/* Top Model Selector & Language Bar (Classic ChatGPT Header) */}
      <div className="relative z-20 flex items-center justify-between w-full pb-4 border-b border-neutral-200/60 dark:border-neutral-800/60">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            id="chatgpt-model-selector-btn"
            type="button"
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-200/60 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {selectedModel === 'flash' && 'AGNI 2.5 Flash'}
              {selectedModel === 'academic' && 'AGNI Student & Academic'}
              {selectedModel === 'voice' && 'AGNI Live Voice Pro'}
              {selectedModel === 'vision' && 'AGNI Vision 3.0'}
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          </button>

          {isModelDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[11px] font-semibold text-neutral-500 px-3 py-1.5 uppercase tracking-wider">
                Select AGNI Intelligence Engine
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedModel('flash');
                  setIsModelDropdownOpen(false);
                }}
                className={`flex items-start gap-3 w-full rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                  selectedModel === 'flash'
                    ? 'bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-200'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Flame className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>AGNI 2.5 Flash</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Fastest</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Unified multimodal reasoning with search & natural voice.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedModel('academic');
                  setIsModelDropdownOpen(false);
                  onSelectTab('learn');
                }}
                className={`flex items-start gap-3 w-full rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                  selectedModel === 'academic'
                    ? 'bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-200'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <GraduationCap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">AGNI Student & Academic</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Structured syllabus guides, formula sheets & interactive flashcards.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedModel('voice');
                  setIsModelDropdownOpen(false);
                  onSelectTab('voice');
                }}
                className={`flex items-start gap-3 w-full rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                  selectedModel === 'voice'
                    ? 'bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-200'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Radio className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">AGNI Live Voice Pro</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Live waveform charts and hands-free conversational tutoring.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedModel('vision');
                  setIsModelDropdownOpen(false);
                  onSelectTab('vision');
                }}
                className={`flex items-start gap-3 w-full rounded-xl p-2.5 text-left text-xs transition-colors cursor-pointer ${
                  selectedModel === 'vision'
                    ? 'bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-200'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Eye className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">AGNI Vision 3.0</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Camera & textbook image recognition with optical math extraction.
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Quick Language Badge & Voice Shortcut */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const inputEl = document.querySelector<HTMLInputElement>('#message-agni-card input');
              if (inputEl) {
                inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => inputEl.focus(), 250);
              } else if (onOpenSiri) {
                onOpenSiri();
              } else {
                onSelectTab('chat');
              }
            }}
            title="Talk to AGNI - Scroll & Focus Chat"
            className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/80 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300 transition-colors cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 animate-pulse" />
            <span>Talk to AGNI</span>
          </button>
        </div>
      </div>

      {/* Centerpiece: Vanakkam Greeting + Center Siri Mic Orb & Action Hub */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto py-6 text-center space-y-6">
        {/* Top Vanakkam & Made in India Cultural Greeting */}
        <div className="flex flex-col items-center space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/60 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 px-4 py-1 text-xs font-extrabold text-orange-600 dark:border-orange-500/30 dark:text-orange-300 shadow-sm">
            <span className="text-base">🙏</span>
            <span>வணக்கம் • VANAKKAM</span>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400">Made in India</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            {authUser ? (
              (authUser.isFounder || GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(authUser.email?.toLowerCase().trim() || '')) ? (
                <span className="text-orange-600 dark:text-orange-400 flex items-center justify-center gap-2">
                  <span>வணக்கம் {getFounderName(authUser.email)}! System Ready, Boss 🔥</span>
                </span>
              ) : authUser.isCoFounder ? (
                <span className="text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
                  <span>வணக்கம் {authUser.name}, Welcome Co-Founder! 🛡️</span>
                </span>
              ) : (
                <span>வணக்கம் {authUser.name}! Welcome to AGNI</span>
              )
            ) : (
              <span>வணக்கம் • Vanakkam, I am AGNI</span>
            )}
          </h1>
          <p className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium max-w-lg">
            {(authUser?.isFounder || GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(authUser?.email?.toLowerCase().trim() || '')) ? (
              <span className="font-bold text-amber-600 dark:text-amber-400">
                👑 Recognized Project AGNI Founder ({getFounderName(authUser?.email)}) • Tap the Center Mic to Speak
              </span>
            ) : authUser?.isCoFounder ? (
              <span className="font-bold text-slate-600 dark:text-slate-300">
                🛡️ Recognized Project AGNI Co-Founder &amp; Partner • Multimodal Assistant Ready
              </span>
            ) : (
              <span>Your Multimodal AI Personal Assistant • Voice, Vision, Student Learning &amp; Life OS</span>
            )}
          </p>
        </div>

        {/* ======================================================== */}
        {/* CENTER SIRI MIC ORB (Pulsating Multimodal Voice Core) */}
        {/* ======================================================== */}
        <div className="relative flex flex-col items-center justify-center my-3 py-2">
          {/* Animated Glow Aura */}
          <div className="absolute h-40 w-40 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-600 opacity-30 blur-2xl animate-pulse pointer-events-none" />

          {/* Concentric Pulsating Rings */}
          <div className="absolute h-32 w-32 rounded-full border border-orange-500/30 animate-ping [animation-duration:3s] pointer-events-none" />
          <div className="absolute h-36 w-36 rounded-full border border-amber-400/20 animate-spin [animation-duration:12s] pointer-events-none" />

          {/* Siri Mic Orb Button with Official AGNI Logo */}
          <button
            type="button"
            id="home-center-siri-mic-btn"
            onClick={() => {
              if (onOpenSiri) {
                onOpenSiri();
              } else {
                onSelectTab('voice');
              }
            }}
            title="Talk to AGNI (Center Siri Mic • Tap to speak)"
            className="group relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-black text-white shadow-2xl shadow-orange-600/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer select-none border-2 border-orange-500/60 hover:border-orange-400 overflow-hidden"
          >
            {/* Animated Soundwave Orb Inner Pulse */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-600/25 via-transparent to-red-600/25 opacity-80 group-hover:opacity-100 transition-opacity" />
            
            {/* Official AGNI Logo centered */}
            <img
              src="/logo.png"
              alt="AGNI Official Logo"
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain drop-shadow-[0_0_18px_rgba(255,42,57,0.85)] group-hover:scale-110 transition-transform duration-300"
            />

            {/* Micro Mic Indicator Badge */}
            <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-red-500 text-white shadow-md border-2 border-black">
              <Mic className="h-3.5 w-3.5 animate-pulse" />
            </div>

            {/* Siri Wave Sound Indicator Dots */}
            <div className="absolute -bottom-2 flex items-center gap-1 z-20">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </button>

          <span className="mt-4 text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
            <span>Tap Siri Mic to Speak • Or Hold [Vol+] + [Power]</span>
          </span>
        </div>

        {/* 1. MESSAGE AGNI CARD (At the place of Meet the Founder) */}
        <div
          id="message-agni-card"
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-orange-500/40 bg-gradient-to-br from-neutral-950/95 via-neutral-900/90 to-orange-950/40 p-4 sm:p-5 text-left text-white shadow-xl shadow-orange-950/20 backdrop-blur-xl transition-all hover:border-orange-500/60"
        >
          {/* Subtle Orange Glow Ambient Effect */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black border border-orange-500/40 text-white shadow-md shadow-orange-600/30 overflow-hidden">
                <img src="/logo.png" alt="AGNI" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Message AGNI
                  </h3>
                  <span className="rounded-full bg-orange-500/20 border border-orange-400/40 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                    Universal AI Chat
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-0.5">
                  General Intelligence • Ask questions, write code, solve problems, or brainstorm
                </p>
              </div>
            </div>

            <button
              type="button"
              id="open-full-chat-btn"
              onClick={() => onSelectTab('chat')}
              className="flex items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/20 hover:bg-orange-500/30 px-3 py-1.5 text-xs font-bold text-orange-300 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <span>Open Chat</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Interactive Message Box */}
          <form
            onSubmit={handleSubmit}
            className="mt-3.5 relative z-10 flex items-center gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-900/90 p-1.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition shadow-inner"
          >
            <input
              type="text"
              id="home-message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Type or tap orb to speak in ${currentLang?.label || 'English'}...`}
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 outline-none"
            />
            <button
              type="button"
              onClick={toggleMic}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={isListening ? 'Stop listening' : 'Voice Dictation'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              title="Send to AGNI"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Live Voice Status for Mic Dictation */}
          <div id="live-voice-status" className={isListening ? "text-xs text-orange-400 animate-pulse mt-1.5 px-2 text-center" : "hidden"}>
            Listening... Speak now
          </div>

          {/* Quick Prompt Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 relative z-10 text-[11px]">
            <button
              type="button"
              onClick={() => onQuickPrompt('chat', 'Help me draft a well-structured essay on:')}
              className="rounded-lg border border-neutral-800 bg-white/5 px-2.5 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-orange-300 transition cursor-pointer"
            >
              ✍️ Draft an essay
            </button>
            <button
              type="button"
              onClick={() => onQuickPrompt('chat', 'Explain quantum computing in simple, engaging terms with practical examples.')}
              className="rounded-lg border border-neutral-800 bg-white/5 px-2.5 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-orange-300 transition cursor-pointer"
            >
              💡 Explain simply
            </button>
            <button
              type="button"
              onClick={() => onQuickPrompt('chat', 'Help me write and debug efficient Python code for:')}
              className="rounded-lg border border-neutral-800 bg-white/5 px-2.5 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-orange-300 transition cursor-pointer"
            >
              💻 Debug code
            </button>
            <button
              type="button"
              onClick={() => onQuickPrompt('chat', 'Summarize key takeaways and practical action points from:')}
              className="rounded-lg border border-neutral-800 bg-white/5 px-2.5 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-orange-300 transition cursor-pointer"
            >
              ⚡ Quick summary
            </button>
          </div>
        </div>

        {/* HERO FEATURE: 🔥 JARVIS MODE BUTTON */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          <button
            type="button"
            id="open-jarvis-mode-btn"
            onClick={() => onSelectTab('jarvis')}
            className="w-full py-4 px-6 rounded-2xl bg-[#0A0A0A] border-2 border-[#FF6A00] text-[#FF6A00] hover:bg-[#FF6A00]/10 hover:shadow-[0_0_35px_rgba(255,106,0,0.5)] active:scale-[0.99] transition-all duration-300 font-extrabold text-lg sm:text-xl flex items-center justify-center gap-3 cursor-pointer shadow-xl shadow-black/80 tracking-wide"
          >
            <span className="text-2xl animate-pulse">🔥</span>
            <span>JARVIS MODE</span>
          </button>
          <p className="mt-1.5 text-xs text-white/90 font-medium text-center tracking-tight">
            Free For All &bull; No Pay &bull; Any Command &bull; Open App &bull; WhatsApp &bull; Email
          </p>
        </div>

        {/* 2. AGNI HEART & MIND CARE CARD (Down the Message AGNI — Dedicated Separate Chat) */}
        <div
          id="agni-heart-mind-care-home-card"
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-neutral-950/95 via-neutral-900/90 to-rose-950/40 p-4 sm:p-5 text-left text-white shadow-xl shadow-rose-950/20 backdrop-blur-xl transition-all hover:border-rose-500/60"
        >
          {/* Subtle Rose Glow Ambient Effect */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-md shadow-rose-600/30 border border-rose-400/40">
                <Heart className="h-6 w-6 fill-current animate-pulse text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    AGNI Heart &amp; Mind Care
                  </h3>
                  <span className="rounded-full bg-rose-500/20 border border-rose-400/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    💖 Dedicated Separate Chat
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-0.5">
                  Safe sanctuary for life problems, inconveniences, tough questions &amp; reassurance
                </p>
              </div>
            </div>

            <button
              type="button"
              id="open-heart-care-btn"
              onClick={() => onSelectTab('heart_care')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:from-rose-600 hover:to-amber-600 transition cursor-pointer shrink-0"
            >
              <span>Heart Chat 💖</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Subtitle & Privacy Reassurance */}
          <div className="mt-3 relative z-10 rounded-2xl bg-rose-950/30 border border-rose-500/20 p-3">
            <p className="text-xs leading-relaxed text-rose-100">
              Dealing with frustrating inconveniences, life dilemmas, feeling bad about yourself, or healing from heartbreak? AGNI answers your questions directly, reassures your heart, and convinces you of your worth.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300/90 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>Dedicated Separate Chat • History will NOT be added to normal chat</span>
            </div>
          </div>

          {/* Quick Compassionate Prompts (Routes to separate heart_care chat!) */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-10">
            <button
              type="button"
              onClick={() =>
                onQuickPrompt(
                  'heart_care',
                  'I feel so terrible and disappointed in myself today, like I am a failure and everything went wrong. Can you talk to me, convince me with perspective, and help me feel hope again?'
                )
              }
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-neutral-900/80 p-2.5 text-left text-xs font-medium text-neutral-200 hover:border-rose-400 hover:bg-rose-950/40 transition cursor-pointer shadow-xs"
            >
              <span className="text-base">🩹</span>
              <div className="min-w-0 flex-1 truncate">
                <div className="font-semibold text-rose-200">Convince Me When Down</div>
                <div className="text-[10px] text-neutral-400 truncate">Restore self-worth &amp; hope</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onQuickPrompt(
                  'heart_care',
                  'I am facing a really difficult situation in my personal life and I have questions on what to do. Can you hear me out and give me direct, thoughtful, and practical advice?'
                )
              }
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-neutral-900/80 p-2.5 text-left text-xs font-medium text-neutral-200 hover:border-rose-400 hover:bg-rose-950/40 transition cursor-pointer shadow-xs"
            >
              <span className="text-base">❓</span>
              <div className="min-w-0 flex-1 truncate">
                <div className="font-semibold text-rose-200">Tough Questions &amp; Advice</div>
                <div className="text-[10px] text-neutral-400 truncate">Get direct, practical answers</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onQuickPrompt(
                  'heart_care',
                  'Today has been exhausting with frustrating inconveniences, hassles, and annoyances. Can I vent to you and get some calm perspective on how to deal with this?'
                )
              }
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-neutral-900/80 p-2.5 text-left text-xs font-medium text-neutral-200 hover:border-rose-400 hover:bg-rose-950/40 transition cursor-pointer shadow-xs"
            >
              <span className="text-base">😤</span>
              <div className="min-w-0 flex-1 truncate">
                <div className="font-semibold text-rose-200">Daily Inconveniences &amp; Hassles</div>
                <div className="text-[10px] text-neutral-400 truncate">Vent &amp; find peaceful clarity</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onQuickPrompt(
                  'heart_care',
                  'I recently went through a painful breakup and I feel completely broken, lonely, and heartbroken. Can you talk to me and help me through this pain?'
                )
              }
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-neutral-900/80 p-2.5 text-left text-xs font-medium text-neutral-200 hover:border-rose-400 hover:bg-rose-950/40 transition cursor-pointer shadow-xs"
            >
              <span className="text-base">💔</span>
              <div className="min-w-0 flex-1 truncate">
                <div className="font-semibold text-rose-200">Breakup &amp; Heartbreak</div>
                <div className="text-[10px] text-neutral-400 truncate">Healing emotional wounds</div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. MEET THE FOUNDER CARD (Preserved below AGNI Heart & Mind Care) */}
        <div
          id="meet-the-founder-card"
          onClick={() => handlePlayFounderSpeech()}
          title="Click to hear AGNI talk about Founder M. Sanjay"
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-neutral-950/95 via-neutral-900/90 to-orange-950/50 p-4 sm:p-5 text-left text-white shadow-xl shadow-orange-950/20 backdrop-blur-xl transition-all hover:border-orange-500/60 hover:shadow-orange-500/10 cursor-pointer group select-none"
        >
          {/* Subtle Orange Glow Ambient Effect */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl pointer-events-none group-hover:bg-orange-500/30 transition-all" />

          {/* Header Row: Founder Identity & Voice Trigger */}
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              {/* Founder Avatar with Flame / Orange Ring */}
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 text-white font-black shadow-md shadow-orange-600/30 border border-orange-400/40">
                <span className="text-sm tracking-wider">MS</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-950 text-[10px] border border-orange-500/40">
                  🔥
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-white group-hover:text-orange-300 transition-colors">
                    Meet the Founder 🫡
                  </span>
                  <span className="rounded-full bg-orange-500/20 border border-orange-400/40 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                    Founder of AGNI
                  </span>
                </div>
                <div className="text-xs text-neutral-300 mt-0.5">
                  <strong className="text-orange-400 font-semibold">M. Sanjay</strong> • Innovator
                </div>
              </div>
            </div>

            {/* Voice Trigger Button Indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePlayFounderSpeech}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm ${
                  isFounderSpeaking
                    ? 'bg-orange-500 text-white animate-pulse'
                    : 'bg-neutral-800/80 hover:bg-neutral-800 text-orange-300 border border-orange-500/30'
                }`}
              >
                <Volume2 className={`h-3.5 w-3.5 ${isFounderSpeaking ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">
                  {isFounderSpeaking ? 'Speaking...' : 'Listen in Voice'}
                </span>
              </button>
            </div>
          </div>

          {/* Description Text */}
          <div className="mt-3 relative z-10 rounded-2xl bg-neutral-900/70 border border-white/5 p-3.5 backdrop-blur-md">
            <p className="text-xs leading-relaxed text-neutral-300 font-normal">
              &quot;{customFounderBio || DEFAULT_FOUNDER_BIO}&quot;
            </p>
          </div>

          {/* Small Feature Badges */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 relative z-10 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 font-medium text-orange-300">
                <Trophy className="h-3 w-3 text-orange-400" />
                <span>Multi-Sports Person</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 font-medium text-rose-300">
                <Heart className="h-3 w-3 text-rose-400" />
                <span>Kind-Hearted</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 font-medium text-amber-300">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Innovator</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 font-medium text-emerald-300">
                <span>🇮🇳</span>
                <span>Made in India</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenTerms && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTerms('about');
                  }}
                  className="text-[11px] font-semibold text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Read Vision &rarr;
                </button>
              )}

              {/* Founder Access: STRICTLY Visible for Founder M. Sanjay 👑 */}
              {GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(authUser?.email?.toLowerCase().trim() || '') && onOpenFounderAccess && (
                <button
                  type="button"
                  id="secret-founder-access-card-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFounderAccess();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-500/25 hover:bg-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-md shadow-amber-950/40 transition-all cursor-pointer select-none animate-in fade-in"
                  title="Founder Control - Gold Access 👑"
                >
                  <Lock className="h-3 w-3 text-amber-300" />
                  <span>Founder Access</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FEATURE 4: RURAL LOW-CONNECTIVITY [GO OFFLINE] QUICK STRIP */}
        <div className="w-full max-w-2xl pt-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-950 p-3.5 shadow-sm text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                {isOfflineMode ? <WifiOff className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-neutral-100">
                    {isOfflineMode ? 'AGNI Lite Mode Active' : 'Zero-Internet Offline Study'}
                  </h4>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[9px] font-bold text-amber-300 uppercase">
                    Rural & Low-Connectivity
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Formulas, NCERT summaries, and last 20 saved chats work 100% without internet.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="homehub-go-offline-btn"
                type="button"
                onClick={() => onToggleOfflineMode?.(!isOfflineMode)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer ${
                  isOfflineMode
                    ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                    : 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                }`}
              >
                {isOfflineMode ? <WifiOff className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
                <span>{isOfflineMode ? 'Lite Mode: ON' : '[Go Offline]'}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('offline')}
                className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 p-1 cursor-pointer"
              >
                Open Bank &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* 5 REVOLUTIONARY FEATURES EVOLUTION DECK */}
        <div className="w-full max-w-2xl pt-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-300">
                AGNI Evolution — 5 Revolutionary Modes
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-orange-400">Project AGNI Next Level</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* Feature 1: AR Camera */}
            <button
              type="button"
              onClick={() => onSelectTab('vision')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-orange-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <Crosshair className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-orange-400 transition-colors">
                  1. AR Live Camera
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                  Point camera at math or circuit. AGNI overlays error boxes directly on feed!
                </p>
              </div>
            </button>

            {/* Feature 2: Voice Box Regional */}
            <button
              type="button"
              onClick={() => onSelectTab('voice')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-orange-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Mic className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-purple-300 transition-colors">
                  2. Regional Voice Box
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                  Tamil, Hindi, Telugu with Emotion Engine &amp; late-night gentle calm tone.
                </p>
              </div>
            </button>

            {/* Feature 3: AGNI Canvas */}
            <button
              type="button"
              onClick={() => onSelectTab('canvas')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-orange-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                <PenTool className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                  3. AGNI Canvas
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                  Dynamic whiteboard diagram drawer with practice test mode &amp; pen markup.
                </p>
              </div>
            </button>

            {/* Feature 4: Offline Lite */}
            <button
              type="button"
              onClick={() => onSelectTab('offline')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-orange-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <HardDrive className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-amber-300 transition-colors">
                  4. Offline Lite
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                  Saved formulas, NCERT revision &amp; chats with zero internet requirement.
                </p>
              </div>
            </button>

            {/* Feature 5: Smart Life OS */}
            <button
              type="button"
              onClick={() => onSelectTab('life_os')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-orange-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group sm:col-span-2 lg:col-span-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-teal-300 transition-colors">
                  5. Smart Life OS &amp; Study Timetable
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                  Daily briefing, Class 9/10/JEE timetable generator, goal tracking &amp; 45-min health pacer.
                </p>
              </div>
            </button>

            {/* Feature 6: Doubt Battle */}
            <button
              type="button"
              onClick={() => onSelectTab('doubt_battle')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-orange-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <span className="text-sm">⚔️</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-orange-400 transition-colors">6. Doubt Battle</div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">Challenge friends on topics — AGNI judges your explanation!</p>
              </div>
            </button>

            {/* Feature 7: TN Board Mode */}
            <button
              type="button"
              onClick={() => onSelectTab('tn_board')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-blue-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <span className="text-sm">📚</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-blue-400 transition-colors">7. TN Board Mode</div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">Samacheer Kalvi 9th–12th chapters. AGNI answers like your textbook!</p>
              </div>
            </button>

            {/* Feature 8: My Voice */}
            <button
              type="button"
              onClick={() => onSelectTab('my_voice')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-purple-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <span className="text-sm">🎙️</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-purple-400 transition-colors">8. My Voice Profile</div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">Record your voice — customise AGNI's speech to match your style!</p>
              </div>
            </button>

            {/* Feature 9: Parent Dashboard */}
            <button
              type="button"
              onClick={() => onSelectTab('parent_dashboard')}
              className="flex items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-green-500/60 p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <span className="text-sm">👨‍👩‍👧</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 group-hover:text-green-400 transition-colors">9. Parent Dashboard</div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">Parents see study time, doubts solved &amp; HeartCare usage. Privacy-safe.</p>
              </div>
            </button>
          </div>
        </div>

        {/* 4 Classic ChatGPT Starter Prompt Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl pt-2">
          {classicPromptCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                id={`chatgpt-starter-${idx}`}
                type="button"
                onClick={() => onQuickPrompt('chat', card.prompt)}
                className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 group cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 group-hover:text-orange-500 transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {card.title}
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      {card.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Hardware Key Simulator: [Vol +] & [Power] Long-Press for AGNI */}
        <div className="w-full max-w-2xl pt-1">
          <div className="relative rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/60 text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Talk to AGNI (Natural Voice Assistant)
                    </span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-semibold text-orange-800 dark:bg-orange-950/80 dark:text-orange-300">
                      Hands-Free
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Hold <strong>[Vol +]</strong> + <strong>[Power]</strong> or tap the button to talk with AGNI using natural voice output.
                  </p>
                </div>
              </div>

              {/* Hardware Button Press/Hold Trigger */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={startHardwareLongPress}
                  onMouseUp={cancelHardwareLongPress}
                  onMouseLeave={cancelHardwareLongPress}
                  onTouchStart={startHardwareLongPress}
                  onTouchEnd={cancelHardwareLongPress}
                  title="Press and hold to activate AGNI Voice"
                  className="relative overflow-hidden flex items-center gap-2 rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer select-none"
                >
                  {isHoldingHardwareKeys && (
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 opacity-60 transition-all"
                      style={{ width: `${holdProgress}%` }}
                    />
                  )}
                  <Radio className="relative z-10 h-3.5 w-3.5 text-orange-400 animate-pulse" />
                  <span className="relative z-10">
                    {isHoldingHardwareKeys ? `Holding (${holdProgress}%)...` : 'Hold [Vol+] + [Power]'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSiri?.()}
                  title="One-tap launch Talk to AGNI"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400 cursor-pointer"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
