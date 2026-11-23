import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowRight,
  Flame,
  MessageSquare,
  Square,
  Send,
  Radio,
  RotateCcw,
  Play,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  HelpCircle,
  Zap,
  User,
  Bot,
  Layers,
  Compass,
  FileSearch,
  BookOpen,
  Globe,
} from 'lucide-react';
import { UserPreferences, LanguageCode, TabMode, AuthUser } from '../types';
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
} from '../utils/speech';
import { apiFetch } from '../utils/api';
import { getLanguageOption } from '../data/languages';
import { VoiceWaveChart } from './VoiceWaveChart';

export interface VoiceDialogueItem {
  id: string;
  speaker: 'user' | 'agni';
  text: string;
  timestamp: string;
  isPodcast?: boolean;
}

interface SiriVoiceOverlayProps {
  isOpen: boolean;
  isExpanded?: boolean;
  onClose: () => void;
  onToggleExpand?: (expanded: boolean) => void;
  onTransferToChat: (userText: string, assistantReply?: string) => void;
  userPreferences: UserPreferences;
  onUpdatePreferences?: (updated: Partial<UserPreferences>) => void;
  memories: string[];
  onOpenTerms?: () => void;
  onUpdateLanguage?: (lang: LanguageCode) => void;
  onNavigateTab?: (tab: TabMode) => void;
  authUser?: AuthUser | null;
}

const PRESET_SUGGESTIONS = [
  { label: 'Draw Diagram', query: 'Draw a clear structured diagram and visual explanation for this concept.' },
  { label: 'Lab Simulation', query: 'Walk me through an interactive step-by-step lab simulation experiment.' },
  { label: 'Scan Notebook', query: 'Help me review and summarize my handwritten study notes with key formulas.' },
  { label: 'Hinglish Mode', isAction: true },
];

const PRESET_TOPICS = [
  'Explain Newton\'s third law of motion',
  'What are the best habits for exam preparation?',
  'Tell me an inspiring story about Indian science',
  'Important physics formulas to revise right now',
];

