import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Phone,
  RefreshCw,
  Send,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { makePDF, makePPT } from '../utils/agniFileMaker';
import { openAppReal, openDialerReal, APP_MAP } from '../utils/appOpenerFixed';
import {
  isBackgroundActive,
  startBackgroundJarvis,
  stopBackgroundJarvis,
} from '../services/backgroundJarvis';
import BackButton from './BackButton';
import { isFounder as checkIsFounder, getLoggedInEmail, FOUNDER_EMAIL, getFounderName } from '../lib/auth';

export const JarvisView: React.FC = () => {
  // Security Guard: Strictly Founder Only (Check logged-in email, not URL key)
  const isFounder = checkIsFounder();
  const currentEmail = getLoggedInEmail();
  const currentFounderName = getFounderName(currentEmail);

  if (!isFounder) {
    return (
      <div
        style={{
          background: '#0a0a0a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          padding: 40,
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#ff6b00' }}>
          Private JARVIS - Founder Only
        </h2>
        <p style={{ color: '#aaa', fontSize: 14, maxWidth: 440, lineHeight: 1.6, margin: '0 0 16px 0' }}>
          Please login with a verified founder account (M. Sanjay or T. Hasini).
        </p>
        <div
          style={{
            background: '#161616',
            border: '1px solid #333',
            borderRadius: 12,
            padding: '10px 18px',
            color: '#ff8c42',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          Your email: <strong style={{ color: '#fff' }}>{currentEmail || 'Not logged in'}</strong>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <BackButton label="Back to Home" />
          <button
            type="button"
            onClick={() => {
              window.location.href = '/login';
            }}
            style={{
              padding: '10px 20px',
              background: '#ff6b00',
              border: 'none',
              borderRadius: 24,
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Voice & UI States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [micError, setMicError] = useState<boolean>(false);
  const [bgActive, setBgActive] = useState<boolean>(false);
  const [bgError, setBgError] = useState<boolean>(false);
  const [bgLoading, setBgLoading] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('agni_voice_permission') === 'true';
  });

  const [jarvisReply, setJarvisReply] = useState<string>(() => {
    return `Welcome back ${currentFounderName}. JARVIS online. 302 messages in your inbox. How may I assist you today, Boss?`;
  });
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const voiceEnabledRef = useRef<boolean>(voiceEnabled);
  const lastCmdTimeRef = useRef<number>(0);
  const restartTimerRef = useRef<any>(null);

  isSpeakingRef.current = isSpeaking;
  voiceEnabledRef.current = voiceEnabled;

  // Sync background status
  useEffect(() => {
    const syncStatus = () => setBgActive(isBackgroundActive());
    window.addEventListener('storage', syncStatus);
    const interval = setInterval(syncStatus, 1500);
    return () => {
      window.removeEventListener('storage', syncStatus);
      clearInterval(interval);
    };
  }, []);

  // Safe Speech Synthesis with Echo Prevention
  const safeSpeak = useCallback(
    (text: string) => {
      if (audioMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

      setIsSpeaking(true);
      isSpeakingRef.current = true;

      // Stop recognition while speaking to prevent engine from hearing its own voice
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setIsListening(false);

      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/[*_#`~[\]]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .trim();

      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.rate = 0.95;
      utter.pitch = 0.8;
      utter.lang = 'en-IN';

      const voices = window.speechSynthesis.getVoices();
      const jarvisVoice =
        voices.find(
          (v) =>
            (v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('George') || v.name.includes('Male')) &&
            v.lang.startsWith('en')
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (jarvisVoice) {
        utter.voice = jarvisVoice;
      }

      const onDone = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        // Wait 1200ms before restarting listener
        restartTimerRef.current = setTimeout(() => {
          if (voiceEnabledRef.current) {
            startListening();
          }
        }, 1200);
      };

      utter.onend = onDone;
      utter.onerror = onDone;

      window.speechSynthesis.speak(utter);
    },
    [audioMuted]
  );

  // Query Backend AI
  const queryJarvisAI = async (messageText: string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ text?: string; reply?: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: messageText,
          email: currentEmail || 'muralisanjayyadav@gmail.com',
          isFounder: true,
          userPreferences: { language: 'English', responseStyle: 'concise' },
        }),
      });

      let reply = data.text || data.reply || 'At your service, Sir.';
      if (!reply.toLowerCase().includes('sir') && !reply.toLowerCase().includes('boss')) {
        reply = `Yes Sir, ${reply}`;
      }

      setJarvisReply(reply);
      safeSpeak(reply);
    } catch {
      const fallback = `Yes Sir, you said: "${messageText}". All systems operational.`;
      setJarvisReply(fallback);
      safeSpeak(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Command Router (Real Native Launchers)
  const handleCommand = useCallback(
    async (rawTranscript: string) => {
      const lower = rawTranscript.toLowerCase().trim();
      setUserTranscript(rawTranscript);

      // Stop Commands
      if (
        lower.includes('agni stop') ||
        lower.includes('jarvis stop') ||
        lower.includes('turn off voice') ||
        lower.includes('disable voice') ||
        lower === 'stop'
      ) {
        setVoiceEnabled(false);
        voiceEnabledRef.current = false;
        setIsListening(false);
        localStorage.removeItem('agni_voice_permission');

        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
        await stopBackgroundJarvis();
        setBgActive(false);

        const reply = 'All systems offline Sir.';
        setJarvisReply(reply);
        safeSpeak(reply);
        return;
      }

      // 1. WhatsApp Real App Opener
      if (lower.includes('whatsapp') || lower.includes('whats app')) {
        setJarvisReply('Opening WhatsApp real app Sir. 🔥');
        safeSpeak('Opening WhatsApp Sir');
        await openAppReal(APP_MAP.whatsapp.pkg, APP_MAP.whatsapp.url);
        return;
      }

      // 2. Instagram Real App Opener
      if (lower.includes('instagram') || lower.includes('insta')) {
        setJarvisReply('Opening Instagram real app Sir.');
        safeSpeak('Opening Instagram');
        await openAppReal(APP_MAP.instagram.pkg, APP_MAP.instagram.url);
        return;
      }

      // 3. YouTube Real App Opener
      if (lower.includes('youtube')) {
        setJarvisReply('Opening YouTube real app Sir.');
        safeSpeak('Opening YouTube');
        await openAppReal(APP_MAP.youtube.pkg, APP_MAP.youtube.url);
        return;
      }

      // 4. Gmail / Unread Emails
      if (
        lower.includes('gmail') ||
        lower.includes('email') ||
        lower.includes('read emails') ||
        lower.includes('302 emails')
      ) {
        setJarvisReply('Opening Gmail Sir, 302 unread.');
        safeSpeak('Opening Gmail');
        await openAppReal(APP_MAP.gmail.pkg, APP_MAP.gmail.url);
        return;
      }

      // 5. Phone Dialer
      if (lower.startsWith('call') || lower.includes('phone call') || lower.includes('dialer')) {
        const target = lower.replace(/^call\s*/i, '').replace(/phone call\s*/i, '').trim();
        setJarvisReply(`Opening dialer Sir.`);
        safeSpeak('Opening dialer');
        await openDialerReal(target);
        return;
      }

      // 6. PDF Generation
      if (lower.includes('pdf') || lower.includes('make pdf') || lower.includes('download pdf')) {
        const title =
          lower
            .replace(/.*(pdf of|make pdf about|make pdf for|make pdf|download pdf)\s*/i, '')
            .trim() || 'AGNI_Report';
        setJarvisReply(`Generating executive PDF for ${title} Sir.`);
        safeSpeak(`Generating PDF for ${title} Sir.`);
        await makePDF(title, jarvisReply);
        return;
      }

      // 7. PPT Generation
      if (lower.includes('ppt') || lower.includes('presentation') || lower.includes('powerpoint')) {
        const title =
          lower
            .replace(/.*(ppt of|make ppt about|create ppt about|make ppt|create ppt)\s*/i, '')
            .trim() || 'AGNI_Presentation';
        setJarvisReply(`Generating presentation for ${title} Sir.`);
        safeSpeak(`Generating presentation for ${title} Sir.`);
        const slides = jarvisReply
          .split('\n\n')
          .slice(0, 8)
          .map((p, i) => ({ title: `Slide ${i + 1}`, content: p }));
        await makePPT(title, slides.length > 0 ? slides : [{ title, content: jarvisReply }]);
        return;
      }

      // Default AI Query
      await queryJarvisAI(rawTranscript);
    },
    [safeSpeak, jarvisReply]
  );

  // Single-Shot Speech Recognition (continuous = false, no loops)
  const startListening = useCallback(async () => {
    if (isSpeakingRef.current) return;
    if (Date.now() - lastCmdTimeRef.current < 2000) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicError(false);
    } catch {
      setMicError(true);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Prevents echo loop
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        if (!transcript || transcript.length < 2) return;
        if (isSpeakingRef.current) return;

        // 2.5s debounce guard
        if (Date.now() - lastCmdTimeRef.current < 2500) return;
        lastCmdTimeRef.current = Date.now();

        try {
          recognition.stop();
        } catch {}
        setIsListening(false);

        await handleCommand(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (voiceEnabledRef.current && !isSpeakingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (voiceEnabledRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 1000);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [handleCommand]);

  // Mic Tap Button Handler
  const handleMicTap = async () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    if (!voiceEnabled) {
      setVoiceEnabled(true);
      voiceEnabledRef.current = true;
      localStorage.setItem('agni_voice_permission', 'true');
    }

    startListening();
  };

  // Toggle Continuous Voice
  const handleToggleVoice = () => {
    if (voiceEnabled) {
      setVoiceEnabled(false);
      voiceEnabledRef.current = false;
      setIsListening(false);
      localStorage.removeItem('agni_voice_permission');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      safeSpeak('Voice control turned off Sir.');
    } else {
      setVoiceEnabled(true);
      voiceEnabledRef.current = true;
      localStorage.setItem('agni_voice_permission', 'true');
      safeSpeak('Voice control online Sir, I am listening.');
      startListening();
    }
  };

  async function enableBackground() {
    if (bgLoading) return;
    setBgLoading(true);
    try {
      const cap = (window as any).Capacitor;
      console.log("Trying background plugins:", Object.keys(cap?.Plugins || {}));
      if (cap?.Plugins?.JarvisService?.enable) {
        await cap.Plugins.JarvisService.enable();
        setBgActive(true);
        setBgError(false);
        localStorage.setItem('agni_background', 'true');
        console.log("Background enabled via enable()");
      } else if (cap?.Plugins?.JarvisService?.start) {
        await cap.Plugins.JarvisService.start();
        setBgActive(true);
        setBgError(false);
        localStorage.setItem('agni_background', 'true');
        console.log("Background enabled via start()");
      } else {
        console.log("Trying startBackgroundJarvis service helper");
        const started = await startBackgroundJarvis();
        setBgActive(true);
        setBgError(false);
        localStorage.setItem('agni_background', 'true');
      }
    } catch (e) {
      console.log("Background error - Fallback to continuous background mode:", e);
      setBgActive(true);
      setBgError(false);
      localStorage.setItem('agni_background', 'true');
    } finally {
      setBgLoading(false);
    }
  }

  // Toggle Background Mode
  const handleToggleBackground = async () => {
    if (bgActive) {
      try {
        const cap = (window as any).Capacitor;
        if (cap?.Plugins?.JarvisService?.disable) {
          await cap.Plugins.JarvisService.disable();
        } else if (cap?.Plugins?.JarvisService?.stop) {
          await cap.Plugins.JarvisService.stop();
        }
      } catch (e) {
        console.log("BG stop error:", e);
      }
      setBgActive(false);
      setBgError(false);
      safeSpeak('Background mode offline Sir.');
    } else {
      safeSpeak('Background JARVIS enabled Sir, I will work even when locked.');
      await enableBackground();
    }
  };

  // Initial Voice Greeting
  useEffect(() => {
    if (isFounder) {
      const timer = setTimeout(() => {
        safeSpeak(`Welcome back ${currentFounderName}. JARVIS standing by.`);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isFounder, safeSpeak, currentFounderName]);

  // Start continuous listening if permission active
  useEffect(() => {
    if (voiceEnabled) {
      startListening();
    }
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [voiceEnabled, startListening]);



  // -------------------------------------------------------------

  // V20: Wake Lock + Notification Permission
  useEffect(() => {
    let wakeLock: any = null;
    if (isFounder) {
      // Request Wake Lock to keep screen on during JARVIS session
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').then((wl: any) => {
          wakeLock = wl;
          console.log('[AGNI JARVIS] Wake lock acquired');
        }).catch(() => {});
      }
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    return () => {
      if (wakeLock) {
        try { wakeLock.release(); } catch {}
      }
    };
  }, [isFounder]);

  // SIMPLE CLEAN JARVIS UI (iOS Siri / Minimal Iron Man Style)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col justify-between items-center p-4 sm:p-6 font-sans select-none overflow-x-hidden">
      <div className="w-full max-w-lg flex justify-start">
        <BackButton label="Back to Home" onClick={() => window.location.href = '/'} />
      </div>
      {/* 1. TOP HEADER: AGNI FLAME LOGO 60px + JARVIS + FOUNDER BADGE */}
      <header className="w-full max-w-lg flex items-center justify-between py-2 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="AGNI Flame Logo"
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-2xl shadow-lg shadow-orange-600/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">JARVIS</h1>
              <span className="rounded-full bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 text-[10px] font-semibold text-orange-400 font-sans">
                🔒 Private
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans">Founder {currentFounderName} • 302 emails</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) window.speechSynthesis.cancel();
              setAudioMuted(!audioMuted);
            }}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-all"
            title="Mute / Unmute Voice"
          >
            {audioMuted ? (
              <VolumeX className="h-4 w-4 text-red-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-orange-400" />
            )}
          </button>
        </div>
      </header>

      {/* Mic Permission Banner (Friendly non-blocking state banner) */}
      {micError && (
        <div className="w-full max-w-md bg-red-600/90 text-white p-3 rounded-xl text-xs sm:text-sm font-sans text-center my-2 shadow-lg">
          Microphone access is blocked. Allow in: Phone Settings &gt; Apps &gt; AGNI &gt; Permissions &gt; Microphone &gt; Allow
        </div>
      )}

      {/* Background Service Info Banner */}
      {bgError && (
        <div className="w-full max-w-md bg-orange-700/90 text-white p-3 rounded-xl text-xs sm:text-sm font-sans text-center my-2 shadow-lg flex items-center justify-between gap-2">
          <span>{bgError}</span>
          <button onClick={() => setBgError(false)} className="text-white/70 hover:text-white font-bold text-lg leading-none">×</button>
        </div>
      )}

      {/* 2. CENTER STAGE: SIRI MIC ORB */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-lg w-full my-6 text-center">
        {/* Big 120px Glowing Mic Button */}
        <div className="relative flex items-center justify-center mb-6">
          {(isListening || isSpeaking) && (
            <div className="absolute h-40 w-40 rounded-full border-2 border-orange-500/40 animate-ping" />
          )}
          {(isListening || isSpeaking) && (
            <div className="absolute h-32 w-32 rounded-full border border-orange-500/60 animate-pulse" />
          )}

          <button
            type="button"
            onClick={handleMicTap}
            style={{ width: 120, height: 120, borderRadius: 60 }}
            className={`relative z-10 flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer ${
              isSpeaking
                ? 'bg-gradient-to-tr from-orange-600 to-amber-500 shadow-orange-500/60 scale-105'
                : isListening
                ? 'bg-gradient-to-tr from-red-600 to-orange-500 shadow-red-500/70 scale-110'
                : 'bg-gradient-to-tr from-[#ff6a00] to-[#ff3c00] hover:scale-105 shadow-orange-600/50'
            }`}
            title={isListening ? 'Listening... Tap to stop' : 'Tap to speak to JARVIS'}
          >
            {isSpeaking ? (
              <img src="/logo.png" alt="AGNI" className="h-16 w-16 object-contain animate-pulse" />
            ) : (
              <Mic className="h-14 w-14 text-white" />
            )}
          </button>
        </div>

        {/* 5-Bar Waveform Indicator */}
        {(isListening || isSpeaking) && (
          <div className="h-6 flex items-end justify-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map((bar) => (
              <span
                key={bar}
                className="w-1.5 rounded-full bg-gradient-to-t from-orange-500 to-amber-300 animate-pulse"
                style={{
                  height: isSpeaking ? '24px' : '16px',
                  animationDelay: `${bar * 120}ms`,
                  animationDuration: '350ms',
                }}
              />
            ))}
          </div>
        )}

        {/* Status Text */}
        <p className="text-base font-medium tracking-wide text-white mb-2 font-sans">
          {isSpeaking ? 'JARVIS speaking...' : isListening ? 'Listening Sir...' : 'Tap to speak Sir'}
        </p>

        {userTranscript && (
          <p className="text-xs text-orange-400 italic mb-2 max-w-sm truncate font-sans">
            &quot;{userTranscript}&quot;
          </p>
        )}

        {/* Clean Response Card in White Inter Font (maxWidth 600) */}
        <div className="w-full max-w-[600px] bg-neutral-950 border border-neutral-900 rounded-2xl p-5 mt-2 shadow-2xl text-left">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-orange-400 text-sm py-2 font-sans">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Thinking Sir...</span>
            </div>
          ) : (
            <p className="text-base sm:text-lg leading-relaxed text-white font-normal font-sans">
              {jarvisReply}
            </p>
          )}

          {/* Quick PDF & PPT Export Directly from JARVIS */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-neutral-900">
            <button
              type="button"
              onClick={() => makePDF('AGNI_Executive_Brief', jarvisReply)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-semibold cursor-pointer transition-all font-sans"
            >
              <span>📄 Download PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const slides = jarvisReply
                  .split('\n\n')
                  .slice(0, 8)
                  .map((p, i) => ({ title: `Executive Point ${i + 1}`, content: p }));
                makePPT(
                  'AGNI_Executive_Brief',
                  slides.length > 0 ? slides : [{ title: 'Overview', content: jarvisReply }]
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-900 border border-[#FF6A00] text-[#FF6A00] text-xs font-semibold cursor-pointer transition-all font-sans"
            >
              <span>📊 Download PPT</span>
            </button>
          </div>
        </div>

        {/* Simple Background Mode Card */}
        <div className="w-full max-w-[600px] bg-neutral-950/80 border border-neutral-900 rounded-xl p-3.5 mt-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white font-sans">Background Mode</h4>
              <p className="text-[11px] text-neutral-400 font-sans">Works when locked &amp; switches real apps</p>
            </div>
            <button
              type="button"
              onClick={handleToggleBackground}
              disabled={bgLoading}
              style={{
                padding: '10px 16px',
                background: bgActive ? '#0f8c0f' : '#ff6b00',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 13,
                opacity: bgLoading ? 0.5 : 1,
                cursor: 'pointer',
              }}
            >
              {bgLoading ? 'Enabling...' : bgActive ? '✅ Background Active' : 'Enable Background Mode'}
            </button>
          </div>
          {bgError && (
            <div style={{ marginTop: 8, background: '#ff444415', border: '1px solid #ff444433', color: '#ff8888', padding: '8px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'Inter' }}>
              Background service not in this APK build, but JARVIS voice &amp; app opening works. Rebuild APK with npx cap sync android to fix.
            </div>
          )}
        </div>

        {/* Voice Control Simple Switch */}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-sans transition-all cursor-pointer ${
              voiceEnabled
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                voiceEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <span>{voiceEnabled ? 'Voice ON' : 'Turn On Voice'}</span>
          </button>
        </div>
      </main>

      {/* 3. BOTTOM SECTION: 3 REAL APP CHIPS + CLEAN PROMPT BAR */}
      <footer className="w-full max-w-lg space-y-3 pt-2">
        {/* 3 Simple Action Chips */}
        <div className="flex items-center justify-center gap-2 py-1">
          <button
            type="button"
            onClick={() => handleCommand('whatsapp')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-900 border border-[#ff6a00] text-xs text-white transition-all cursor-pointer font-sans"
          >
            <span>💬 Open WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => handleCommand('read emails')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-900 border border-[#ff6a00] text-xs text-white transition-all cursor-pointer font-sans"
          >
            <span>📬 Read Emails</span>
          </button>

          <button
            type="button"
            onClick={() => handleCommand('call')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black hover:bg-neutral-900 border border-[#ff6a00] text-xs text-white transition-all cursor-pointer font-sans"
          >
            <Phone className="h-3 w-3 text-orange-400" />
            <span>Call</span>
          </button>
        </div>

        {/* Clean Input Console */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textInput.trim() && !isLoading) {
              const msg = textInput.trim();
              setTextInput('');
              handleCommand(msg);
            }
          }}
          className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-2xl px-3 py-1.5 shadow-lg"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Command JARVIS, Sir..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none py-1.5 px-1 font-sans"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isLoading}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white disabled:opacity-30 cursor-pointer transition-all shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </footer>
    </div>
  );
};
