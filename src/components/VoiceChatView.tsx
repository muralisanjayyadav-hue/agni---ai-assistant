import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Flame,
  MessageSquare,
  Square,
  Play,
  RotateCcw,
  Globe,
  Sliders,
  Send,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { UserPreferences, LanguageCode, TabMode, AuthUser } from '../types';
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  speakText,
  stopSpeaking,
} from '../utils/speech';
import { apiFetch } from '../utils/api';
import { SUPPORTED_LANGUAGES, getLanguageOption } from '../data/languages';
import { VoiceWaveChart } from './VoiceWaveChart';

interface VoiceChatViewProps {
  userPreferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onTransferToChat: (userText: string, assistantReply?: string) => void;
  authUser?: AuthUser | null;
}

export interface VoiceDialogue {
  id: string;
  speaker: 'user' | 'agni';
  text: string;
  timestamp: string;
}

export const VoiceChatView: React.FC<VoiceChatViewProps> = ({
  userPreferences,
  onUpdatePreferences,
  onTransferToChat,
  authUser,
}) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [dialogue, setDialogue] = useState<VoiceDialogue[]>([
    {
      id: 'init-1',
      speaker: 'agni',
      text: userPreferences.language.toLowerCase().includes('tamil')
        ? 'வணக்கம்! நான் AGNI. எதைப் பற்றி பேசலாம்? கேளுங்கள்!'
        : userPreferences.language.toLowerCase().includes('hindi')
        ? 'नमस्ते! मैं AGNI हूँ। आप मुझसे किसी भी विषय पर बात कर सकते हैं!'
        : userPreferences.language.toLowerCase().includes('telugu')
        ? 'నమస్కారం! నేను AGNI. ఏదైనా సందేహం ఉంటే అడగండి!'
        : 'Vanakkam! I am AGNI, your personal AI assistant. Tap the mic or start speaking!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [typedInput, setTypedInput] = useState('');
  const [autoListen, setAutoListen] = useState(true);

  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  const currentLangConfig = getLanguageOption(userPreferences.language);

  // Auto-scroll dialogue
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleStartListening = () => {
    stopSpeaking();
    setVoiceState('listening');
    setTranscript('');
    isListeningRef.current = true;

    if (isSpeechRecognitionSupported()) {
      try {
        const recognition = createSpeechRecognition(currentLangConfig.speechCode || 'en-IN');
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.onresult = (e: any) => {
            let current = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
              current += e.results[i][0].transcript;
            }
            setTranscript(current);
          };
          recognition.onerror = (e: any) => {
            console.warn('Speech recognition notice:', e.error);
          };
          recognition.onend = () => {
            if (isListeningRef.current) {
              handleStopAndSubmit();
            }
          };
          recognition.start();
          return;
        }
      } catch (err) {
        console.warn('Speech recognition init fallback:', err);
      }
    }

    // Audio MediaRecorder fallback
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
          };
          mediaRecorder.start();
        })
        .catch((err) => {
          console.warn('Media devices audio permission notice:', err);
        });
    }
  };

  const handleStopAndSubmit = (overrideText?: string) => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const query = (overrideText || transcript || typedInput).trim();
    if (!query) {
      setVoiceState('idle');
      return;
    }

    setTranscript('');
    setTypedInput('');
    processVoiceQuery(query);
  };

  const processVoiceQuery = async (query: string) => {
    // Add user message
    const userMsg: VoiceDialogue = {
      id: `u-${Date.now()}`,
      speaker: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setDialogue((prev) => [...prev, userMsg]);
    setVoiceState('thinking');

    try {
      const langConfig = getLanguageOption(userPreferences.language);
      const res = await apiFetch('/api/voice/interact', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          language: userPreferences.language,
          languageCode: langConfig.speechCode,
          bilingualMode: userPreferences.bilingualMode || 'none',
          userName: authUser?.name || userPreferences.userName,
          history: dialogue.slice(-6).map((d) => ({
            role: d.speaker === 'user' ? 'user' : 'model',
            parts: [{ text: d.text }],
          })),
        }),
      });

      const replyText = res.spokenReply || res.reply || res.text || 'I understood your query.';

      const agniMsg: VoiceDialogue = {
        id: `a-${Date.now()}`,
        speaker: 'agni',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogue((prev) => [...prev, agniMsg]);

      // Speak response aloud
      if (userPreferences.voiceEnabled) {
        setVoiceState('speaking');
        const masterVol = (userPreferences.masterVolume ?? 90) / 100;
        speakText(replyText, {
          volume: masterVol,
          rate: userPreferences.voiceSpeed || 1.0,
          pitch: userPreferences.voicePitch || 1.05,
          lang: langConfig.speechCode || 'en-IN',
          onEnd: () => {
            setVoiceState('idle');
            if (autoListen) {
              setTimeout(() => {
                handleStartListening();
              }, 400);
            }
          },
          onError: () => setVoiceState('idle'),
        });
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      console.warn('Voice interaction error:', err);
      const errMsg =
        err?.message ||
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (typeof err === 'object' ? JSON.stringify(err) : 'I am right here with you. What would you like to explore next?');
      const fallbackReply = errMsg && errMsg !== '[object Object]' && !errMsg.includes('status 5')
        ? errMsg
        : 'I am right here with you. What would you like to explore next?';
      setDialogue((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          speaker: 'agni',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setVoiceState('idle');
    }
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setVoiceState('idle');
  };

  const handleReplayDialogue = (text: string) => {
    stopSpeaking();
    setVoiceState('speaking');
    const masterVol = (userPreferences.masterVolume ?? 90) / 100;
    speakText(text, {
      volume: masterVol,
      rate: userPreferences.voiceSpeed || 1.0,
      pitch: userPreferences.voicePitch || 1.05,
      lang: currentLangConfig.speechCode || 'en-IN',
      onEnd: () => setVoiceState('idle'),
      onError: () => setVoiceState('idle'),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-neutral-900 via-neutral-950 to-orange-950/40 p-5 sm:p-6 text-white shadow-xl shadow-orange-950/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-red-500 text-white shadow-lg shadow-orange-600/30">
            <Radio className="h-7 w-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                AGNI Voice Chat
              </h1>
              <span className="rounded-full bg-orange-500/20 border border-orange-400/40 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                Natural Human Cadence
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              Hands-Free Conversational Voice • 13+ Languages • Real-time Speech
            </p>
          </div>
        </div>

        {/* Language Quick Switch */}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-orange-400" />
          <select
            value={userPreferences.language}
            onChange={(e) => onUpdatePreferences({ language: e.target.value })}
            className="h-9 rounded-xl border border-white/20 bg-neutral-900 px-3 text-xs font-semibold text-white outline-none focus:border-orange-500 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-neutral-900 text-white">
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Siri / AGNI Waveform Visualizer Centerpiece */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col items-center justify-center text-center space-y-6">
        {/* Animated Waveform Canvas */}
        <div className="w-full max-w-lg">
          <VoiceWaveChart
            voiceState={voiceState}
          />
        </div>

        {/* Large Central Pulsating Mic Button */}
        <div className="relative flex items-center justify-center my-2">
          {/* Animated Glow Aura */}
          <div
            className={`absolute -inset-4 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 blur-xl opacity-60 transition-all duration-500 ${
              voiceState === 'listening'
                ? 'scale-125 opacity-90 animate-pulse'
                : voiceState === 'speaking'
                ? 'scale-110 opacity-75'
                : 'scale-100 opacity-40'
            }`}
          />

          <button
            type="button"
            id="voice-chat-main-mic-btn"
            onClick={() => {
              if (voiceState === 'listening') {
                handleStopAndSubmit();
              } else if (voiceState === 'speaking') {
                handleStopSpeaking();
              } else {
                handleStartListening();
              }
            }}
            title={
              voiceState === 'listening'
                ? 'Listening... Tap to send'
                : voiceState === 'speaking'
                ? 'Speaking... Tap to stop'
                : 'Tap to speak with AGNI'
            }
            className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full text-white shadow-2xl transition-all cursor-pointer active:scale-95 ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-red-600 to-orange-500 ring-4 ring-orange-400 scale-105 animate-pulse'
                : voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 ring-4 ring-purple-400'
                : voiceState === 'thinking'
                ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 animate-spin'
                : 'bg-gradient-to-tr from-orange-600 via-amber-500 to-red-500 hover:scale-105'
            }`}
          >
            {voiceState === 'listening' ? (
              <Mic className="h-12 w-12 animate-bounce" />
            ) : voiceState === 'speaking' ? (
              <Square className="h-10 w-10 fill-current" />
            ) : voiceState === 'thinking' ? (
              <Sparkles className="h-10 w-10 animate-spin" />
            ) : (
              <Mic className="h-12 w-12" />
            )}
          </button>
        </div>

        {/* Live Voice State Indicator */}
        <div className="space-y-1">
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center justify-center gap-2">
            {voiceState === 'listening' && (
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                Listening to your voice... (Tap to finish)
              </span>
            )}
            {voiceState === 'thinking' && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 animate-spin" />
                AGNI is formulating step-by-step response...
              </span>
            )}
            {voiceState === 'speaking' && (
              <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 animate-pulse" />
                Speaking response aloud... (Tap to stop)
              </span>
            )}
            {voiceState === 'idle' && (
              <span className="text-neutral-600 dark:text-neutral-300">
                Tap the microphone or type below to start talking
              </span>
            )}
          </div>
          {transcript && (
            <p className="text-xs font-mono text-orange-600 dark:text-orange-400 max-w-md mx-auto truncate">
              &quot;{transcript}&quot;
            </p>
          )}
        </div>

        {/* Hands-free Toggle & Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setAutoListen(!autoListen)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer border ${
              autoListen
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Hands-Free Auto-Listen: {autoListen ? 'ON' : 'OFF'}</span>
          </button>

          {voiceState === 'speaking' && (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="flex items-center gap-1.5 rounded-full bg-red-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-md shadow-red-600/30 cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop Voice</span>
            </button>
          )}
        </div>
      </div>

      {/* Spoken Dialogue History & Interactive Text Transfer */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Live Voice Dialogue Stream
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              const lastUser = dialogue.filter((d) => d.speaker === 'user').pop();
              const lastAgni = dialogue.filter((d) => d.speaker === 'agni').pop();
              if (lastUser) {
                onTransferToChat(lastUser.text, lastAgni?.text);
              }
            }}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-500 dark:text-orange-400 cursor-pointer"
          >
            <span>Open in Full Chat</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Message Bubble List */}
        <div className="max-h-72 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {dialogue.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-2.5 ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {item.speaker === 'agni' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white text-xs font-bold shadow-sm">
                  <Flame className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                  item.speaker === 'user'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60'
                }`}
              >
                <p>{item.text}</p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-70">
                  <span>{item.timestamp}</span>
                  {item.speaker === 'agni' && (
                    <button
                      type="button"
                      onClick={() => handleReplayDialogue(item.text)}
                      title="Replay Voice"
                      className="ml-2 hover:opacity-100 cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={dialogueEndRef} />
        </div>

        {/* Fallback Type-to-Speak Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (typedInput.trim()) {
              handleStopAndSubmit(typedInput);
            }
          }}
          className="relative flex items-center pt-2"
        >
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Or type here to speak with AGNI..."
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-4 pr-12 py-3 text-xs font-medium text-neutral-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={!typedInput.trim()}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