export const SiriVoiceOverlay: React.FC<SiriVoiceOverlayProps> = ({
  isOpen,
  isExpanded = false,
  onClose,
  onToggleExpand,
  onTransferToChat,
  userPreferences,
  onUpdatePreferences,
  memories,
  onOpenTerms,
  onUpdateLanguage,
  onNavigateTab,
  authUser,
}) => {
  // Unified State (Single Brain)
  const [expanded, setExpanded] = useState<boolean>(isExpanded);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [speakAloud, setSpeakAloud] = useState(true);
  const [lastUserQuery, setLastUserQuery] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [streamedReply, setStreamedReply] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isContinuous, setIsContinuous] = useState(true);
  const [isPodcastMode, setIsPodcastMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeLang, setActiveLang] = useState<LanguageCode>(userPreferences.language || 'english');
  // AGNI uses a signature natural voice profile
  const selectedVoice = 'Aoede' as const;
  const [voiceSpeed, setVoiceSpeed] = useState<number>(userPreferences.voiceSpeed || 0.95);

  // Single Dialogue History across Mini and Expanded
  const [dialogueHistory, setDialogueHistory] = useState<VoiceDialogueItem[]>(() => {
    try {
      const saved = localStorage.getItem('agni_voicebox_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'init-voice',
        speaker: 'agni',
        text: 'Hello, welcome to AGNI Voice Box! I am your companion created by Founder M. Sanjay. Tap the orb or say anything to start.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Keep local storage synchronized
  useEffect(() => {
    try {
      localStorage.setItem('agni_voicebox_history', JSON.stringify(dialogueHistory.slice(-20)));
    } catch {}
  }, [dialogueHistory]);

  // Sync expanded prop
  useEffect(() => {
    setExpanded(isExpanded);
  }, [isExpanded]);

  const handleSetExpanded = (val: boolean) => {
    setExpanded(val);
    onToggleExpand?.(val);
  };

  // Web Audio API refs for real-time microphone waveform
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Recognition, continuous timers & dialogue auto-scroll
  const recognitionRef = useRef<any | null>(null);
  const transcriptRef = useRef<string>('');
  const activeRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const streamIntervalRef = useRef<any>(null);
  const continuousTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  // High-reliability MediaRecorder & audio chunks for universal voice input
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isTranscribingRef = useRef<boolean>(false);
  const hasSpokenRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll dialogue transcript in expanded mode
  useEffect(() => {
    if (expanded) {
      dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogueHistory, interimTranscriptCount(transcript, streamedReply), expanded]);

  function interimTranscriptCount(t: string, r: string) {
    return `${t.length}-${r.length}`;
  }

  // Supported regional languages with native typography
  const supportedLanguages: { id: LanguageCode; label: string; speechCode: string; nativeName: string }[] = [
    { id: 'tamil', label: 'Tamil', speechCode: 'ta-IN', nativeName: 'தமிழ்' },
    { id: 'hindi', label: 'Hindi', speechCode: 'hi-IN', nativeName: 'हिन्दी' },
    { id: 'telugu', label: 'Telugu', speechCode: 'te-IN', nativeName: 'తెలుగు' },
    { id: 'kannada', label: 'Kannada', speechCode: 'kn-IN', nativeName: 'ಕನ್ನಡ' },
    { id: 'malayalam', label: 'Malayalam', speechCode: 'ml-IN', nativeName: 'മലയാളം' },
    { id: 'marathi', label: 'Marathi', speechCode: 'mr-IN', nativeName: 'मराठी' },
    { id: 'hinglish', label: 'Hinglish', speechCode: 'hi-IN', nativeName: 'Hinglish' },
    { id: 'english', label: 'English', speechCode: 'en-IN', nativeName: 'English (India)' },
  ];

  const currentLangConfig =
    supportedLanguages.find((l) => l.id.toLowerCase() === activeLang.toLowerCase()) || supportedLanguages[0];

  // Emotion and Night Calm Detection Engine
  const currentHour = new Date().getHours();
  const isLateNight = currentHour >= 21 || currentHour < 6;
  const [detectedEmotion, setDetectedEmotion] = useState<'calm_night' | 'encouraging' | 'focused' | 'energetic'>(
    isLateNight ? 'calm_night' : 'focused'
  );

  // Clean up Web Audio resources
  const cleanupAudioStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
  };

  // Stop recognition and recording
  const stopListening = () => {
    if (continuousTimerRef.current) {
      clearTimeout(continuousTimerRef.current);
      continuousTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current && activeRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      activeRef.current = false;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    cleanupAudioStream();
    if (voiceState === 'listening') {
      setVoiceState('idle');
    }
  };

  const clearStreamInterval = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
  };

  // Auto-start listening on open, or speak founder greeting if recognized founder
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setErrorMessage(null);

      if (authUser?.isFounder) {
        // Founder recognized in Voice Box!
        const founderGreeting = `Hii ${authUser?.name || "Founder"}, I am proud to meet my founder! How can I help you today, boss?`;
        setVoiceState('speaking');
        setStreamedReply(founderGreeting);
        setLastReply(founderGreeting);
        speakText(founderGreeting, {
          rate: voiceSpeed,
          pitch: 1.05,
          volume: 1.0,
          profile: userPreferences.voiceProfile || 'natural-warm',
          lang: currentLangConfig.speechCode || 'en-IN',
          onEnd: () => {
            setVoiceState('idle');
            startListening();
          },
        });
      } else {
        const timer = setTimeout(() => {
          startListening();
        }, 350);
        return () => clearTimeout(timer);
      }
    } else {
      stopListening();
      stopSpeaking();
      clearStreamInterval();
    }

    return () => {
      stopListening();
      stopSpeaking();
      clearStreamInterval();
    };
  }, [isOpen, authUser?.isFounder]);

  // Sync active language with userPreferences prop
  useEffect(() => {
    if (userPreferences.language) {
      if (['english', 'hinglish', 'hindi'].includes(userPreferences.language)) {
        setActiveLang(userPreferences.language);
      }
    }
    if (userPreferences.voiceSpeed) {
      setVoiceSpeed(userPreferences.voiceSpeed);
    }
  }, [userPreferences.language, userPreferences.voiceSpeed]);

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Start speech recognition & audio capture
  const startListening = async (langCode: string = currentLangConfig.speechCode) => {
    console.log(
      'SpeechRecognition available:',
      typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
    if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: 'microphone' })
        .then((p: any) => console.log('Mic permission state:', p.state))
        .catch(() => {});
    }

    stopSpeaking();
    clearStreamInterval();
    setErrorMessage(null);
    setTranscript('');
    transcriptRef.current = '';
    setStreamedReply('');
    isTranscribingRef.current = false;
    hasSpokenRef.current = false;

    // 1. Acquire local microphone stream via getUserMedia
    let stream = mediaStreamRef.current;
    if (!stream || !stream.active) {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;
        }
      } catch (err: any) {
        console.warn('Microphone permission warning:', err);
        setErrorMessage(
          'Microphone access blocked. Click "Allow" in browser permissions or type your question below.'
        );
        setVoiceState('idle');
        return;
      }
    }

    if (!stream) {
      setErrorMessage('Microphone is not available in this browser window. You can type queries in the box below!');
      setVoiceState('idle');
      return;
    }

    // 2. Initialize Web Audio API Analyser for real-time waveform visualization and volume detection
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (audioContextRef.current && (!analyserRef.current || !sourceNodeRef.current)) {
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyser);

        analyserRef.current = analyser;
        sourceNodeRef.current = source;
      }
    } catch (audioErr: any) {
      console.warn('AudioContext init warning:', audioErr);
    }

    // 3. Initialize MediaRecorder for high-fidelity audio capture (universal fallback)
    try {
      audioChunksRef.current = [];
      const supportedMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
    } catch (recErr) {
      console.warn('MediaRecorder start notice:', recErr);
    }

    setVoiceState('listening');
    activeRef.current = true;

    // 4. Start Web Speech Recognition if available (for real-time streaming preview)
    try {
      if (recognitionRef.current && activeRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      if (isSpeechRecognitionSupported()) {
        const selectedLanguage = langCode || currentLangConfig.speechCode || 'en-IN';
        const recognition = createSpeechRecognition(selectedLanguage);
        if (recognition) {
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = selectedLanguage;
          recognitionRef.current = recognition;

          recognition.onresult = (event: any) => {
            hasSpokenRef.current = true;
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcriptChunk = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcriptChunk;
              } else {
                interimTranscript += transcriptChunk;
              }
            }
            const text = finalTranscript || interimTranscript;
            console.log("Transcript:", text);
            // UPDATE BOTH STATES - THIS IS THE FIX:
            if (setTypedInput) setTypedInput(text);
            if (setTranscript) setTranscript(text);
            transcriptRef.current = text;

            if (finalTranscript) {
              transcriptRef.current = finalTranscript;
              setTypedInput(finalTranscript);
              // Final transcript stays in input, Send button enables
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = setTimeout(() => {
                if (activeRef.current && transcriptRef.current.trim()) {
                  const readyPrompt = transcriptRef.current.trim();
                  stopListening();
                  handleProcessQuery(readyPrompt);
                }
              }, 2200);
            }
          };

          recognition.onerror = (event: any) => {
            const errType = event.error || 'unknown';
            console.warn('AGNI Voice SpeechRecognition event info:', errType);
            if (errType === 'not-allowed' || errType === 'service-not-allowed') {
              setErrorMessage('Microphone access blocked. Click "Allow" in browser permissions or type your question.');
              stopListening();
            }
          };

          recognition.onend = () => {
            // Do not clear input on onend
            if (voiceState === 'listening' && !hasSpokenRef.current) {
              setVoiceState('idle');
            }
          };

          recognition.start();
        }
      }
    } catch (speechErr: any) {
      console.warn('SpeechRecognition initiation note:', speechErr);
    }
  };

  // Real-time Canvas Waveform Animation Loop (for Mini mode)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 36;
      const barWidth = Math.max(3, width / numBars - 3);
      const centerY = height / 2;

      let freqData: Uint8Array | null = null;
      if (analyserRef.current && voiceState === 'listening') {
        freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);

        // Active voice energy monitoring for seamless auto-submit on pause
        let sum = 0;
        for (let k = 0; k < freqData.length; k++) {
          sum += freqData[k];
        }
        const avgEnergy = sum / (freqData.length || 1);
        if (avgEnergy > 16) {
          hasSpokenRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current && !silenceTimerRef.current && !isTranscribingRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            finishListeningAndSubmit();
          }, 2200);
        }
      }

      phase += 0.08;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;
        const x = i * (barWidth + 3) + 2;

        if (freqData && freqData.length > 0) {
          const dataIdx = Math.floor((i / numBars) * freqData.length);
          const rawVal = freqData[dataIdx] || 0;
          barHeight = Math.max(4, (rawVal / 255) * (height * 0.85));
        } else if (voiceState === 'listening') {
          const wave = Math.sin(phase + i * 0.45) * 0.5 + 0.5;
          barHeight = 8 + wave * (height * 0.6);
        } else if (voiceState === 'speaking') {
          const harmonic =
            Math.sin(phase * 1.8 + i * 0.35) * Math.cos(phase * 0.9 + i * 0.25);
          barHeight = 10 + Math.abs(harmonic) * (height * 0.7);
        } else if (voiceState === 'thinking') {
          const wave = Math.sin(phase * 2 + i * 0.3) * 0.5 + 0.5;
          barHeight = 6 + wave * (height * 0.35);
        }

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        if (voiceState === 'listening') {
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(0.5, '#f97316');
          gradient.addColorStop(1, '#fbbf24');
        } else if (voiceState === 'speaking') {
          gradient.addColorStop(0, '#ea580c');
          gradient.addColorStop(0.5, '#f59e0b');
          gradient.addColorStop(1, '#f43f5e');
        } else if (voiceState === 'thinking') {
          gradient.addColorStop(0, '#a855f7');
          gradient.addColorStop(0.5, '#ec4899');
          gradient.addColorStop(1, '#f97316');
        } else {
          gradient.addColorStop(0, '#525252');
          gradient.addColorStop(1, '#737373');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const top = centerY - barHeight / 2;
        const radius = barWidth / 2;
        ctx.roundRect(x, top, barWidth, barHeight, radius);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [voiceState]);

  // Text Streaming Helper for Mini mode preview
  const streamText = (fullText: string, onDone?: () => void) => {
    clearStreamInterval();
    const words = fullText.split(' ');
    let currentIdx = 0;
    setStreamedReply('');

    streamIntervalRef.current = setInterval(() => {
      currentIdx += 2;
      if (currentIdx >= words.length) {
        setStreamedReply(fullText);
        clearStreamInterval();
        onDone?.();
      } else {
        setStreamedReply(words.slice(0, currentIdx).join(' '));
      }
    }, 40);
  };

  // Central Unified Query Processor (Single Brain)
  const handleProcessQuery = async (
    queryText: string,
    shouldSpeak: boolean = speakAloud,
    podcastActive: boolean = isPodcastMode
  ) => {
    if (!queryText.trim()) return;
    stopListening();

    const cleanQuery = queryText.trim();
    setLastUserQuery(cleanQuery);
    setTranscript(cleanQuery);
    setTypedInput(cleanQuery);
    setVoiceState('thinking');
    setErrorMessage(null);
    setStreamedReply('');

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message to single dialogue history
    const userItem: VoiceDialogueItem = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: cleanQuery,
      timestamp: timeNow,
    };
    setDialogueHistory((prev) => [...prev, userItem]);

    try {
      const responseStyleModifier = podcastActive
        ? 'podcast-host'
        : 'concise';

      const data = await apiFetch<{ text?: string; reply?: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', text: cleanQuery }],
          userPreferences: {
            ...userPreferences,
            language: activeLang,
            responseStyle: responseStyleModifier,
          },
          memories,
          authUser: authUser ? {
            name: authUser.name,
            email: authUser.email,
            isFounder: authUser.isFounder,
          } : undefined,
        }),
      });

      const reply = data.text || data.reply || 'I understood that. How else can I assist you?';
      setLastReply(reply);

      // Append assistant message to single dialogue history
      const agniItem: VoiceDialogueItem = {
        id: `agni-${Date.now()}`,
        speaker: 'agni',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPodcast: podcastActive,
      };
      setDialogueHistory((prev) => [...prev, agniItem]);

      // Stream text preview for mini mode
      streamText(reply);

      if (shouldSpeak) {
        setVoiceState('speaking');
        speakText(reply, {
          rate: voiceSpeed,
          pitch: 1.05,
          volume: 1.0,
          profile: userPreferences.voiceProfile || 'natural-warm',
          lang: currentLangConfig.speechCode || 'en-IN',
          onEnd: () => {
            setVoiceState('idle');
            // Hands-free continuous speech loop
            if (isContinuous && isOpen) {
              if (continuousTimerRef.current) clearTimeout(continuousTimerRef.current);
              continuousTimerRef.current = setTimeout(() => {
                startListening();
              }, 600);
            }
          },
          onError: () => {
            setVoiceState('idle');
          },
        });
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      console.error('AGNI Voice query error:', err);
      const realErrMsg =
        err?.message ||
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (typeof err === 'object' ? JSON.stringify(err) : null);
      const errMsg = realErrMsg && realErrMsg !== '[object Object]'
        ? (realErrMsg.includes('GROQ_API_KEY') || realErrMsg.includes('key')
            ? '⚠️ AI key missing. Add GROQ_API_KEY in Vercel settings and redeploy.'
            : realErrMsg)
        : '⚠️ AI service temporarily unavailable. Please tap the orb to try again.';
      setErrorMessage(errMsg);
      setLastReply(errMsg);
      setVoiceState('idle');
    }
  };

  // Finish listening and process spoken audio (WebSpeech or Speech Transcription fallback)
  const finishListeningAndSubmit = async () => {
    if (isTranscribingRef.current) return;
    if (voiceState !== 'listening') return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 1. If WebSpeech interim or final transcript exists, submit directly without latency
    const currentQuery = (transcriptRef.current || transcript || typedInput).trim();
    if (currentQuery) {
      stopListening();
      setTypedInput(currentQuery);
      handleProcessQuery(currentQuery);
      return;
    }

    // 2. Otherwise transcribe recorded MediaRecorder audio chunks with audio transcription API
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      isTranscribingRef.current = true;
      setVoiceState('thinking');

      mediaRecorderRef.current.onstop = async () => {
        try {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];

          if (audioBlob.size < 1200) {
            // Very small blob means user tapped orb without speaking
            stopListening();
            isTranscribingRef.current = false;
            setVoiceState('idle');
            setErrorMessage('Listening ready. Tap the orb and speak anytime!');
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string) || '';
            let res: any = null;
            try {
              try {
                res = await apiFetch<{ text: string; notice?: string }>('/api/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    audioBase64: base64Audio,
                    mimeType,
                    language: currentLangConfig.label,
                  }),
                });
              } catch {
                res = await apiFetch<{ text: string; notice?: string }>('/api/transcribe-audio', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    audioBase64: base64Audio,
                    mimeType,
                    language: currentLangConfig.label,
                  }),
                });
              }

              const transcribedText = (res.text || '').trim();
              stopListening();
              isTranscribingRef.current = false;

              if (transcribedText) {
                transcriptRef.current = transcribedText;
                setTranscript(transcribedText);
                setTypedInput(transcribedText);
                handleProcessQuery(transcribedText);
              } else {
                setVoiceState('idle');
                setErrorMessage("Didn't catch any speech. Tap the orb to speak, or type your question below.");
              }
            } catch (err: any) {
              console.warn('Audio transcribe notice:', err);
              stopListening();
              isTranscribingRef.current = false;
              setVoiceState('idle');
              setErrorMessage('Microphone was quiet. Tap the orb to speak anytime or type below.');
            }
          };
        } catch (err) {
          console.warn('MediaRecorder onstop notice:', err);
          stopListening();
          isTranscribingRef.current = false;
          setVoiceState('idle');
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('MediaRecorder stop notice:', err);
        stopListening();
        isTranscribingRef.current = false;
        setVoiceState('idle');
      }
    } else {
      stopListening();
      setVoiceState('idle');
    }
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || voiceState === 'thinking') return;
    const q = typedInput.trim();
    setTypedInput('');
    handleProcessQuery(q, speakAloud);
  };

  const handleLanguageSwitch = (langId: LanguageCode) => {
    setActiveLang(langId);
    if (onUpdateLanguage) {
      onUpdateLanguage(langId);
    }
    const found = supportedLanguages.find((l) => l.id === langId);
    if (found) {
      if (voiceState === 'listening') {
        stopListening();
        setTimeout(() => {
          startListening(found.speechCode);
        }, 150);
      }
    }
  };

  const handleMuteToggle = () => {
    if (speakAloud) {
      setSpeakAloud(false);
      if (voiceState === 'speaking') {
        stopSpeaking();
        setVoiceState('idle');
      }
    } else {
      setSpeakAloud(true);
      if (lastReply && voiceState === 'idle') {
        setVoiceState('speaking');
        speakText(lastReply, {
          rate: voiceSpeed,
          pitch: 1.05,
          volume: 1.0,
          profile: userPreferences.voiceProfile || 'natural-warm',
          lang: currentLangConfig.speechCode || 'en-IN',
          onEnd: () => setVoiceState('idle'),
          onError: () => setVoiceState('idle'),
        });
      }
    }
  };

  const handleReplay = (text: string) => {
    stopSpeaking();
    setVoiceState('speaking');
    speakText(text, {
      rate: voiceSpeed,
      pitch: 1.05,
      volume: 1.0,
      profile: userPreferences.voiceProfile || 'natural-warm',
      lang: currentLangConfig.speechCode || 'en-IN',
      onEnd: () => setVoiceState('idle'),
      onError: () => setVoiceState('idle'),
    });
  };

  const handlePreviewVoice = () => {
    stopSpeaking();
    setVoiceState('speaking');
    speakText(
      `Hello, welcome to AGNI! I am speaking with the warm and natural AGNI voice engine.`,
      {
        rate: voiceSpeed,
        pitch: 1.05,
        volume: 1.0,
        profile: userPreferences.voiceProfile || 'natural-warm',
        lang: currentLangConfig.speechCode || 'en-IN',
        onEnd: () => setVoiceState('idle'),
        onError: () => setVoiceState('idle'),
      }
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSuggestionClick = (sug: typeof PRESET_SUGGESTIONS[0]) => {
    if (sug.label === 'Hinglish Mode') {
      handleLanguageSwitch('hinglish');
      handleProcessQuery('Hello AGNI, Hinglish mode mein padhai shuru karte hain!');
    } else if (sug.query) {
      handleProcessQuery(sug.query);
    }
  };

  const handleTogglePodcast = () => {
    const nextVal = !isPodcastMode;
    setIsPodcastMode(nextVal);
    if (nextVal) {
      handleReplay("Podcast mode activated! Ask me anything, and I'll break it down like your favorite educational audio show.");
    }
  };

  const handleResetConversation = () => {
    stopSpeaking();
    stopListening();
    const resetMsg: VoiceDialogueItem = {
      id: `init-${Date.now()}`,
      speaker: 'agni',
      text: 'Voice conversation reset. Tap the orb or speak to start anew!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setDialogueHistory([resetMsg]);
    setLastUserQuery('');
    setLastReply('');
    setStreamedReply('');
    setTranscript('');
    setVoiceState('idle');
  };

  if (!isOpen) return null;

  return (
    <div
      id="agni-voice-box-modal"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/80 backdrop-blur-2xl transition-all duration-300 animate-in fade-in"
    >
      {/* Dynamic Ambient Background Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className={`h-[480px] w-[480px] rounded-full blur-3xl opacity-35 transition-all duration-700 ${
            voiceState === 'listening'
              ? 'bg-gradient-to-tr from-cyan-500 via-blue-500 to-orange-500 scale-125'
              : voiceState === 'thinking'
              ? 'bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 scale-110 animate-pulse'
              : voiceState === 'speaking'
              ? 'bg-gradient-to-tr from-orange-500 via-amber-400 to-rose-500 scale-125'
              : 'bg-gradient-to-tr from-orange-600 to-amber-500 scale-95'
          }`}
        />
      </div>

      {/* ========================================================================= */}
      {/* STATE 2: EXPANDED VOICE BOX (All Voice Chat REALISTIC features merged)      */}
      {/* ========================================================================= */}
      {expanded ? (
        <div
          id="agni-voice-box-expanded"
          className="relative w-full max-w-5xl h-[88vh] sm:h-[84vh] rounded-t-3xl sm:rounded-3xl border-t sm:border border-orange-500/50 bg-neutral-950/95 text-white shadow-[0_0_70px_rgba(249,115,22,0.3)] backdrop-blur-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 sm:mx-4"
        >
          {/* Top Bar: Brand, Voice Switcher, Podcast, Continuous, Minimize & Close */}
          <div className="flex flex-wrap items-center justify-between border-b border-neutral-800/80 px-4 sm:px-6 py-3 gap-2 shrink-0 bg-neutral-900/60">
            {/* Left: Brand + Founder */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black border border-orange-500/40 shadow-md shadow-orange-500/30 overflow-hidden">
                <img src="/logo.png" alt="AGNI" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-neutral-100">
                    AGNI Voice Box
                  </h2>
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                    REALISTIC TALK
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-neutral-400">
                  Single Voice System • By Founder <strong>M. Sanjay</strong>
                </p>
              </div>
            </div>

            {/* Middle: Controls (Language, Voice, Speed, Podcast, Hands-Free) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              {/* Language Selector Dropdown */}
              <div className="flex items-center gap-1 rounded-xl border border-orange-500/40 bg-neutral-900 px-2.5 py-1 shadow-sm">
                <Globe className="h-3 w-3 text-orange-400" />
                <select
                  aria-label="Select Voice Language"
                  value={activeLang}
                  onChange={(e) => handleLanguageSwitch(e.target.value)}
                  className="bg-transparent text-xs font-bold text-orange-300 outline-none cursor-pointer"
                >
                  {supportedLanguages.map((l) => (
                    <option key={l.id} value={l.id} className="bg-neutral-900 text-white">
                      {l.label} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Single Dedicated Female Voice Indicator */}
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 font-medium">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>AGNI Female Voice</span>
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 px-2 py-1">
                <span className="text-[10px] text-neutral-400">Speed:</span>
                <select
                  aria-label="Select Voice Speed"
                  value={voiceSpeed}
                  onChange={(e) => {
                    const s = parseFloat(e.target.value);
                    setVoiceSpeed(s);
                    onUpdatePreferences?.({ voiceSpeed: s });
                  }}
                  className="bg-transparent text-xs font-semibold text-neutral-200 outline-none cursor-pointer"
                >
                  <option value="0.85" className="bg-neutral-900 text-white">0.85x (Slow)</option>
                  <option value="0.95" className="bg-neutral-900 text-white">0.95x (Natural Default)</option>
                  <option value="1.1" className="bg-neutral-900 text-white">1.1x (Brisk)</option>
                  <option value="1.25" className="bg-neutral-900 text-white">1.25x (Fast)</option>
                </select>
              </div>

              {/* Podcast Mode toggle */}
              <button
                type="button"
                id="voice-box-podcast-mode-btn"
                onClick={handleTogglePodcast}
                title="Toggle conversational podcast-style educational host"
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                  isPodcastMode
                    ? 'border-purple-500 bg-purple-950/60 text-purple-300 shadow-xs shadow-purple-500/30'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Radio className={`h-3 w-3 ${isPodcastMode ? 'text-purple-400 animate-pulse' : ''}`} />
                <span>{isPodcastMode ? 'Podcast Mode: ON' : 'Podcast Mode'}</span>
              </button>

              {/* Hands-free toggle */}
              <button
                type="button"
                id="voice-box-hands-free-btn"
                onClick={() => setIsContinuous(!isContinuous)}
                title="Hands-free auto-listen loop"
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition border cursor-pointer ${
                  isContinuous
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isContinuous ? 'bg-emerald-400 animate-ping' : 'bg-neutral-600'}`} />
                <span>{isContinuous ? 'Hands-Free' : 'Manual'}</span>
              </button>

              {/* Test Voice preview */}
              <button
                type="button"
                onClick={handlePreviewVoice}
                title="Hear sample audio of active voice"
                className="hidden md:flex items-center gap-1 rounded-xl border border-orange-500/30 bg-orange-950/40 px-2 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-900/40 transition cursor-pointer"
              >
                <Volume2 className="h-3 w-3" />
                <span>Test Voice</span>
              </button>
            </div>

            {/* Right: Minimize to Mini & Close */}
            <div className="flex items-center gap-1.5">
              <button
                id="voice-box-minimize-btn"
                type="button"
                onClick={() => handleSetExpanded(false)}
                title="Minimize to Mini Voice Box"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition cursor-pointer"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                id="voice-box-expanded-close-btn"
                type="button"
                onClick={onClose}
                title="Close Voice Box (Esc)"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Top Interactive Hero Strip: Orb + Waveform Chart + Status */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-800/80 bg-gradient-to-b from-neutral-950 to-neutral-900/90 shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Reactive Orb Button */}
              <div className="flex items-center gap-3">
                <button
                  id="expanded-central-orb"
                  type="button"
                  onClick={async () => {
                    if (voiceState === 'listening') {
                      finishListeningAndSubmit();
                    } else if (voiceState === 'speaking') {
                      stopSpeaking();
                      setVoiceState('idle');
                    } else {
                      await startListening();
                    }
                  }}
                  className={`group relative flex h-16 w-16 items-center justify-center rounded-full cursor-pointer transition-all duration-300 ${
                    voiceState === 'listening'
                      ? 'ring-4 ring-cyan-400/50 scale-105 shadow-lg shadow-cyan-500/20'
                      : voiceState === 'speaking'
                      ? 'ring-4 ring-orange-500/50 scale-105 animate-pulse'
                      : voiceState === 'thinking'
                      ? 'ring-4 ring-purple-500/50 animate-spin'
                      : 'hover:scale-105'
                  }`}
                  title={
                    voiceState === 'listening'
                      ? 'Listening & typing words down live • Tap orb to send'
                      : 'Tap Orb to speak • Types down words live'
                  }
                >
                  <div
                    className={`absolute inset-0 rounded-full blur-sm opacity-80 ${
                      voiceState === 'listening'
                        ? 'bg-cyan-400'
                        : voiceState === 'speaking'
                        ? 'bg-orange-500'
                        : voiceState === 'thinking'
                        ? 'bg-purple-500'
                        : 'bg-orange-600/70'
                    }`}
                  />
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 border border-white/20">
                    {voiceState === 'listening' ? (
                      <Mic className="h-7 w-7 text-cyan-400 animate-pulse" />
                    ) : voiceState === 'speaking' ? (
                      <Volume2 className="h-7 w-7 text-orange-400 animate-bounce" />
                    ) : voiceState === 'thinking' ? (
                      <Zap className="h-7 w-7 text-amber-400" />
                    ) : (
                      <img src="/logo.png" alt="AGNI" className="h-8 w-8 object-contain group-hover:scale-110 transition-transform drop-shadow" />
                    )}
                  </div>
                </button>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                    {voiceState === 'listening' ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Live Voice Typing... Speak naturally</span>
                      </>
                    ) : voiceState === 'thinking' ? (
                      'Formulating response...'
                    ) : voiceState === 'speaking' ? (
                      'AGNI is speaking'
                    ) : (
                      'Tap Orb to Speak'
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400 max-w-xs truncate">
                    {voiceState === 'listening'
                      ? (typedInput || transcript || 'Speak now: words will type down live')
                      : voiceState === 'speaking'
                      ? 'Natural Aoede 24kHz voice'
                      : 'Tap orb to speak • Types down your words live'}
                  </p>
                </div>
              </div>

              {/* Embedded Waveform Chart */}
              <div className="flex-1 w-full max-w-md">
                <VoiceWaveChart voiceState={voiceState} audioStream={mediaStreamRef.current} />
              </div>

              {/* Quick Actions (Stop Speaking, Reset) */}
              <div className="flex items-center gap-2">
                {voiceState === 'speaking' && (
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      setVoiceState('idle');
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-red-600/40 animate-pulse cursor-pointer"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop Speaking</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetConversation}
                  title="Reset conversation"
                  className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Regional Language Quick Selection Strip (Feature 2) */}
          <div className="px-4 sm:px-6 py-2 border-b border-neutral-800/80 bg-neutral-950 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              <span>Language:</span>
            </span>
            {supportedLanguages.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => handleLanguageSwitch(l.id)}
                className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  activeLang.toLowerCase() === l.id.toLowerCase()
                    ? 'bg-orange-600 text-white shadow-xs font-bold'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>{l.label}</span>
                <span className="text-[10px] opacity-70">({l.nativeName})</span>
              </button>
            ))}
          </div>

          {/* Night Calm & Emotion Engine Banner */}
          {isLateNight && (
            <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-neutral-950 border-b border-indigo-900/40 flex items-center justify-between gap-3 text-xs text-indigo-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 text-[11px]">
                  🌙
                </span>
                <span className="font-semibold">
                  Night Calm Tone Active: &quot;It&apos;s late, take a break, we will do this slowly...&quot;
                </span>
              </div>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                Gentle Pacing (0.88x)
              </span>
            </div>
          )}

          {/* Suggestion Chips Row */}
          <div className="px-4 sm:px-6 py-2.5 border-b border-neutral-800/60 bg-neutral-950/60 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Prompt:</span>
            </span>

            {/* Core Action Chips */}
            {PRESET_SUGGESTIONS.map((sug) => (
              <button
                key={sug.label}
                type="button"
                onClick={() => handleSuggestionClick(sug)}
                className="shrink-0 flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-950/40 hover:bg-orange-900/50 px-3 py-1 text-xs font-semibold text-orange-200 transition cursor-pointer"
              >
                <span>{sug.label}</span>
              </button>
            ))}

            <div className="h-4 w-px bg-neutral-800 shrink-0" />

            {/* Student Topic Chips */}
            {PRESET_TOPICS.map((topic, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleProcessQuery(topic)}
                className="shrink-0 rounded-full border border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 hover:bg-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:text-white transition cursor-pointer"
              >
                "{topic}"
              </button>
            ))}
          </div>

          {/* Dialogue History Transcript Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
            {dialogueHistory.map((item) => {
              const isUser = item.speaker === 'user';
              return (
                <div
                  key={item.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-xs">
                      <Flame className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-tr-sm shadow-md'
                        : 'border border-neutral-800 bg-neutral-900/90 text-neutral-200 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {/* Optional Podcast badge */}
                    {item.isPodcast && !isUser && (
                      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        <Radio className="h-3 w-3" />
                        <span>Podcast Host Explanation</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{item.text}</p>

                    {/* Meta Row: Timestamp, Replay, Copy */}
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-neutral-400 pt-1.5 border-t border-white/10">
                      <span>{item.timestamp}</span>

                      <div className="flex items-center gap-2">
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleReplay(item.text)}
                            title="Replay with natural voice"
                            className="flex items-center gap-1 hover:text-orange-400 transition cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>Replay Voice</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.text)}
                          title="Copy text"
                          className="hover:text-white transition cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                              <Check className="h-3 w-3" />
                              Copied
                            </span>
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-neutral-300 border border-neutral-700">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Error Notification if any */}
            {errorMessage && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200 flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-amber-400 hover:text-white font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div ref={dialogueEndRef} />
          </div>

          {/* Bottom Dual Input Bar (Voice + Text Both) */}
          <div className="border-t border-neutral-800/80 bg-neutral-900/90 p-3 sm:p-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Big Mic Button */}
              <button
                type="button"
                id="voice-box-listen-toggle-btn"
                onClick={async () => {
                  if (voiceState === 'listening') {
                    finishListeningAndSubmit();
                  } else if (voiceState === 'speaking') {
                    stopSpeaking();
                    setVoiceState('idle');
                  } else {
                    await startListening();
                  }
                }}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer shrink-0 ${
                  voiceState === 'listening'
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                }`}
              >
                {voiceState === 'listening' ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span className="hidden sm:inline">Speak</span>
                  </>
                )}
              </button>

              {/* Text Input Form */}
              <form onSubmit={handleTypeSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="expanded-voice-box-text-input"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    placeholder={
                      voiceState === 'listening'
                        ? 'Typing down your words live as you speak...'
                        : 'Type a message or tap orb to speak...'
                    }
                    className={`w-full rounded-2xl border px-4 py-2.5 text-xs text-neutral-100 outline-none transition-all ${
                      voiceState === 'listening'
                        ? 'border-cyan-500/80 bg-neutral-950 ring-2 ring-cyan-500/30 text-cyan-100 pr-16'
                        : 'border-neutral-800 bg-neutral-950/90 placeholder-neutral-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                    }`}
                  />
                  {voiceState === 'listening' && (
                    <span className="absolute right-3 top-2.5 flex items-center gap-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] text-cyan-300 font-bold uppercase tracking-wider animate-pulse">
                      <Mic className="h-3 w-3 text-cyan-400" />
                      <span>Live</span>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!typedInput.trim() || voiceState === 'thinking'}
                  className="flex items-center gap-1.5 rounded-2xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40 transition cursor-pointer shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ask &amp; Listen</span>
                </button>
              </form>

              {/* Transfer to AI Chat Button */}
              <button
                type="button"
                id="voice-box-transfer-chat-btn"
                onClick={() => {
                  stopSpeaking();
                  const q = lastUserQuery || 'Hello AGNI';
                  onTransferToChat(q, lastReply);
                  onClose();
                }}
                title="Transfer this session into main AI Chat"
                className="flex items-center gap-1 rounded-2xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer shrink-0"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden md:inline">To Chat</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STATE 1: MINI VOICE BOX (Existing Siri-style design kept and perfected)   */
        /* ========================================================================= */
        <div
          id="agni-voice-box-sheet"
          className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-orange-500/50 bg-neutral-950/95 p-5 sm:p-7 text-white shadow-[0_0_60px_rgba(249,115,22,0.25)] backdrop-blur-2xl flex flex-col items-center gap-3.5 sm:gap-4 max-h-[92vh] overflow-y-auto transform transition-all duration-300 animate-in slide-in-from-bottom-8 sm:mb-6"
        >
          {/* Top Sheet Drag / Indicator Notch */}
          <div className="h-1.5 w-12 rounded-full bg-neutral-700/80 mb-1 sm:hidden shrink-0" />

          {/* Top Bar: Brand, Language Auto-Switch Pills, Expand & Direct Close */}
          <div className="flex w-full items-center justify-between border-b border-neutral-800/80 pb-3 gap-2 shrink-0">
            {/* Brand + Status */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black border border-orange-500/40 shadow-md shadow-orange-500/30 overflow-hidden">
                <img src="/logo.png" alt="AGNI" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-bold tracking-tight text-neutral-100">
                    AGNI Voice Box
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-400 border border-orange-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                    Live Voice
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  <span>By Founder M. Sanjay • Natural Voice Engine</span>
                </p>
              </div>
            </div>

            {/* Language Auto-Switch Selector */}
            <div className="flex items-center gap-1 rounded-xl bg-neutral-900 border border-neutral-800 p-1">
              {supportedLanguages.map((lang) => {
                const isSelected = activeLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleLanguageSwitch(lang.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={`Switch voice language to ${lang.label}`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>

            {/* Expand to Full Talk + Close */}
            <div className="flex items-center gap-1.5">
              <button
                id="agni-voice-box-expand-btn"
                type="button"
                onClick={() => handleSetExpanded(true)}
                title="Expand to Full Voice Talk (Full Dialogue & Controls)"
                className="flex items-center gap-1 rounded-xl bg-orange-500/20 border border-orange-500/40 px-2.5 py-1 text-xs font-bold text-orange-300 hover:bg-orange-500/30 transition cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Expand</span>
              </button>

              <button
                id="agni-voice-box-close-x"
                type="button"
                onClick={onClose}
                title="Close Voice Box (Esc)"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* AGNI Dedicated Female Voice Indicator */}
          <div className="flex w-full items-center justify-between px-1 text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-neutral-400 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Voice:</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-300 shadow-xs">
              <Volume2 className="h-3 w-3 text-amber-400" />
              <span>AGNI Signature Female</span>
              <span className="text-[9px] text-amber-400/80 font-normal">• Warm</span>
            </div>
          </div>

          {/* Central AGNI Orb that pulses when listening */}
          <div className="relative flex flex-col items-center justify-center py-2 shrink-0">
            <button
              id="agni-voice-central-orb"
              type="button"
              onClick={async () => {
                if (voiceState === 'listening') {
                  finishListeningAndSubmit();
                } else if (voiceState === 'speaking') {
                  stopSpeaking();
                  setVoiceState('idle');
                } else {
                  await startListening();
                }
              }}
              title={
                voiceState === 'listening'
                  ? 'Listening & typing words down live • Tap orb to send'
                  : voiceState === 'speaking'
                  ? 'Tap orb to stop speaking'
                  : 'Tap orb to speak • Types down your words live'
              }
              className="group relative flex h-28 w-28 items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              {/* Multi-layered animated aura */}
              <div
                className={`absolute inset-0 rounded-full blur-md opacity-80 animate-spin transition-all duration-500 ${
                  voiceState === 'listening'
                    ? 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-orange-400'
                    : voiceState === 'thinking'
                    ? 'bg-gradient-to-tr from-purple-500 via-amber-400 to-rose-500'
                    : voiceState === 'speaking'
                    ? 'bg-gradient-to-tr from-orange-500 via-amber-300 to-red-500'
                    : 'bg-gradient-to-tr from-orange-500/70 to-amber-500/70'
                }`}
                style={{ animationDuration: voiceState === 'thinking' ? '2.5s' : '6s' }}
              />

              {/* Glowing Ring Border */}
              <div className="absolute -inset-1.5 rounded-full border border-orange-400/60 animate-pulse [animation-duration:2s]" />

              {/* Inner Core */}
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-950 border border-white/20 shadow-inner">
                {voiceState === 'listening' && (
                  <div className="flex flex-col items-center gap-1">
                    <Mic className="h-8 w-8 text-cyan-400 animate-pulse" />
                    <div className="flex items-center gap-0.5">
                      <span className="h-2 w-1 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="h-3.5 w-1 rounded-full bg-cyan-300 animate-pulse delay-75" />
                      <span className="h-2 w-1 rounded-full bg-cyan-400 animate-pulse delay-150" />
                    </div>
                  </div>
                )}
                {voiceState === 'thinking' && (
                  <div className="flex flex-col items-center gap-1">
                    <Sparkles className="h-9 w-9 text-amber-400 animate-spin" />
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                      Thinking
                    </span>
                  </div>
                )}
                {voiceState === 'speaking' && (
                  <div className="flex flex-col items-center gap-1">
                    <Volume2 className="h-9 w-9 text-orange-400 animate-bounce" />
                    <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider animate-pulse">
                      Speaking
                    </span>
                  </div>
                )}
                {voiceState === 'idle' && (
                  <div className="flex flex-col items-center gap-0.5">
                    <Mic className="h-8 w-8 text-orange-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-semibold text-neutral-400">Tap to Talk</span>
                  </div>
                )}
              </div>
            </button>

            {/* Current State Text Label */}
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                {voiceState === 'listening' && 'Listening & typing words down live • Tap orb when done'}
                {voiceState === 'thinking' && 'Processing your voice... Formulating reply'}
                {voiceState === 'speaking' && 'Speaking in Natural Female Voice • Tap orb to stop'}
                {voiceState === 'idle' && 'Listening ready • Tap orb to speak (types down words live)'}
              </p>
            </div>
          </div>

          {/* Real-time Audio Waveform Animation (Web Audio API Canvas) */}
          <div className="w-full flex flex-col items-center shrink-0">
            <canvas
              ref={canvasRef}
              width={360}
              height={44}
              className="w-full max-w-sm h-11 rounded-xl bg-neutral-900/50 border border-neutral-800/80 shadow-inner px-2 py-1"
            />
            <span className="text-[10px] text-neutral-500 mt-1">
              {voiceState === 'listening'
                ? 'Real-time microphone audio waveform'
                : voiceState === 'speaking'
                ? 'Harmonic speech audio resonance'
                : 'Web Audio API Acoustic Engine'}
            </span>
          </div>

          {/* Transcript Card: Clean non-overlapping display of user query and streamed response */}
          <div className="w-full min-h-[90px] rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 text-left flex flex-col gap-2 shrink-0">
            {voiceState === 'listening' && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase shrink-0 pt-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                  Live Voice Typing:
                </span>
                <p className="text-sm font-medium text-cyan-100 leading-relaxed break-words">
                  {typedInput || transcript ? (
                    <>
                      <span>“{typedInput || transcript}”</span>
                      <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1.5 animate-pulse align-middle" />
                    </>
                  ) : (
                    <span className="text-neutral-400 italic">Listening... Speak now and your words will type down here live</span>
                  )}
                </p>
              </div>
            )}

            {lastUserQuery && voiceState !== 'listening' && (
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-neutral-400 uppercase shrink-0 pt-0.5">You:</span>
                <p className="text-xs sm:text-sm text-neutral-200 font-medium break-words">{lastUserQuery}</p>
              </div>
            )}

            {(streamedReply || lastReply) && (
              <div className="flex items-start gap-2 pt-2 border-t border-neutral-800/80">
                <span className="text-xs font-bold text-orange-400 uppercase shrink-0 pt-0.5">AGNI:</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed max-h-40 overflow-y-auto pr-1 break-words whitespace-pre-wrap">
                    {streamedReply || lastReply}
                  </p>
                </div>
              </div>
            )}

            {!transcript && !lastUserQuery && !streamedReply && !lastReply && voiceState !== 'listening' && (
              <div className="flex items-center justify-center py-2">
                <p className="text-xs text-neutral-400 text-center">
                  Speak a question in <strong>{currentLangConfig.nativeName}</strong>, or type below.
                </p>
              </div>
            )}
          </div>

          {/* Error / Reconnect Notification - Independent container to prevent overlapping */}
          {errorMessage && (
            <div className="w-full text-xs text-amber-300 bg-amber-950/60 p-3 rounded-xl border border-amber-800/70 flex items-start justify-between gap-2 shrink-0">
              <span className="leading-relaxed">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-amber-200 hover:text-white font-bold ml-2 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Text Typing Option */}
          <form onSubmit={handleTypeSubmit} className="w-full flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                id="mini-voice-box-text-input"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={
                  voiceState === 'listening'
                    ? 'Typing down your words live as you speak...'
                    : `Type or tap orb to speak in ${currentLangConfig.label}...`
                }
                className={`w-full rounded-2xl border py-2.5 pl-4 pr-16 text-xs text-neutral-100 outline-none transition-all ${
                  voiceState === 'listening'
                    ? 'border-cyan-500/80 bg-neutral-900 ring-2 ring-cyan-500/30 text-cyan-100'
                    : 'border-neutral-800 bg-neutral-900/90 placeholder-neutral-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50'
                }`}
              />
              {voiceState === 'listening' && (
                <span className="absolute right-3 top-2.5 flex items-center gap-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] text-cyan-300 font-bold uppercase tracking-wider animate-pulse">
                  <Mic className="h-3 w-3 text-cyan-400" />
                  <span>Live</span>
                </span>
              )}
              {typedInput && voiceState !== 'listening' && (
                <button
                  type="button"
                  onClick={() => setTypedInput('')}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!typedInput.trim() || voiceState === 'thinking'}
              className="flex h-10 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-xs font-bold text-white shadow-md hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 cursor-pointer transition shrink-0"
            >
              <span>Send</span>
              <Send className="h-3 w-3" />
            </button>
          </form>

          {/* Footer Actions: [Mute/Stop] [Open Full Talk (Expand)] [To Chat] [Close] */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-neutral-800/80">
            <div className="flex items-center gap-2">
              <button
                id="mini-voice-box-mute-btn"
                type="button"
                onClick={handleMuteToggle}
                title={speakAloud ? 'Mute AGNI voice' : 'Unmute AGNI voice'}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  speakAloud
                    ? 'border-neutral-700 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700'
                    : 'border-red-800 bg-red-950/60 text-red-300 hover:bg-red-900/70'
                }`}
              >
                {speakAloud ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-orange-400" />
                    <span>Voice Mute</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-red-400" />
                    <span>Unmute</span>
                  </>
                )}
              </button>

              {voiceState === 'speaking' && (
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setVoiceState('idle');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-red-900/80 border border-red-700/80 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-800 transition cursor-pointer animate-pulse"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Expand to Full Talk Button */}
              <button
                id="mini-voice-box-open-full-btn"
                type="button"
                onClick={() => handleSetExpanded(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-orange-600 hover:to-amber-600 transition cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Open Full Talk</span>
                <ArrowRight className="h-3 w-3" />
              </button>

              <button
                id="mini-voice-box-close-btn"
                type="button"
                onClick={onClose}
                className="rounded-xl border border-neutral-800 bg-neutral-800/80 hover:bg-neutral-700 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
