import { useState, useRef, useCallback, useEffect } from 'react';
import { isSpeechRecognitionSupported, resolveLanguageCode } from '../utils/speech';

export interface UseSpeechRecognitionOptions {
  selectedLanguage?: string;
  setInputText?: (text: string) => void;
  setQuery?: (text: string) => void;
  setInput?: (text: string) => void;
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

export function useSpeechRecognition({
  selectedLanguage = 'en-IN',
  setInputText,
  setQuery,
  setInput,
  onFinalTranscript,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any | null>(null);
  const selectedLangRef = useRef<string>(selectedLanguage);

  useEffect(() => {
    selectedLangRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (langOverride?: string) => {
      if (!isSpeechRecognitionSupported()) {
        setError('SpeechRecognition is not supported in this browser.');
        return;
      }

      // Abort any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        const langToUse = resolveLanguageCode(langOverride || selectedLangRef.current || 'en-IN');
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.lang = langToUse;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
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
          console.log('Transcript:', text);

          setTranscript(text);
          // UPDATE BOTH STATES - THIS IS THE FIX:
          if (setInputText) setInputText(text);
          if (setQuery) setQuery(text);
          if (setInput) setInput(text);

          // Direct DOM live typing into bottom input box across Home Hub & Jarvis
          try {
            const targetInputs = document.querySelectorAll<HTMLInputElement>(
              '#jarvis-type-input, #home-message-input, #mini-voice-box-text-input, input[placeholder*="speak"], input[placeholder*="Type"]'
            );
            targetInputs.forEach((el) => {
              el.value = text;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            });
          } catch {}

          if (finalTranscript && onFinalTranscript) {
            onFinalTranscript(finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          setError(event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          // Do not clear input on onend
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('SpeechRecognition start failed:', err);
        setError(err?.message || 'Could not start speech recognition');
        setIsListening(false);
      }
    },
    [onFinalTranscript, setInput, setInputText, setQuery]
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
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
