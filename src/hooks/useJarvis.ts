/**
 * AGNI Jarvis Mode - Voice & Speech Hook
 * Web Speech API + SpeechSynthesis + Continuous Listening
 * Free For All • By M. Sanjay
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { processJarvisCommand, CommandExecutionResult } from '../utils/jarvisCommands';

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
  const [youSaid, setYouSaid] = useState<string>('Say "Hey Jarvis" or tap the mic below');
  const [jarvisReply, setJarvisReply] = useState<string>('Jarvis online, Sir. How may I assist you today?');
  const [lastAction, setLastAction] = useState<string>('initialized');

  const recognitionRef = useRef<any | null>(null);
  const shouldListenRef = useRef<boolean>(true);
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, []);

  // Speak text with en-IN or en-US voice
  const speakAloud = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onDone) onDone();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural sounding Indian or English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang.includes('en-IN') && !v.name.includes('Google')) ||
        voices.find((v) => v.lang.includes('en-IN')) ||
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

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.debug('[Jarvis Speech Utterance Error]', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onDone) onDone();
    }
  }, []);

  // Core execution handler for any input command
  const submitCommand = useCallback(
    async (commandText: string) => {
      const cleanInput = commandText.trim();
      if (!cleanInput) return;

      stopSpeaking();
      setYouSaid(cleanInput);
      setIsThinking(true);
      isThinkingRef.current = true;
      setJarvisReply('Jarvis is thinking...');

      try {
        const result: CommandExecutionResult = await processJarvisCommand(cleanInput);

        setJarvisReply(result.displayText);
        setLastAction(result.actionTaken);
        setIsThinking(false);
        isThinkingRef.current = false;

        // Speak response aloud
        speakAloud(result.speechText, () => {
          if (result.shouldClose) {
            setTimeout(() => {
              if (onClose) onClose();
              else if (onNavigate) onNavigate('/');
            }, 1000);
          }
        });
      } catch (err) {
        console.error('[Jarvis Command Execution Error]', err);
        setIsThinking(false);
        isThinkingRef.current = false;
        const fallbackText = 'Let me look into that for you, Sir.';
        setJarvisReply(fallbackText);
        speakAloud(fallbackText);
      }
    },
    [onClose, onNavigate, speakAloud, stopSpeaking]
  );

  // Start Recognition
  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.debug('[Jarvis Recognition start notice]', e);
    }
  }, []);

  // Stop Recognition
  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch {}
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

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[Jarvis] Web Speech Recognition not supported in this browser environment');
      setMicPermission('denied');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Understands Indian English, Hindi & Tamil accents
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMicPermission('granted');
    };

    recognition.onresult = (event: any) => {
      // Don't process input while Jarvis itself is speaking to prevent feedback loop
      if (isSpeakingRef.current) return;

      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult.isFinal) {
        const transcript = lastResult[0]?.transcript?.trim();
        if (transcript) {
          submitCommand(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.debug('[Jarvis Recognition Event]', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicPermission('denied');
        setIsListening(false);
        shouldListenRef.current = false;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if we should keep listening and not currently speaking
      if (shouldListenRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    // Initial greeting aloud
    speakAloud('Jarvis online, Sir. At your service.');

    // Auto-start listening on mount
    try {
      recognition.start();
    } catch {}

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {}
      stopSpeaking();
    };
  }, [speakAloud, stopSpeaking, submitCommand]);

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
