import React, { useState } from 'react';
import {
  X,
  Share2,
  Volume2,
  Copy,
  Check,
  Send,
  Sparkles,
  BookmarkCheck,
  Download,
} from 'lucide-react';
import { speakText, stopSpeaking } from '../utils/speech';

interface ShareAudioSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippetText: string;
  topic?: string;
  speaker?: 'user' | 'agni';
}

export const ShareAudioSnippetModal: React.FC<ShareAudioSnippetModalProps> = ({
  isOpen,
  onClose,
  snippetText,
  topic = 'Voice Explanation',
  speaker = 'agni',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !snippetText) return null;

  const handlePlayVoice = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakText(snippetText, {
        rate: 0.95,
        pitch: 1.05,
        volume: 1.0,
        profile: 'natural-warm',
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    }
  };

  const handleCopy = () => {
    const formatted = `🔥 AGNI Voice Explanation: "${topic}"\n\n"${snippetText}"\n\n- Powered by AGNI Assistant (Founder M. Sanjay)`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const rawText = `🔥 *AGNI Voice Note - ${topic}*\n\n"${snippetText}"\n\n_Answered by AGNI AI (Made in India, To Serve the World)_\n${window.location.href}`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rawText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
    const text = encodeURIComponent(rawText);
    try {
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch {
      // fallback
    }
  };

  const handleShareTelegram = () => {
    const rawText = `🔥 AGNI Voice Note - ${topic}\n\n"${snippetText}"\n\nAnswered by AGNI AI`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rawText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
    const text = encodeURIComponent(rawText);
    try {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex w-full max-w-md flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Share Audio Snippet
              </h3>
              <p className="text-[11px] text-neutral-500">
                Share AGNI voice explanation with study group
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Audio Card Preview */}
        <div className="mt-4 rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 p-4 shadow-sm dark:border-orange-950/60 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-orange-700 dark:text-orange-300">
              🔥 AGNI Voice Explanation
            </span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              Audio Clip
            </span>
          </div>

          <p className="mt-2 text-xs italic leading-relaxed text-neutral-700 dark:text-neutral-300 line-clamp-5">
            "{snippetText}"
          </p>

          {/* Player controls */}
          <div className="mt-3 flex items-center justify-between border-t border-orange-100 pt-2.5 dark:border-neutral-800">
            <button
              type="button"
              onClick={handlePlayVoice}
              className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-orange-700 transition cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>{isPlaying ? 'Pause Audio' : 'Play Voice Clip'}</span>
            </button>

            <span className="text-[10px] text-neutral-400">Founder M. Sanjay</span>
          </div>
        </div>

        {/* Sharing Options */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Forward to WhatsApp Study Group</span>
          </button>

          <button
            type="button"
            onClick={handleShareTelegram}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-600 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Share to Telegram Channel</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Audio Script & Quote'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
