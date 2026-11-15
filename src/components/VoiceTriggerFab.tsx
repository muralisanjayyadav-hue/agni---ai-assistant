import React, { useState, useRef, useEffect } from 'react';
import { Mic, Flame, Sparkles } from 'lucide-react';

interface VoiceTriggerFabProps {
  onTrigger: () => void;
  isOpen: boolean;
}

export const VoiceTriggerFab: React.FC<VoiceTriggerFabProps> = ({ onTrigger, isOpen }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const pressTimerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const hasTriggeredRef = useRef(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPressProgress(0);
    setIsPressing(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle primary pointer (left click / single touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    hasTriggeredRef.current = false;
    setIsPressing(true);
    startTimeRef.current = Date.now();

    // Visual progress update every 20ms up to 1000ms
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / 1000) * 100);
      setPressProgress(progress);
    }, 20);

    // 1-second long-press trigger
    pressTimerRef.current = setTimeout(() => {
      hasTriggeredRef.current = true;
      clearTimers();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {}
      }
      onTrigger();
    }, 1000);
  };

  const handlePointerUp = () => {
    // If not triggered by long-press yet, trigger via quick tap!
    if (!hasTriggeredRef.current && isPressing) {
      clearTimers();
      onTrigger();
    } else {
      clearTimers();
    }
  };

  const handlePointerCancel = () => {
    clearTimers();
  };

  // If the Siri Voice Box is already open, hide the FAB to prevent visual overlap
  if (isOpen) return null;

  return (
    <div
      id="agni-global-voice-fab-container"
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end pointer-events-auto"
    >
      {/* Subtle Hint Tooltip */}
      {showTooltip && (
        <div className="mb-2 mr-1 animate-in fade-in zoom-in duration-150 rounded-xl bg-neutral-900/95 border border-orange-500/40 px-3 py-1.5 text-[11px] font-medium text-neutral-200 shadow-xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
          <Sparkles className="h-3 w-3 text-orange-400 shrink-0" />
          <span>Tap or Hold 1s to talk • <kbd className="font-mono text-[10px] text-orange-400 bg-neutral-800 px-1 py-0.5 rounded">Alt+A</kbd> or <kbd className="font-mono text-[10px] text-orange-400 bg-neutral-800 px-1 py-0.5 rounded">Space+V</kbd></span>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        id="agni-global-voice-fab-btn"
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Open AGNI Voice Assistant (Tap or Hold 1s)"
        title="Talk with AGNI (Tap or Hold 1s • Alt+A / Space+V)"
        className={`group relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full transition-all duration-300 cursor-pointer select-none touch-none ${
          isPressing ? 'scale-95' : 'hover:scale-105 active:scale-95'
        }`}
      >
        {/* Animated Outer Pulse Aura (AGNI Voice Orb) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 opacity-75 blur-md group-hover:opacity-100 transition-opacity animate-pulse" />

        {/* Outer Ring Border */}
        <div className="absolute -inset-1 rounded-full border border-orange-400/40 bg-orange-500/10 animate-spin transition-all duration-1000 [animation-duration:8s]" />

        {/* Circular SVG Long-Press Progress Indicator */}
        <svg className="absolute -inset-1.5 h-[68px] w-[68px] sm:h-[76px] sm:w-[76px] -rotate-90 pointer-events-none">
          <circle
            cx="50%"
            cy="50%"
            r="46%"
            fill="none"
            stroke="rgba(249, 115, 22, 0.25)"
            strokeWidth="3"
          />
          {isPressing && (
            <circle
              cx="50%"
              cy="50%"
              r="46%"
              fill="none"
              stroke="#fb923c"
              strokeWidth="3"
              strokeDasharray="200"
              strokeDashoffset={200 - (pressProgress / 100) * 200}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          )}
        </svg>

        {/* Central Core */}
        <div className="relative z-10 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-orange-400/50 shadow-lg shadow-black/80">
          <div className="relative flex items-center justify-center">
            {/* Glowing flame backdrop */}
            <Flame className="absolute h-7 w-7 sm:h-8 sm:w-8 text-orange-500/30 blur-xs" />
            <Mic className="relative h-6 w-6 sm:h-7 sm:w-7 text-orange-400 group-hover:text-amber-300 transition-colors" />
          </div>
        </div>

        {/* Little "LIVE" / Voice Indicator Pill */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
        </span>
      </button>
    </div>
  );
};
