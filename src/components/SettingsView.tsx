import BackButton from './BackButton';
import React, { useState, useEffect } from 'react';
import { GOLD_FOUNDERS } from '../lib/auth';
import {
  Settings,
  Power,
  Volume2,
  VolumeX,
  Volume1,
  Plus,
  Minus,
  Sparkles,
  Radio,
  Sliders,
  Globe,
  Shield,
  Trash2,
  RefreshCw,
  Play,
  Check,
  Smartphone,
  Flame,
  Zap,
  Moon,
  Sun,
  Bell,
  Cpu,
  Award,
  Users,
  BarChart2,
} from 'lucide-react';
import { UserPreferences, AuthUser } from '../types';
import { SUPPORTED_LANGUAGES, getLanguageOption } from '../data/languages';
import { speakText, stopSpeaking } from '../utils/speech';

interface SettingsViewProps {
  userPreferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  authUser: AuthUser | null;
  onOpenTerms?: (tab?: 'terms' | 'privacy' | 'student' | 'about') => void;
  onOpenFounderAccess?: () => void;
  onOpenHardwareTriggerModal?: () => void;
  onNavigateTab?: (tab: any) => void;
  isOfflineMode?: boolean;
  onToggleOfflineMode?: (enabled: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userPreferences,
  onUpdatePreferences,
  authUser,
  onOpenTerms,
  onOpenFounderAccess,
  onOpenHardwareTriggerModal,
  onNavigateTab,
  isOfflineMode = false,
  onToggleOfflineMode,
}) => {
  const [currentVolume, setCurrentVolume] = useState<number>(userPreferences.masterVolume ?? 90);
  const [powerState, setPowerState] = useState<'active' | 'standby' | 'saver'>(
    userPreferences.powerState ?? 'active'
  );
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);
  const [parentViewEnabled, setParentViewEnabled] = useState<boolean>(() => {
    return localStorage.getItem('agni_parent_view_enabled') === 'true';
  });

  const handleToggleParentView = () => {
    const next = !parentViewEnabled;
    setParentViewEnabled(next);
    localStorage.setItem('agni_parent_view_enabled', next ? 'true' : 'false');
    setSaveToast(next ? 'Parent View turned ON' : 'Parent View turned OFF');
    setTimeout(() => setSaveToast(null), 2500);
  };

  useEffect(() => {
    // Listen for PWA beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2200);
  };

  // Master Power Toggle
  const handlePowerToggle = (state: 'active' | 'standby' | 'saver') => {
    setPowerState(state);
    onUpdatePreferences({ powerState: state });
    if (state === 'standby') {
      stopSpeaking();
      triggerToast('AGNI System entered Standby Mode 🌙');
    } else if (state === 'saver') {
      triggerToast('AGNI Battery Saver Mode Active ⚡');
    } else {
      triggerToast('AGNI System Fully Active & Online 🔥');
    }
  };

  // Volume Adjustment Handlers
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setCurrentVolume(clamped);
    onUpdatePreferences({ masterVolume: clamped });
  };

  const handleVolumeUp = () => {
    const newVol = Math.min(100, currentVolume + 10);
    handleVolumeChange(newVol);
    triggerToast(`Volume Boosted to ${newVol}% 🔊`);
  };

  const handleVolumeDown = () => {
    const newVol = Math.max(0, currentVolume - 10);
    handleVolumeChange(newVol);
    triggerToast(`Volume set to ${newVol}% 🔉`);
  };

  // Audio Audition Ping
  const handleTestAudioPing = () => {
    stopSpeaking();
    setIsTestingAudio(true);
    const langConfig = getLanguageOption(userPreferences.language);
    const greeting =
      userPreferences.language.toLowerCase().includes('tamil')
        ? 'வணக்கம்! AGNI ஆடியோ சிஸ்டம் சிறப்பாக செயல்படுகிறது!'
        : userPreferences.language.toLowerCase().includes('hindi')
        ? 'नमस्ते! AGNI ऑडियो सिस्टम बेहतरीन काम कर रहा है!'
        : userPreferences.language.toLowerCase().includes('telugu')
        ? 'నమస్కారం! AGNI ఆడియో సిస్టమ్ చక్కగా పనిచేస్తోంది!'
        : 'Vanakkam! AGNI voice and volume output are crystal clear and ready!';

    speakText(greeting, {
      volume: currentVolume / 100,
      rate: userPreferences.voiceSpeed || 1.0,
      pitch: userPreferences.voicePitch || 1.05,
      lang: langConfig.speechCode || 'en-IN',
      onEnd: () => setIsTestingAudio(false),
      onError: () => setIsTestingAudio(false),
    });
  };

  const handleInstallPwa = async () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      const choice = await pwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
        triggerToast('AGNI installed to home screen! 📱');
      }
    } else {
      triggerToast('To install, tap browser menu (⋮) -> "Add to Home screen" / "Install AGNI"');
    }
  };

  const isFounder =
    GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(authUser?.email?.toLowerCase().trim() || '');

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6 animate-in fade-in duration-200">
      <BackButton label="Back" />
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-orange-600 text-white px-5 py-2 text-xs font-bold shadow-xl shadow-orange-600/30 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150">
          <Check className="h-4 w-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-neutral-900 via-neutral-950 to-orange-950/40 p-5 sm:p-6 text-white shadow-xl shadow-orange-950/20 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-red-500 text-white shadow-lg shadow-orange-600/30">
              <Settings className="h-7 w-7 animate-spin" style={{ animationDuration: '20s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                  AGNI System Settings
                </h1>
                <span className="rounded-full bg-orange-500/20 border border-orange-400/40 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                  Android Web App
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                Master Power Controls • Volume &amp; Audio Booster • Persona • Language Hub
              </p>
            </div>
          </div>

          {/* Quick Power Indicator Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div
              className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 border text-xs font-bold transition-all ${
                powerState === 'active'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : powerState === 'saver'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  powerState === 'active'
                    ? 'bg-emerald-400 animate-pulse'
                    : powerState === 'saver'
                    ? 'bg-amber-400'
                    : 'bg-neutral-500'
                }`}
              />
              <span className="capitalize">{powerState} Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: MASTER POWER TOGGLE & LATENCY CONTROLS */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Power className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                AGNI Master Power Toggle
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Toggle AI assistant wake state, battery saver, and background standby
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Active Power */}
          <button
            type="button"
            onClick={() => handlePowerToggle('active')}
            className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              powerState === 'active'
                ? 'border-orange-500 bg-orange-50/80 dark:bg-orange-950/30 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/30 shadow-md'
                : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white text-xs">
                <Zap className="h-4 w-4" />
              </span>
              {powerState === 'active' && <Check className="h-4 w-4 text-orange-600 dark:text-orange-400 font-bold" />}
            </div>
            <div>
              <div className="font-bold text-sm">Full Active Power</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Instant voice synthesis, live camera OCR &amp; continuous readiness.
              </div>
            </div>
          </button>

          {/* Battery Saver */}
          <button
            type="button"
            onClick={() => handlePowerToggle('saver')}
            className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              powerState === 'saver'
                ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30 shadow-md'
                : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white text-xs">
                <Flame className="h-4 w-4" />
              </span>
              {powerState === 'saver' && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400 font-bold" />}
            </div>
            <div>
              <div className="font-bold text-sm">Battery Saver Mode</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Reduces background animation &amp; optimizes audio streaming for low power.
              </div>
            </div>
          </button>

          {/* Standby / Sleep */}
          <button
            type="button"
            onClick={() => handlePowerToggle('standby')}
            className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              powerState === 'standby'
                ? 'border-neutral-500 bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 ring-2 ring-neutral-500/30 shadow-md'
                : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-600 text-white text-xs">
                <Moon className="h-4 w-4" />
              </span>
              {powerState === 'standby' && <Check className="h-4 w-4 text-neutral-700 dark:text-neutral-200 font-bold" />}
            </div>
            <div>
              <div className="font-bold text-sm">Standby / Sleep</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Silences voice engines &amp; pauses audio. Tap mic to awaken anytime.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: VOLUME UP & MASTER AUDIO CONTROLS */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Master Audio &amp; Volume Controls
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Adjust speaker volume, trigger instant Volume Up boost, and test playback
              </p>
            </div>
          </div>

          {/* Quick Voice Output Enable Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Voice Output:
            </span>
            <button
              type="button"
              onClick={() => onUpdatePreferences({ voiceEnabled: !userPreferences.voiceEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                userPreferences.voiceEnabled ? 'bg-orange-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  userPreferences.voiceEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Volume Up / Down Action Bar with Slider */}
        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-950/60 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentVolume === 0 ? (
                <VolumeX className="h-5 w-5 text-neutral-400" />
              ) : currentVolume < 50 ? (
                <Volume1 className="h-5 w-5 text-orange-500" />
              ) : (
                <Volume2 className="h-5 w-5 text-orange-600" />
              )}
              <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                Speaker Output Level: {currentVolume}%
              </span>
            </div>

            {/* Explicit Volume Up & Down Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="settings-volume-down-btn"
                onClick={handleVolumeDown}
                title="Decrease Volume (-10%)"
                className="flex items-center gap-1 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer active:scale-95"
              >
                <Minus className="h-3.5 w-3.5" />
                <span>Vol -</span>
              </button>

              <button
                type="button"
                id="settings-volume-up-btn"
                onClick={handleVolumeUp}
                title="Increase Volume (+10%)"
                className="flex items-center gap-1 rounded-xl border border-orange-500 bg-gradient-to-r from-orange-600 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-600/25 hover:from-orange-500 hover:to-amber-500 transition cursor-pointer active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Volume Up</span>
              </button>
            </div>
          </div>

          {/* Volume Slider Bar */}
          <div className="space-y-1.5">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={currentVolume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-orange-600 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 font-semibold px-1">
              <span>Mute (0%)</span>
              <span>Default (50%)</span>
              <span>Boosted (100%)</span>
            </div>
          </div>

          {/* Test Voice Audition Button */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Audition current audio output &amp; pronunciation
            </span>
            <button
              type="button"
              id="settings-test-audio-btn"
              onClick={handleTestAudioPing}
              disabled={isTestingAudio}
              className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300 transition cursor-pointer disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 fill-current ${isTestingAudio ? 'animate-spin' : ''}`} />
              <span>{isTestingAudio ? 'Playing Audio...' : 'Test AGNI Audio Ping'}</span>
            </button>
          </div>
        </div>

        {/* Speed & Pitch Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">Speech Cadence / Speed</span>
              <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                {userPreferences.voiceSpeed || 1.0}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={userPreferences.voiceSpeed || 1.0}
              onChange={(e) => onUpdatePreferences({ voiceSpeed: Number(e.target.value) })}
              className="w-full accent-orange-600 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>Relaxed (0.8x)</span>
              <span>Natural (1.0x)</span>
              <span>Brisk (1.3x)</span>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">Voice Tone Pitch</span>
              <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                {userPreferences.voicePitch || 1.05}
              </span>
            </div>
            <input
              type="range"
              min="0.85"
              max="1.25"
              step="0.05"
              value={userPreferences.voicePitch || 1.05}
              onChange={(e) => onUpdatePreferences({ voicePitch: Number(e.target.value) })}
              className="w-full accent-orange-600 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>Deep Studio</span>
              <span>Warm Human</span>
              <span>Youthful Crisp</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: VOICE PERSONA PROFILES (STRICT AGNI BRANDING) */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              AGNI Voice Persona Engine
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Select your preferred conversational voice tone &amp; accent
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {[
            {
              id: 'swara',
              name: 'AGNI Swara',
              accent: 'Indian English & Multilingual Warmth',
              desc: 'Friendly, youthful tone ideal for everyday assistance & tutoring.',
              badge: 'Recommended',
            },
            {
              id: 'ember',
              name: 'AGNI Ember',
              accent: 'Natural Conversational',
              desc: 'Crisp articulation with dynamic inflection and natural pauses.',
            },
            {
              id: 'dhruv',
              name: 'AGNI Dhruv',
              accent: 'Deep Studio Resonance',
              desc: 'Grounded, authoritative voice for professional & technical queries.',
            },
            {
              id: 'tara',
              name: 'AGNI Tara',
              accent: 'Crystal Clear Academic',
              desc: 'Precise phonetics and paced guidance for complex study topics.',
            },
          ].map((v) => {
            const isSelected = (userPreferences.agniVoiceProfile || 'swara') === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onUpdatePreferences({ agniVoiceProfile: v.id as any });
                  triggerToast(`Selected Voice: ${v.name}`);
                }}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/30 shadow-md'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                    isSelected ? 'bg-purple-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  <Radio className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{v.name}</span>
                    {v.badge && (
                      <span className="rounded-full bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                        {v.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 mt-0.5">{v.accent}</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">{v.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: LANGUAGE & REGIONAL PREFERENCES */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Primary Language &amp; Code-Switching
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Supported in 13+ Indian languages with automatic dialect recognition
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Default Conversation Language
            </label>
            <select
              value={userPreferences.language}
              onChange={(e) => {
                onUpdatePreferences({ language: e.target.value });
                triggerToast(`Language set to ${e.target.value}`);
              }}
              className="w-full h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              <optgroup label="🇮🇳 Indian Languages">
                {SUPPORTED_LANGUAGES.filter((l) => l.category === 'Indian').map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label} ({lang.nativeName})
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌍 Global Languages">
                {SUPPORTED_LANGUAGES.filter((l) => l.category === 'Global').map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label} ({lang.nativeName})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Bilingual Code-Switching Mode
            </label>
            <select
              value={userPreferences.bilingualMode || 'none'}
              onChange={(e) => onUpdatePreferences({ bilingualMode: e.target.value as any })}
              className="w-full h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              <option value="none">Standard Language Mode</option>
              <option value="hinglish">🇮🇳 Hinglish (Hindi + English Blended)</option>
              <option value="tunglish">🇮🇳 Tanglish / Tunglish (Tamil/Telugu + English)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5: ANDROID WEB APP & SHORTCUTS */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Android Web App &amp; Hardware Shortcuts
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Progressive Web App installation and hardware button triggers
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
              {isPwaInstalled ? '✅ Installed as Standalone Android Web App' : '📱 Install AGNI on Android Device'}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Experience zero-lag full screen mode, offline flashcards, and instant home screen launch.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstallPwa}
            className="flex items-center gap-1.5 rounded-xl border border-orange-500 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer shrink-0"
          >
            <Smartphone className="h-4 w-4" />
            <span>{isPwaInstalled ? 'PWA Installed' : 'Install App'}</span>
          </button>
        </div>

        {/* Hardware Shortcut Info & Configuration Button */}
        <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 p-4 text-xs space-y-3 text-neutral-600 dark:text-neutral-300">
          <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span>⚡ Android Hardware Trigger (Vol Up + Power / Lock Screen)</span>
            </span>
            {onOpenHardwareTriggerModal && (
              <button
                type="button"
                onClick={onOpenHardwareTriggerModal}
                className="flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Configure &amp; Test</span>
              </button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed">
            • <strong>Hold [Volume Up] + [Power] for 1.5s</strong>: Wakes AGNI with Siri-like voice listening overlay even from the Android lock screen.
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong>Media Session API</strong>: Integrated lock screen controls &amp; bluetooth headset button trigger.
          </p>
          <p className="text-[11px] leading-relaxed">
            • <strong>Keyboard Shortcut</strong>: Press <code>Alt + A</code> or <code>Space + V</code> from any screen to launch real-time voice mode.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 6: PRIVACY, POLICY & FOUNDER RECOGNITION */}
      {/* ======================================================== */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Privacy, Security &amp; About
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Client data sovereignty • Zero data selling guarantee
            </p>
          </div>
        </div>

                {/* Parent View ON/OFF Toggle (Privacy Safe) */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Parent View ON/OFF
                </span>
                <span className="ml-2 text-[10px] font-semibold text-neutral-500">
                  (Default: OFF)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleParentView}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                parentViewEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
              role="switch"
              aria-checked={parentViewEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  parentViewEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Privacy disclaimer: <strong>Shows only time &amp; count, not private chats</strong>. Protected by local PIN (1234).
          </p>

          {parentViewEnabled && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab('parent_dashboard');
                } else {
                  window.location.href = '/parent-dashboard';
                }
              }}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 shadow-md shadow-blue-500/20 transition cursor-pointer"
              style={{ minHeight: 48 }}
            >
              <Users className="h-4 w-4" />
              <span>Open Parent Dashboard (PIN: 1234)</span>
            </button>
          )}
        </div>

        {/* Offline Mode Toggle — OFF by Default */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-500">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  Offline Mode OFF by default
                </span>
                <span className="ml-2 text-[10px] font-semibold text-neutral-500">
                  ({isOfflineMode ? 'ON' : 'OFF (API Only)'})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isOfflineMode;
                onToggleOfflineMode?.(next);
                try {
                  localStorage.setItem('agni_offline_mode', next ? 'true' : 'false');
                } catch {}
                triggerToast(next ? 'Offline Mode enabled' : 'Offline Mode disabled — Live API only');
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isOfflineMode ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isOfflineMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            AGNI runs 100% on Live Groq AI API. Enable Offline Mode only if you wish to browse the offline formula revision bank.
          </p>

          {isOfflineMode && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateTab) {
                  onNavigateTab('offline');
                } else {
                  window.location.href = '/?tab=offline';
                }
              }}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
              style={{ minHeight: 44 }}
            >
              <Radio className="h-4 w-4" />
              <span>Open Offline Formula Bank &rarr;</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {onOpenTerms && (
            <>
              <button
                type="button"
                onClick={() => onOpenTerms('terms')}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <span>Terms of Service</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenTerms('privacy')}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <span>Privacy Policy</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenTerms('about')}
                className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300 cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5" />
                <span>About AGNI &amp; Founders M. Sanjay &amp; T. Hasini</span>
              </button>
            </>
          )}

          {isFounder && (
            <>
              {onOpenFounderAccess && (
                <button
                  type="button"
                  onClick={onOpenFounderAccess}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-500/20 px-3.5 py-2 text-xs font-black text-amber-900 dark:text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                >
                  <span>👑 Founder Dashboard</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onNavigateTab) {
                    onNavigateTab("founder_analytics");
                  } else {
                    window.location.href = "/founder-analytics";
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-orange-500 bg-[#FF6B00]/20 px-3.5 py-2 text-xs font-bold text-orange-400 hover:bg-[#FF6B00]/30 cursor-pointer"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span>📊 Founder Analytics</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
