import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Phone,
  Send,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Volume2,
} from 'lucide-react';
import { openAppSafe } from '../services/appOpenerFixed';
import { stopBackgroundJarvis } from '../services/backgroundJarvis';

interface VoiceControlProps {
  isFounder: boolean;
  onSpeak: (text: string) => void;
  onDispatchChat: (text: string) => void;
  isSpeaking: boolean;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  isFounder,
  onSpeak,
  onDispatchChat,
  isSpeaking: parentIsSpeaking,
}) => {
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('agni_voice_permission') === 'true';
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [commandFeedback, setCommandFeedback] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(parentIsSpeaking);
  const voiceEnabledRef = useRef<boolean>(voiceEnabled);
  const lastCmdTimeRef = useRef<number>(0);
  const startListeningTimerRef = useRef<any>(null);

  isSpeakingRef.current = parentIsSpeaking;
  voiceEnabledRef.current = voiceEnabled;

  // Dedicated Safe Speak that stops speech recognition and waits 1.2s before re-listening
  const safeSpeak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    isSpeakingRef.current = true;

    // Immediately stop listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setIsListening(false);

    window.speechSynthesis.cancel();

    // Clean text for speech
    const cleanText = text.replace(/[*_#`~[\]]/g, '').replace(/https?:\/\/\S+/g, 'link').trim();
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = 0.9;
    utter.pitch = 0.7; // British / Iron Man Jarvis tone
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

    const resumeListeningAfterSpeech = () => {
      isSpeakingRef.current = false;
      if (startListeningTimerRef.current) clearTimeout(startListeningTimerRef.current);
      // Wait 1200ms after speech ends before starting recognition
      startListeningTimerRef.current = setTimeout(() => {
        if (voiceEnabledRef.current) {
          startListening();
        }
      }, 1200);
    };

    utter.onend = resumeListeningAfterSpeech;
    utter.onerror = resumeListeningAfterSpeech;

    window.speechSynthesis.speak(utter);
  }, []);

  // Safe Command Handler - NO window.location.href EVER!
  const handleCommand = useCallback(
    async (rawTranscript: string) => {
      if (isSpeakingRef.current) return;

      const text = rawTranscript.trim().toLowerCase();
      setLiveTranscript(rawTranscript);
      setLastCommand(rawTranscript);

      console.log('JARVIS executing command:', text);

      // 1. STOP COMMANDS
      if (
        text.includes('agni stop') ||
        text.includes('jarvis stop') ||
        text.includes('turn off voice') ||
        text.includes('disable voice') ||
        text === 'stop' ||
        text === 'stop listening'
      ) {
        setCommandFeedback('🔴 Voice Control Terminated via Voice Directive');
        setVoiceEnabled(false);
        setIsListening(false);
        localStorage.removeItem('agni_voice_permission');

        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
        await stopBackgroundJarvis();
        safeSpeak('Voice control disabled Sir, returning to normal mode.');
        return;
      }

      // 2. OPEN APPS SAFE - Uses AppLauncher & hidden iframe - NEVER window.location.href
      if (
        text.includes('open whatsapp') ||
        text.includes('open instagram') ||
        text.includes('open youtube') ||
        text.includes('open gmail') ||
        text.includes('open maps') ||
        text.includes('open camera') ||
        text.includes('open chrome') ||
        text.includes('open spotify') ||
        text.includes('open telegram') ||
        text.includes('open dialer') ||
        text.startsWith('open ')
      ) {
        const appName = text.replace(/^open\s+/i, '').trim();
        setCommandFeedback(`Executing safe launch protocol for ${appName}...`);
        safeSpeak(`Opening ${appName} Sir.`);
        (window as any).isOpeningApp = true;
        await openAppSafe(appName);
        setTimeout(() => {
          (window as any).isOpeningApp = false;
        }, 3000);
        return;
      }

      // 3. TELEPHONY / CALLS - Safe window.open _blank, NEVER window.location.href
      if (text.startsWith('call ') || text.includes('phone call')) {
        const target = text.replace(/^call\s+/i, '').replace(/phone call\s+/i, '').trim();
        setCommandFeedback(`Opening telephony dialer for ${target}...`);
        safeSpeak(`Calling ${target} Sir.`);
        setTimeout(() => {
          (window as any).isOpeningApp = true;
          window.open(`tel:${encodeURIComponent(target)}`, '_blank');
          setTimeout(() => {
            (window as any).isOpeningApp = false;
          }, 2000);
        }, 500);
        return;
      }

      // 4. WHATSAPP MESSAGE - Safe window.open _blank, NEVER window.location.href
      if (
        text.startsWith('type message ') ||
        text.startsWith('send whatsapp message ') ||
        text.startsWith('send whatsapp ') ||
        text.startsWith('reply ')
      ) {
        const msg = text
          .replace(/^(type message|send whatsapp message|send whatsapp|reply)\s+/i, '')
          .trim();
        setCommandFeedback(`Dispatching WhatsApp message: "${msg}"...`);
        safeSpeak('Sir, WhatsApp opened with your message, please tap send.');
        setTimeout(() => {
          (window as any).isOpeningApp = true;
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          setTimeout(() => {
            (window as any).isOpeningApp = false;
          }, 2000);
        }, 500);
        return;
      }

      // 5. EMAIL - Safe window.open _blank, NEVER window.location.href
      if (text.startsWith('send email ') || text.startsWith('draft email ')) {
        const emailBody = text.replace(/^(send email|draft email)\s+/i, '').trim();
        setCommandFeedback(`Drafting executive email: "${emailBody}"...`);
        safeSpeak('Email draft ready Sir.');
        setTimeout(() => {
          (window as any).isOpeningApp = true;
          window.open(
            `mailto:muralisanjayyadav@gmail.com?body=${encodeURIComponent(emailBody)}`,
            '_blank'
          );
          setTimeout(() => {
            (window as any).isOpeningApp = false;
          }, 2000);
        }, 500);
        return;
      }

      // 6. GENERAL DIRECTIVES -> Routed to AGNI AI
      onDispatchChat(rawTranscript);
    },
    [safeSpeak, onDispatchChat]
  );

  // Single-Shot Speech Recognition Setup with 2.5s Debounce & Anti-Loop Guard
  const startListening = useCallback(() => {
    if (isSpeakingRef.current) return;
    if (Date.now() - lastCmdTimeRef.current < 2000) return;
    if (!voiceEnabledRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // MUST BE FALSE! Prevents browser voice loop
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        if (!transcript || transcript.length < 3) return;
        if (isSpeakingRef.current) return;

        // 2.5-second debounce guard
        if (Date.now() - lastCmdTimeRef.current < 2500) return;
        lastCmdTimeRef.current = Date.now();

        console.log('CMD:', transcript);

        // Stop listening BEFORE handling to prevent double trigger / hearing itself
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
        // Only restart if voice enabled and not speaking
        if (voiceEnabledRef.current && !isSpeakingRef.current) {
          if (startListeningTimerRef.current) clearTimeout(startListeningTimerRef.current);
          startListeningTimerRef.current = setTimeout(() => {
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

  // Handle Voice Permission / Activation
  const handleEnableVoiceControl = async () => {
    if (!isFounder) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      setVoiceEnabled(true);
      localStorage.setItem('agni_voice_permission', 'true');
      voiceEnabledRef.current = true;

      // Safe speak first - startListening will only fire 1.2s after speech ends!
      safeSpeak('Voice control enabled Sir, I am listening.');
    } catch {
      console.warn('Microphone access denied. Please allow microphone permissions in your browser address bar.');
    }
  };

  // Disable Voice Control Manually
  const handleDisableVoiceControl = () => {
    setVoiceEnabled(false);
    setIsListening(false);
    voiceEnabledRef.current = false;
    localStorage.removeItem('agni_voice_permission');

    if (startListeningTimerRef.current) clearTimeout(startListeningTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    safeSpeak('Voice control manually disabled Sir.');
  };

  // Lifecycle Sync
  useEffect(() => {
    if (voiceEnabled) {
      startListening();
    }
    return () => {
      if (startListeningTimerRef.current) clearTimeout(startListeningTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [voiceEnabled, startListening]);

  if (!isFounder) return null;

  return (
    <div className="w-full bg-[#050505] border-b border-[#ff6a00]/30 px-4 py-3 select-none">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* State 1: Disabled -> Big Pulsing Button */}
        {!voiceEnabled ? (
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6a00]/10 border border-[#ff6a00]/40 text-[#ff6a00]">
                <MicOff className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-sans text-xs font-bold text-white flex items-center gap-2">
                  <span>JARVIS Native Apps</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Standby</span>
                </h3>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Controls Native WhatsApp, Instagram, YouTube, Maps, Camera, Calls &amp; System.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnableVoiceControl}
              className="flex items-center gap-2 rounded-xl border border-[#ff6a00] bg-black px-4 py-2.5 text-xs font-bold font-sans text-[#ff6a00] shadow-[0_0_15px_rgba(255,106,0,0.3)] hover:bg-[#ff6a00]/15 hover:shadow-[0_0_25px_rgba(255,106,0,0.6)] cursor-pointer transition-all animate-pulse shrink-0 tracking-wide"
            >
              <Mic className="h-4 w-4" />
              <span>🎙️ Enable Voice Control (Manual Permission)</span>
            </button>
          </div>
        ) : (
          /* State 2: Active -> Continuous Listening HUD */
          <div className="flex flex-col w-full gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950/90 border border-emerald-500/40 rounded-xl px-4 py-2.5 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <div>
                  <span className="font-sans text-xs font-bold text-emerald-400">
                    🟢 Voice is active
                  </span>
                  <span className="text-[11px] text-neutral-300 font-sans ml-2">
                    Say <strong className="text-white">&quot;AGNI STOP&quot;</strong> or <strong className="text-white">&quot;JARVIS STOP&quot;</strong> to disable
                  </span>
                </div>
              </div>

              {/* Manual Turn OFF */}
              <button
                type="button"
                onClick={handleDisableVoiceControl}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-1.5 text-xs font-sans font-semibold text-red-300 hover:bg-red-900/60 hover:text-white cursor-pointer transition-all shrink-0"
              >
                <span>🔴 Turn Off Voice</span>
              </button>
            </div>

            {/* Continuous Voice Feedback / Big Mic Pulse */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black/80 border border-[#ff6a00]/30 rounded-xl p-3">
              <div className="flex items-center gap-4">
                {/* 80px Pulsing Mic Indicator */}
                <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 shadow-[0_0_25px_rgba(255,106,0,0.6)] animate-pulse shrink-0">
                  <Mic className="h-8 w-8 text-white" />
                  {isListening && (
                    <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-30" />
                  )}
                </div>

                <div>
                  <div className="font-sans text-xs text-[#ff6a00] font-semibold flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 animate-pulse text-[#ff6a00]" />
                    <span>Listening...</span>
                  </div>
                  <p className="font-sans text-sm text-white font-semibold mt-0.5">
                    {liveTranscript ? `You said: "${liveTranscript}"` : 'Listening for phone directive (e.g. "Open WhatsApp", "Call John")...'}
                  </p>
                  {commandFeedback && (
                    <p className="text-[11px] text-cyan-400 font-sans mt-0.5 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <span>{commandFeedback}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Last Executed Command History */}
              {lastCommand && (
                <div className="hidden sm:flex flex-col items-end text-right font-sans text-[10px] text-neutral-400 bg-neutral-900/70 border border-neutral-800 px-3 py-1.5 rounded-lg">
                  <span className="text-neutral-500 font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    Last Executed
                  </span>
                  <span className="text-orange-300 font-semibold truncate max-w-[200px]">{lastCommand}</span>
                </div>
              )}
            </div>

            {/* Quick Directive Reference Cards for Phone Control */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-sans text-neutral-400">
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-2">
                <span className="text-white font-bold block mb-0.5 flex items-center gap-1">
                  <Smartphone className="h-3 w-3 text-emerald-400" />
                  &quot;Open WhatsApp&quot;
                </span>
                <span>Safe App Opening (No Reload)</span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-2">
                <span className="text-white font-bold block mb-0.5 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-cyan-400" />
                  &quot;Call [Name]&quot;
                </span>
                <span>Direct Telephony Dialer</span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-2">
                <span className="text-white font-bold block mb-0.5 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 text-orange-400" />
                  &quot;Open [App]&quot;
                </span>
                <span>YouTube, Instagram, Maps</span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-2">
                <span className="text-red-400 font-bold block mb-0.5 flex items-center gap-1">
                  <MicOff className="h-3 w-3 text-red-400" />
                  &quot;AGNI STOP&quot;
                </span>
                <span>Instant Kill-Switch</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
