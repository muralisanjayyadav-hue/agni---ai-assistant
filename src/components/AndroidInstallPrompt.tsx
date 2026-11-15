import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  X,
  Sparkles,
  Flame,
  CheckCircle2,
  HardDrive,
  Radio,
  Share2,
} from 'lucide-react';
import { triggerHaptic, playWakeChime } from '../utils/hardwareTrigger';

interface AndroidInstallPromptProps {
  onInstallSuccess?: () => void;
  onOpenOffline?: () => void;
}

export const AndroidInstallPrompt: React.FC<AndroidInstallPromptProps> = ({
  onInstallSuccess,
  onOpenOffline,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('agni_pwa_prompt_dismissed');
      if (dismissed) {
        const time = parseInt(dismissed, 10);
        // Dismissed for 12 hours
        return Date.now() - time < 12 * 60 * 60 * 1000;
      }
    } catch {}
    return false;
  });
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [justInstalled, setJustInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Capture Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Capture appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setJustInstalled(true);
      triggerHaptic([100, 50, 150]);
      playWakeChime();
      onInstallSuccess?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstallSuccess]);

  // Don't show if already running in standalone PWA or user recently dismissed
  if (isStandalone || isDismissed) {
    if (justInstalled) {
      return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-950/40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>AGNI Installed Successfully on your Home Screen!</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic([40]);
    if (deferredPrompt) {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setJustInstalled(true);
        triggerHaptic([100, 50, 150]);
        playWakeChime();
        onInstallSuccess?.();
      }
      setDeferredPrompt(null);
      setIsInstalling(false);
    } else {
      // Manual browser instruction fallback
      console.info('To install AGNI on Android: Tap Chrome menu > Add to Home screen');
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('agni_pwa_prompt_dismissed', Date.now().toString());
    } catch {}
  };

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 rounded-3xl border border-orange-500/40 bg-neutral-950/95 p-4 shadow-2xl shadow-orange-950/50 backdrop-blur-xl text-white animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        {/* App Icon with Glow */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-red-500 text-white shadow-lg shadow-orange-500/30">
          <Flame className="h-6 w-6 fill-current animate-pulse" />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
            ★
          </span>
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-sm font-bold text-white truncate">
              Install AGNI App
            </h3>
            <span className="rounded-full bg-orange-500/30 px-1.5 py-0.2 text-[9px] font-extrabold text-orange-300 border border-orange-500/40">
              Android PWA
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
            Add to Home Screen for 0ms launch, offline formulas &amp; hardware key trigger.
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition cursor-pointer shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Feature Badges */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-neutral-300 border-t border-neutral-800/80 pt-2.5">
        <span className="flex items-center gap-1">
          <HardDrive className="h-3 w-3 text-orange-400" />
          <span>Works Offline</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Radio className="h-3 w-3 text-amber-400" />
          <span>Siri Mic Orb</span>
        </span>
        <span>•</span>
        <span className="text-emerald-400 font-semibold">100% Free</span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl border border-neutral-700 bg-neutral-900 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition cursor-pointer text-center"
        >
          Later
        </button>
        <button
          type="button"
          disabled={isInstalling}
          onClick={handleInstallClick}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isInstalling ? 'Installing...' : 'Add to Home'}</span>
        </button>
      </div>
    </div>
  );
};
