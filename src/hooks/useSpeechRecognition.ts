import { useState, useRef, useCallback, useEffect } from 'react';
import { isSpeechRecognitionSupported, resolveLanguageCode } from '../utils/speech';

export interface UseSpeechRecognitionOptions {
  selectedLanguage?: string;
  setInputText?: (text: string) => void;
  setQuery?: (text: string) => void;
  setInput?: (text: string) => void;
  setTypedInput?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  toggleListening: (lang?: string) => void;
  error: string | null;
  isSupported: boolean;
}

// Push live text into every bottom input box in the app via DOM
export function domPushLiveText(liveText: string) {
  try {
    const selectors = [
      '#home-message-input',
      '#jarvis-type-input',
      '#mini-voice-box-text-input',
      '#orb-input',
      '#voice-input',
      'input[placeholder*="Ask AGNI"]',
      'input[placeholder*="Type or tap"]',
      'input[placeholder*="speak"]',
      'input[placeholder*="Type"]',
      'textarea[placeholder*="speak"]',
      'textarea[placeholder*="Type"]',
    ];
    selectors.forEach((sel) => {
      try {
        const els = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(sel);
        els.forEach((el) => {
          if (!el) return;
          // Only update visible, editable, non-submit inputs
          if ((el as HTMLInputElement).type === 'submit' || (el as HTMLInputElement).type === 'button') return;
          el.value = liveText;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });
      } catch {}
    });
  } catch {}
}

export function useSpeechRecognition({
  selectedLanguage = 'en-IN',
  setInputText,
  setQuery,
  setInput,
  setTypedInput,
  onFinalTranscript,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any | null>(null);
  const selectedLangRef = useRef<string>(selectedLanguage);
  const isListeningRef = useRef<boolean>(false);
  const accumulatedFinalRef = useRef<string>('');

  useEffect(() => {
    selectedLangRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (langOverride?: string) => {
      if (!isSpeechRecognitionSupported()) {
        setError('SpeechRecognition is not supported in this browser.');
        return;
      }

      // Abort any existing instance cleanly
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }

      accumulatedFinalRef.current = '';
      isListeningRef.current = true;

      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        const langToUse = resolveLanguageCode(langOverride || selectedLangRef.current || 'en-IN');

        // ─── CRITICAL settings ───────────────────────────────────────────────
        recognition.lang = langToUse;
        recognition.interimResults = true;    // MUST be true for live typing
        recognition.continuous = true;        // Keep listening continuously
        recognition.maxAlternatives = 1;
        // ────────────────────────────────────────────────────────────────────

        let retryCount = 0;
        const MAX_RETRY = 3;

        recognition.onstart = () => {
          retryCount = 0;
          setIsListening(true);
          setError(null);
          console.log('[STT] Started, lang:', langToUse);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += chunk + ' ';
              accumulatedFinalRef.current += chunk + ' ';
            } else {
              interimTranscript += chunk + ' ';
            }
          }

          // Live text = all accumulated finals + current interim
          const liveText = (accumulatedFinalRef.current + interimTranscript).trim();
          console.log('[STT] LIVE:', liveText);

          // ── Update React state ──────────────────────────────────────────
          setTranscript(liveText);
          if (typeof setInputText === 'function') setInputText(liveText);
          if (typeof setQuery === 'function') setQuery(liveText);
          if (typeof setInput === 'function') setInput(liveText);
          if (typeof setTypedInput === 'function') setTypedInput(liveText);

          // ── CRITICAL: Direct DOM push so bottom box types LIVE ──────────
          domPushLiveText(liveText);

          // Fire onFinalTranscript when a sentence is finalized
          if (finalTranscript.trim() && onFinalTranscript) {
            onFinalTranscript(finalTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.log("[AGNI Voice] Error:", event.error, event);
          const err = event.error as string;
          console.warn('[STT] Error:', err);

          if (err === 'network') {
            if (retryCount < MAX_RETRY) {
              retryCount++;
              console.log(`[AGNI Voice] Network error, retrying ${retryCount}/${MAX_RETRY} in 1s...`);
              const statusEl = document.getElementById('live-voice-status');
              if (statusEl) statusEl.textContent = `Network issue, retrying ${retryCount}/${MAX_RETRY}...`;
              setTimeout(() => {
                if (isListeningRef.current && recognitionRef.current) {
                  try { recognitionRef.current.start(); } catch (e) {}
                }
              }, 1000);
              return;
            } else {
              console.warn('[AGNI Voice] Max retries reached for network error');
              const statusEl = document.getElementById('live-voice-status');
              const fallbackMsg = "Network error - Please check internet, or type manually. Retrying with Groq Whisper...";
              if (statusEl) statusEl.textContent = fallbackMsg;
              setError(fallbackMsg);
              return;
            }
          }

          if (err === 'not-allowed' || err === 'permission-denied' || err === 'service-not-allowed') {
            const msg = "Mic blocked - Click lock icon in address bar and Allow mic";
            const statusEl = document.getElementById('live-voice-status');
            if (statusEl) statusEl.textContent = msg;
            setError(msg);
            isListeningRef.current = false;
            setIsListening(false);
            return;
          }

          // On benign errors, auto-restart
          if (err === 'no-speech' || err === 'audio-capture') {
            setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch {}
              }
            }, 500);
            return;
          }

          // Fatal errors
          setError(err);
        };

        recognition.onend = () => {
          // Auto-restart if we're still supposed to be listening
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('[STT] Restart failed:', e);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('[STT] Start failed:', err);
        setError(err?.message || 'Could not start speech recognition');
        isListeningRef.current = false;
        setIsListening(false);
      }
    },
    [onFinalTranscript, setInput, setInputText, setQuery, setTypedInput]
  );

  const toggleListening = useCallback(
    (langOverride?: string) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(langOverride);
      }
    },
    [isListening, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    error,
    isSupported: isSpeechRecognitionSupported(),
  };
}
