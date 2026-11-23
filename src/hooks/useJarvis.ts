/**
 * AGNI Jarvis Mode - Real Voice & Speech Hook
 * Powered by GROQ llama-3.3-70b-versatile & Groq Whisper Fallback
 * 100% Free For All • Full Sentence Speech • Real Action Execution
 * Built by Founder M. Sanjay
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { runSystemCommand } from '../lib/agniDesktop';

export interface UseJarvisReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  micPermission: 'prompt' | 'granted' | 'denied';
  youSaid: string;
  jarvisReply: string;
  lastAction: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  submitCommand: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

export function useJarvis(onNavigate?: (path: string) => void, onClose?: () => void): UseJarvisReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [youSaid, setYouSaid] = useState<string>('Say Hey Jarvis or tap the mic below');
  const [jarvisReply, setJarvisReply] = useState<string>('Jarvis online, Sir. How may I assist you today?');
  const [lastAction, setLastAction] = useState<string>('initialized');

  const recognitionRef = useRef<any | null>(null);
  const shouldListenRef = useRef<boolean>(true);
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);
  const onNavigateRef = useRef(onNavigate);
  const onCloseRef = useRef(onClose);

  // Audio capture & fallback references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechDetectedRef = useRef<boolean>(false);
  const silenceStartRef = useRef<number | null>(null);
  const isTranscribingRef = useRef<boolean>(false);
  const vadIntervalRef = useRef<any>(null);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
    onCloseRef.current = onClose;
  }, [onNavigate, onClose]);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, []);

  // Sync isSpeaking with window.speechSynthesis.speaking
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const interval = setInterval(() => {
      const active = window.speechSynthesis.speaking;
      if (active !== isSpeakingRef.current) {
        setIsSpeaking(active);
        isSpeakingRef.current = active;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Speak full text response with en-IN voice, rate 1, no split('.')
  const speakAloud = useCallback((fullText: string, onDone?: () => void) => {
    if (!fullText || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onDone) onDone();
      return;
    }

    try {
      // 1. Cancel old speech
      window.speechSynthesis.cancel();

      // 2. Create new SpeechSynthesisUtterance with full text (no split)
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // 3. Select en-IN voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang.includes('en-IN') && !v.name.includes('Google')) ||
        voices.find((v) => v.lang.includes('en-IN')) ||
        voices.find((v) => v.lang.includes('en-GB')) ||
        voices.find((v) => v.lang.includes('en-US')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onDone) onDone();
        // Resume listening after speaking ends
        if (shouldListenRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      utterance.onerror = (e) => {
        console.debug('[Jarvis Speech Error]', e);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onDone) onDone();
      };

      // 4. When speaking, set isSpeaking=true so orb pulses
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.debug('[Jarvis Speech Utterance Error]', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onDone) onDone();
    }
  }, []);

  // Core execution handler for ANY command (Groq AI)
  const submitCommand = useCallback(
    async (commandText: string) => {
      const cleanInput = commandText.trim();
      if (!cleanInput) return;

      stopSpeaking();
      setYouSaid(cleanInput);

      // Check for Desktop System Commands (brightness, volume, battery, lock, apps)
      const sys = await runSystemCommand(cleanInput);
      if (sys.handled && sys.reply) {
        setJarvisReply(sys.reply);
        setLastAction('system_command');
        setIsThinking(false);
        isThinkingRef.current = false;
        speakAloud(sys.reply);
        return;
      }

      // Check for Founder Identity queries
      const lower = cleanInput.toLowerCase();
      if (
        /\b(who (is|are|was) (ur|your|the )?(founder|creator|maker|developer|architect|author)|who (made|created|built|developed|founded) (you|u|agni)|whose ai are you|who is m\.?\s*sanjay|tell me about (the )?founder|founder of agni)\b/i.test(lower)
      ) {
        const founderReply = 'I am AGNI, created by M. Sanjay, Founder M. Sanjay.';
        setJarvisReply(founderReply);
        setLastAction('founder_identity');
        setIsThinking(false);
        isThinkingRef.current = false;
        speakAloud(founderReply);
        return;
      }

      setIsThinking(true);
      isThinkingRef.current = true;
      setJarvisReply('Jarvis is processing...');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: cleanInput,
            isJarvis: true,
            mode: 'jarvis',
          }),
        });

        const data = await res.json();
        const sayText = data.say || data.reply || data.text || 'I have completed your request, Sir.';
        const actionUrl = data.action?.url;

        setJarvisReply(sayText);
        setLastAction(data.action?.type || 'command_completed');
        setIsThinking(false);
        isThinkingRef.current = false;

        // Frontend: if response has action.url, window.open(action.url, '_blank'), then speak full say
        if (actionUrl && typeof window !== 'undefined') {
          window.open(actionUrl, '_blank');
        }

        speakAloud(sayText, () => {
          if (data.action?.type === 'close' || sayText.toLowerCase().includes('closing jarvis')) {
            setTimeout(() => {
              if (onCloseRef.current) onCloseRef.current();
              else if (onNavigateRef.current) onNavigateRef.current('/');
            }, 1000);
          }
        });
      } catch (err) {
        console.error('[Jarvis Command Error]', err);
        setIsThinking(false);
        isThinkingRef.current = false;
        const fallbackText = 'Let me look into that for you, Sir.';
        setJarvisReply(fallbackText);
        speakAloud(fallbackText);
      }
    },
    [speakAloud, stopSpeaking]
  );

  // Acquire microphone stream & initialize AnalyserNode
  const ensureMediaStream = useCallback(async (): Promise<MediaStream | null> => {
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      return mediaStreamRef.current;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPermission('denied');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      setMicPermission('granted');

      // Initialize Web Audio API AnalyserNode for volume / waveform
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        let ctx = audioContextRef.current;
        if (!ctx || ctx.state === 'closed') {
          ctx = new AudioCtx();
          audioContextRef.current = ctx;
        }
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyserRef.current = analyser;
        }
      }

      return stream;
    } catch (err: any) {
      console.warn('[Jarvis] getUserMedia error:', err);
      setMicPermission('denied');
      return null;
    }
  }, []);

  // Transcribe recorded audio with Groq Whisper fallback
  const transcribeAudioChunks = useCallback(
    async (chunks: Blob[]) => {
      if (isTranscribingRef.current || chunks.length === 0) return;
      isTranscribingRef.current = true;

      try {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: mimeType });
        if (audioBlob.size < 300) {
          isTranscribingRef.current = false;
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string) || '';
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Audio, mimeType, language: 'en' }),
            });
            const data = await res.json();
            const text = (data.text || data.transcription || '').trim();
            if (text) {
              console.log('[Jarvis Whisper Transcribed]:', text);
              setYouSaid(text);
              submitCommand(text);
            }
          } catch (e) {
            console.warn('[Jarvis Whisper Fallback error]', e);
          } finally {
            isTranscribingRef.current = false;
          }
        };
      } catch (e) {
        console.warn('[Jarvis transcribeAudioChunks error]', e);
        isTranscribingRef.current = false;
      }
    },
    [submitCommand]
  );

  const triggerWhisperTranscription = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  }, []);

  // Start Recognition
  const startListening = useCallback(async () => {
    shouldListenRef.current = true;
    speechDetectedRef.current = false;
    silenceStartRef.current = null;

    // 1. Acquire getUserMedia
    const stream = await ensureMediaStream();
    if (!stream) {
      console.warn('[Jarvis] Could not acquire audio stream');
      return;
    }

    setIsListening(true);

    // 2. Start MediaRecorder for Whisper fallback (record live audio continuously)
    try {
      audioChunksRef.current = [];
      const supportedMime =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined;

      if (typeof MediaRecorder !== 'undefined') {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
        const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          const chunks = [...audioChunksRef.current];
          audioChunksRef.current = [];
          if (chunks.length > 0) {
            transcribeAudioChunks(chunks);
          }
          // Restart recorder if still supposed to listen
          if (shouldListenRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
            try {
              recorder.start(100);
            } catch {}
          }
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      }
    } catch (recErr) {
      console.warn('[Jarvis MediaRecorder notice]', recErr);
    }

    // 3. Continuous Audio Energy VAD (Voice Activity Detection)
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    vadIntervalRef.current = setInterval(() => {
      if (!shouldListenRef.current || isSpeakingRef.current || isThinkingRef.current) return;
      if (!analyserRef.current) return;

      const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(freqData);

      let sum = 0;
      for (let k = 0; k < freqData.length; k++) sum += freqData[k];
      const avgEnergy = sum / (freqData.length || 1);

      if (avgEnergy > 8) {
        speechDetectedRef.current = true;
        silenceStartRef.current = null;
      } else if (speechDetectedRef.current) {
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current > 1200) {
          // 1.2s silence after user finished speaking -> transcribe & submit!
          speechDetectedRef.current = false;
          silenceStartRef.current = null;
          triggerWhisperTranscription();
        }
      }
    }, 100);

    // 4. Start SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.debug('[Jarvis Recognition start notice]', e);
      }
    }
  }, [ensureMediaStream, transcribeAudioChunks, triggerWhisperTranscription]);

  // Stop Recognition
  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    speechDetectedRef.current = false;
    silenceStartRef.current = null;

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Setup Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Root cause logging checks
    console.log(
      'SpeechRecognition available:',
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );
    if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: 'microphone' })
        .then((p: any) => console.log('Mic permission state:', p.state))
        .catch(() => {});
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let recognition: any = null;
    if (SpeechRecognition) {
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English & accents
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setMicPermission('granted');
        };

        recognition.onaudiostart = () => {
          setIsListening(true);
        };

        recognition.onspeechstart = () => {
          setIsListening(true);
        };

        recognition.onspeechend = () => {
          // Keep listening flag until final result or stop
        };

        recognition.onresult = (event: any) => {
          if (isSpeakingRef.current) return;
          speechDetectedRef.current = true;

          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          const text = finalTranscript || interimTranscript;
          console.log("Transcript:", text);
          setYouSaid(text);

          if (finalTranscript) {
            speechDetectedRef.current = false;
            setIsListening(false);
            stopListening();
            setTimeout(() => {
              submitCommand(finalTranscript);
            }, 300);
          }
        };

        recognition.onerror = (event: any) => {
          console.debug('[Jarvis Recognition Event]', event.error);
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setMicPermission('denied');
            setIsListening(false);
            shouldListenRef.current = false;
          }
          // On 'network' error (e.g. in Electron where Google Speech isn't bundled):
          // DO NOT stop listening! MediaRecorder + Audio Energy VAD handles transcription!
        };

        recognition.onend = () => {
          // If still should listen, keep listening active for MediaRecorder / Whisper
          if (!shouldListenRef.current) {
            setIsListening(false);
          } else if (!isSpeakingRef.current && !isThinkingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('[Jarvis] SpeechRecognition instantiation error:', err);
      }
    }

    // Initial greeting aloud
    speakAloud('Jarvis online, Sir. At your service.');

    // Auto-prime media stream and listening on mount
    ensureMediaStream().then(() => {
      startListening();
    });

    return () => {
      shouldListenRef.current = false;
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (recognition) {
        try {
          recognition.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      stopSpeaking();
    };
  }, []); // Run ONCE on mount so state changes don't destroy listener!

  return {
    isListening,
    isSpeaking,
    isThinking,
    micPermission,
    youSaid,
    jarvisReply,
    lastAction,
    startListening,
    stopListening,
    toggleListening,
    submitCommand,
    stopSpeaking,
  };
}
