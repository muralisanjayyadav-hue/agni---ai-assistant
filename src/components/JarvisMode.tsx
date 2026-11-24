import React, { useState } from 'react';
import { X, Mic, MicOff, Send, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { JarvisSparkOrb } from './JarvisSparkOrb';
import { useJarvis } from '../hooks/useJarvis';

interface JarvisModeProps {
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const JarvisMode: React.FC<JarvisModeProps> = ({ onClose, onNavigate }) => {
  const [typedInput, setTypedInput] = useState('');
  const {
    isListening,
    isSpeaking,
    isThinking,
    micPermission,
    youSaid,
    jarvisReply,
    toggleListening,
    submitCommand,
    stopSpeaking,
  } = useJarvis(onNavigate, onClose);

  // Sync live speech transcript directly into the bottom input box
  React.useEffect(() => {
    if (youSaid && youSaid !== 'Say Hey Jarvis or tap the mic below') {
      setTypedInput(youSaid);
    }
  }, [youSaid]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedInput.trim()) return;
    const text = typedInput.trim();
    setTypedInput('');
    await submitCommand(text);
  };

  const handleQuickChip = (command: string) => {
    setTypedInput(command);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A] text-white flex flex-col justify-between overflow-y-auto selection:bg-[#FF6A00]/40 font-sans">
      {/* Top Bar */}
      <header className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between relative z-20">
        {/* Left Spacer for balance */}
        <div className="w-10 h-10 flex items-center justify-center">
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="p-2 rounded-full bg-neutral-900/80 border border-amber-500/30 text-amber-400 hover:text-white transition cursor-pointer"
              title="Stop speaking"
            >
              <Volume2 className="h-4 w-4 animate-pulse" />
            </button>
          )}
        </div>

        {/* Top Center: AGNI Flame Logo & Title */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl filter drop-shadow-[0_0_12px_#FF6A00]">🔥</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-[#FF6A00] drop-shadow-[0_0_15px_rgba(255,106,0,0.5)]">
              AGNI JARVIS
            </h1>
          </div>
          <span className="text-[10px] sm:text-xs text-neutral-400 font-medium tracking-tight">
            Iron Man Voice System &bull; Free For All
          </span>
        </div>

        {/* Top Right: Close Button X -> goes back to Home */}
        <button
          type="button"
          id="jarvis-close-btn"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 hover:border-[#FF6A00] hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="Close Jarvis (Return to Home)"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Main Center Area */}
      <main className="w-full max-w-2xl mx-auto px-4 flex-1 flex flex-col items-center justify-center text-center my-auto py-2">
        {/* Mic Permission Alert if Denied */}
        {micPermission === 'denied' && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-neutral-900 border border-red-500/40 px-3.5 py-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>Mic blocked. You can type any command below.</span>
          </div>
        )}

        {/* Glowing Canvas Particle Sphere - JarvisSparkOrb */}
        <div
          onClick={toggleListening}
          className="my-2 sm:my-4 flex items-center justify-center cursor-pointer select-none"
          style={{ width: 320, height: 320, maxWidth: '85vw', maxHeight: '85vw' }}
          title={isListening ? 'Jarvis is listening... (1.18x)' : isSpeaking ? 'Jarvis is speaking (pulsing)...' : 'Tap orb to speak'}
        >
          <JarvisSparkOrb isListening={isListening} isSpeaking={isSpeaking} />
        </div>

        {/* Conversation Dialogue Display */}
        <div className="w-full space-y-3 mt-4 px-2">
          {/* Text 1: You said (White) */}
          <div className="bg-neutral-950/80 border border-neutral-850 rounded-2xl px-4 py-3 backdrop-blur-md">
            <span className="text-[11px] font-bold text-neutral-400 block uppercase tracking-wider mb-1">
              YOU SAID:
            </span>
            <p className="text-sm sm:text-base font-semibold text-white tracking-wide">
              {youSaid || 'Say Hey Jarvis or tap the mic below'}
            </p>
          </div>

          {/* Text 2: Jarvis reply (Orange) */}
          <div className="bg-neutral-950/90 border border-[#FF6A00]/30 rounded-2xl px-4 py-3.5 shadow-lg shadow-[#FF6A00]/5 backdrop-blur-md text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-[#FF6A00]" />
              <span className="text-[11px] font-bold text-[#FF6A00] uppercase tracking-wider">
                Jarvis:
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-[#FF8C42] whitespace-pre-wrap leading-relaxed">
              {jarvisReply}
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Area */}
      <footer className="w-full max-w-2xl mx-auto px-4 pb-6 pt-2 flex flex-col items-center gap-4 relative z-20">
        {/* Big Mic Button & Wake Word prompt */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            id="jarvis-mic-btn"
            onClick={toggleListening}
            className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-xl ${
              isListening
                ? 'bg-gradient-to-tr from-red-600 to-orange-500 text-white shadow-[0_0_40px_#FF2D00] scale-110 animate-pulse'
                : 'bg-gradient-to-tr from-[#FF6A00] to-[#FFB347] text-black shadow-[0_0_30px_#FF6A00] hover:scale-105 active:scale-95'
            }`}
            title={isListening ? 'Listening... Tap to stop' : 'Tap to speak'}
          >
            {isListening ? <Mic className="h-7 w-7 text-white" /> : <Mic className="h-7 w-7 text-black" />}
          </button>
          <span id="live-voice-status" className="text-xs font-semibold text-white tracking-wide">
            {isListening ? 'Listening now... Speak your command' : 'Say - "Hey Jarvis"'}
          </span>
        </div>

        {/* Quick Command Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickChip('search Python books on Google')}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-[#FF6A00] text-neutral-300 hover:text-white transition cursor-pointer"
          >
            🔍 Search Google
          </button>
          <button
            type="button"
            onClick={() => handleQuickChip('play Monta Re on YouTube')}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-[#FF6A00] text-neutral-300 hover:text-white transition cursor-pointer"
          >
            ▶️ Play YouTube
          </button>
          <button
            type="button"
            onClick={() => handleQuickChip('open WhatsApp')}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-[#FF6A00] text-neutral-300 hover:text-white transition cursor-pointer"
          >
            💬 Open WhatsApp
          </button>
          <button
            type="button"
            onClick={() => handleQuickChip('send email to friend about reunion')}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-[#FF6A00] text-neutral-300 hover:text-white transition cursor-pointer"
          >
            ✉️ Send Email
          </button>
        </div>

        {/* Type Box: Input + Send button */}
        <form
          onSubmit={handleSend}
          className="w-full flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-3 py-2 focus-within:border-[#FF6A00] focus-within:ring-1 focus-within:ring-[#FF6A00] transition"
        >
          <input
            type="text"
            id="jarvis-type-input"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Type or tap orb to speak..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-neutral-500 outline-none"
          />
          <button
            type="submit"
            id="jarvis-send-btn"
            disabled={!typedInput.trim()}
            className="h-8 w-8 rounded-xl bg-[#FF6A00] hover:bg-[#FF8C42] text-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition cursor-pointer shrink-0"
            title="Send command"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-1">
          <p className="text-[11px] text-neutral-500 font-medium">
            AGNI Jarvis &bull; Free For All &bull; By M. Sanjay
          </p>
        </div>
      </footer>
    </div>
  );
};
