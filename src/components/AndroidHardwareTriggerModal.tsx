import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  Mic,
  Bell,
  Radio,
  Flame,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Volume2,
  Power,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  checkAndroidPermissions,
  requestAllOverlayPermissions,
  triggerHaptic,
  playWakeChime,
  AndroidOverlayPermissions,
} from '../utils/hardwareTrigger';

interface AndroidHardwareTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerVoice: () => void;
}

export const AndroidHardwareTriggerModal: React.FC<AndroidHardwareTriggerModalProps> = ({
  isOpen,
  onClose,
  onTriggerVoice,
}) => {
  const [permissions, setPermissions] = useState<AndroidOverlayPermissions | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [isTestingHold, setIsTestingHold] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const testTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      checkAndroidPermissions().then(setPermissions);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGrantPermissions = async () => {
    setIsRequesting(true);
    triggerHaptic([40]);
    await requestAllOverlayPermissions();
    const updated = await checkAndroidPermissions();
    setPermissions(updated);
    setIsRequesting(false);
  };

  // Test hold simulation (1.5 seconds)
  const handleStartHoldTest = () => {
    setIsTestingHold(true);
    setTestSuccess(false);
    startTimeRef.current = Date.now();
    triggerHaptic([30]);

    if (testTimerRef.current) clearInterval(testTimerRef.current);

    testTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1.0, elapsed / 1500);
      setTestProgress(progress);

      if (progress >= 1.0) {
        clearInterval(testTimerRef.current);
        testTimerRef.current = null;
        setIsTestingHold(false);
        setTestSuccess(true);
        triggerHaptic([100, 50, 150]);
        playWakeChime();

        setTimeout(() => {
          onClose();
          onTriggerVoice();
        }, 600);
      }
    }, 30);
  };

  const handleCancelHoldTest = () => {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    setIsTestingHold(false);
    setTestProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:p-7">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-red-500 text-white shadow-lg shadow-orange-500/25">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-50 sm:text-xl">
                Android Hardware Trigger
              </h2>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                PRO PWA
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Hold <strong className="text-neutral-800 dark:text-neutral-200">Volume Up + Power</strong> for 1.5s to wake AGNI
            </p>
          </div>
        </div>

        {/* Feature Explanation Banner */}
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50/50 to-transparent p-4 border border-orange-200/80 dark:border-orange-900/40 dark:from-orange-950/20 dark:via-neutral-850">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                Lock Screen &amp; Hardware Key Wake
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Powered by the <strong>Media Session API</strong> and <strong>Hardware Keydown Listener</strong>.
                AGNI anchors to Android&apos;s lock-screen media controls, enabling instant Siri-like voice overlay from anywhere!
              </p>
            </div>
          </div>
        </div>

        {/* Permissions Checklist */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Permissions &amp; Engine Readiness
          </h3>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {/* Microphone */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-850/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mic className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    Microphone
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Voice input capture
                  </p>
                </div>
              </div>
              {permissions?.microphone === 'granted' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Needed</span>
              )}
            </div>

            {/* Media Session & Lock Screen */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-850/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <Radio className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    Media Session API
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Lock screen widget
                  </p>
                </div>
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-850/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    Background Alerts
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Notification bar
                  </p>
                </div>
              </div>
              {permissions?.notifications === 'granted' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-neutral-400">Optional</span>
              )}
            </div>

            {/* PWA Mode */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-850/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    Standalone PWA
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Full-screen overlay
                  </p>
                </div>
              </div>
              {permissions?.isPwa ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">Add to Home</span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isRequesting}
            onClick={handleGrantPermissions}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:from-orange-700 hover:to-amber-700 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isRequesting ? 'Requesting Permissions...' : 'Grant Overlay & Voice Permissions'}</span>
          </button>
        </div>

        {/* Interactive 1.5s Hold Test Chamber */}
        <div className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Live Trigger Simulator
            </h3>
            <span className="text-[11px] text-neutral-400">1.5s Hold Test</span>
          </div>

          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-400/50 bg-orange-50/30 p-6 dark:border-orange-600/30 dark:bg-orange-950/10">
            {/* Visual Circular Hold Progress Ring */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-neutral-200 dark:stroke-neutral-800"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-orange-500 transition-all duration-75"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - 264 * testProgress}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              <button
                type="button"
                onMouseDown={handleStartHoldTest}
                onMouseUp={handleCancelHoldTest}
                onMouseLeave={handleCancelHoldTest}
                onTouchStart={handleStartHoldTest}
                onTouchEnd={handleCancelHoldTest}
                className={`relative flex h-18 w-18 items-center justify-center rounded-full transition-transform cursor-pointer select-none ${
                  isTestingHold
                    ? 'scale-90 bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-xl shadow-orange-500/40'
                    : testSuccess
                    ? 'scale-105 bg-emerald-500 text-white'
                    : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md hover:scale-105'
                }`}
              >
                {testSuccess ? (
                  <CheckCircle2 className="h-8 w-8 animate-bounce" />
                ) : (
                  <Flame className={`h-8 w-8 ${isTestingHold ? 'animate-pulse' : ''}`} />
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {isTestingHold
                ? `Holding... ${(testProgress * 1.5).toFixed(1)}s / 1.5s`
                : testSuccess
                ? '🔥 Hardware Trigger Success! Opening AGNI...'
                : 'Press & Hold Orb (or hold Volume Up on phone) for 1.5s'}
            </p>
            <p className="text-center text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
              On Android: Press &amp; hold <strong>Volume Up</strong> key directly to test hardware detection
            </p>
          </div>
        </div>

        {/* Android OS Overlay Instructions */}
        <div className="mt-5 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800/60 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
            <ExternalLink className="h-3.5 w-3.5 text-orange-500" />
            <span>For 100% Lock Screen &amp; Overlay Coverage on Android:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-neutral-600 dark:text-neutral-300 text-[11px]">
            <li>Open Android <strong>Settings &rarr; Apps &rarr; Chrome</strong> (or AGNI).</li>
            <li>Enable <strong>&quot;Display over other apps&quot;</strong> (Appear on top).</li>
            <li>Set <strong>Battery usage</strong> to <strong>&quot;Unrestricted&quot;</strong> to allow background wake.</li>
            <li>In Chrome menu (⋮), tap <strong>&quot;Add to Home screen&quot; / &quot;Install app&quot;</strong>.</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-neutral-300 px-5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
