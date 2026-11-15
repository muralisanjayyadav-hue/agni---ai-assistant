/**
 * AGNI Android Hardware Trigger & Lock Screen Assistant Engine
 * 
 * Capabilities:
 * 1. Hardware Key Combo: Listens for Volume Up + Power button held together for 1.5 seconds.
 *    Supports Android keycodes (KEYCODE_VOLUME_UP 24, KEYCODE_POWER 26), standard Web KeyboardEvent,
 *    and desktop simulation (ArrowUp + P or Volume Up hold).
 * 2. Media Session API: Background & Lock Screen audio session with lock screen notification widget
 *    and headset/hardware media key routing so AGNI can be triggered from the Android lock screen.
 * 3. Screen Wake Lock: Keeps the screen awake during active voice sessions.
 * 4. Dual Haptic + Acoustic Chime: Vibrates and plays a pleasant wake chime upon 1.5s activation.
 */

export interface HardwareTriggerOptions {
  holdDurationMs?: number; // Default 1500ms (1.5s)
  onProgress?: (progress: number, isHolding: boolean) => void;
  onTrigger: () => void;
}

let activeWakeLock: any = null;
let silentAudioEl: HTMLAudioElement | null = null;
let isMediaSessionInitialized = false;

// 1. Acoustic Feedback: Synthesize Siri-like wake chime (Web Audio API)
export function playWakeChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Pleasant double chime: D5 (587.33 Hz) -> A5 (880 Hz)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch (err) {
    console.debug('Wake chime error:', err);
  }
}

// 2. Haptic Vibration
export function triggerHaptic(pattern: number[] = [80, 40, 160]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

// 3. Screen Wake Lock API
export async function requestScreenWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
      activeWakeLock = await (navigator as any).wakeLock.request('screen');
      activeWakeLock.addEventListener('release', () => {
        activeWakeLock = null;
      });
      return true;
    }
  } catch (err) {
    console.debug('WakeLock request failed:', err);
  }
  return false;
}

export function releaseScreenWakeLock(): void {
  try {
    if (activeWakeLock) {
      activeWakeLock.release().catch(() => {});
      activeWakeLock = null;
    }
  } catch {}
}

// 4. Media Session Lock Screen & Background Trigger
// Creates a silent audio loop so Android Chrome keeps the Media Notification widget on Lock Screen
export function setupMediaSessionTrigger(onTrigger: () => void): boolean {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return false;
  }

  try {
    // 1-second silent WAV base64 loop
    if (!silentAudioEl) {
      silentAudioEl = document.createElement('audio');
      silentAudioEl.id = 'agni-lockscreen-media-anchor';
      silentAudioEl.loop = true;
      silentAudioEl.preload = 'auto';
      silentAudioEl.volume = 0.01; // Nearly silent
      // Standard minimal silent WAV data URI
      silentAudioEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      document.body.appendChild(silentAudioEl);
    }

    // Set Android Lock Screen Metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'AGNI Voice Assistant',
      artist: 'Vol Up + Power / Tap to Speak',
      album: 'AGNI Neural Companion',
      artwork: [
        { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/logo.png', sizes: '1024x1024', type: 'image/png' },
      ],
    });

    // Wire up hardware headset and lock screen buttons
    const handleAction = () => {
      triggerHaptic([60, 40, 100]);
      playWakeChime();
      onTrigger();
    };

    navigator.mediaSession.setActionHandler('play', handleAction);
    navigator.mediaSession.setActionHandler('pause', handleAction);
    navigator.mediaSession.setActionHandler('nexttrack', handleAction);
    navigator.mediaSession.setActionHandler('previoustrack', handleAction);

    // Attempt to play silent audio on user gesture
    silentAudioEl.play().catch(() => {
      // Audio play blocked until user gesture; will start on first user interaction
    });

    isMediaSessionInitialized = true;
    return true;
  } catch (err) {
    console.debug('MediaSession setup failed:', err);
    return false;
  }
}

// Activate silent audio playback on user gesture if it was paused
export function enableLockScreenAudio(): void {
  if (silentAudioEl && silentAudioEl.paused) {
    silentAudioEl.play().catch(() => {});
  }
}

// 5. Hardware Key Combo & 1.5s Hold Detector
export function attachHardwareTriggerListener(options: HardwareTriggerOptions): () => void {
  const holdDuration = options.holdDurationMs ?? 1500;
  let isVolumeUpHeld = false;
  let isPowerHeld = false;
  let holdStartTime = 0;
  let holdInterval: any = null;
  let hasTriggeredForCurrentHold = false;

  const isInputTarget = (target: any): boolean => {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  };

  const isVolumeUpKey = (e: KeyboardEvent): boolean => {
    return (
      e.key === 'AudioVolumeUp' ||
      e.key === 'VolumeUp' ||
      e.code === 'AudioVolumeUp' ||
      e.keyCode === 24 ||
      // Simulation on desktop: ArrowUp key with Alt or Shift or inside simulator
      (e.altKey && e.code === 'ArrowUp')
    );
  };

  const isPowerKey = (e: KeyboardEvent): boolean => {
    return (
      e.key === 'Power' ||
      e.key === 'Sleep' ||
      e.code === 'Power' ||
      e.code === 'Sleep' ||
      e.keyCode === 26 ||
      // Simulation on desktop: KeyP with Alt or Shift
      (e.altKey && (e.key === 'p' || e.code === 'KeyP')) ||
      (isVolumeUpHeld && (e.key === 'p' || e.code === 'KeyP'))
    );
  };

  const checkTriggerCondition = (): boolean => {
    // Android hardware: Volume Up + Power pressed together, OR Volume Up held continuously for 1.5s
    return (isVolumeUpHeld && isPowerHeld) || isVolumeUpHeld;
  };

  const startHoldTimer = () => {
    if (holdInterval || hasTriggeredForCurrentHold) return;

    holdStartTime = Date.now();
    options.onProgress?.(0.05, true);

    // Subtle initial haptic pulse acknowledging keydown
    triggerHaptic([30]);

    holdInterval = setInterval(() => {
      const elapsed = Date.now() - holdStartTime;
      const progress = Math.min(1.0, elapsed / holdDuration);
      options.onProgress?.(progress, true);

      if (progress >= 1.0) {
        clearInterval(holdInterval);
        holdInterval = null;
        hasTriggeredForCurrentHold = true;
        options.onProgress?.(1.0, false);

        // Success vibration + chime + voice overlay activation
        triggerHaptic([100, 60, 180]);
        playWakeChime();
        requestScreenWakeLock();
        enableLockScreenAudio();
        options.onTrigger();
      }
    }, 40);
  };

  const cancelHoldTimer = () => {
    if (holdInterval) {
      clearInterval(holdInterval);
      holdInterval = null;
    }
    holdStartTime = 0;
    options.onProgress?.(0, false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isInputTarget(e.target)) return;

    let keyRecognized = false;

    if (isVolumeUpKey(e)) {
      if (!isVolumeUpHeld) {
        isVolumeUpHeld = true;
        keyRecognized = true;
      }
    }

    if (isPowerKey(e)) {
      if (!isPowerHeld) {
        isPowerHeld = true;
        keyRecognized = true;
      }
    }

    if (keyRecognized && checkTriggerCondition()) {
      e.preventDefault();
      startHoldTimer();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    let keyReleased = false;

    if (isVolumeUpKey(e)) {
      isVolumeUpHeld = false;
      keyReleased = true;
    }

    if (isPowerKey(e)) {
      isPowerHeld = false;
      keyReleased = true;
    }

    if (keyReleased) {
      hasTriggeredForCurrentHold = false;
      cancelHoldTimer();
    }
  };

  const onWindowBlur = () => {
    // If window loses focus, reset state
    isVolumeUpHeld = false;
    isPowerHeld = false;
    hasTriggeredForCurrentHold = false;
    cancelHoldTimer();
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp, { passive: false });
  window.addEventListener('blur', onWindowBlur);

  return () => {
    cancelHoldTimer();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onWindowBlur);
  };
}

// 6. Permissions & Overlay Setup Helper
export interface AndroidOverlayPermissions {
  microphone: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'default';
  isPwa: boolean;
  isMediaSessionSupported: boolean;
  isWakeLockSupported: boolean;
}

export async function checkAndroidPermissions(): Promise<AndroidOverlayPermissions> {
  let micState: 'granted' | 'denied' | 'prompt' = 'prompt';
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const res = await navigator.permissions.query({ name: 'microphone' as any });
      micState = res.state as any;
    }
  } catch {}

  const isPwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  const notifState = typeof Notification !== 'undefined' ? Notification.permission : 'default';

  return {
    microphone: micState,
    notifications: notifState,
    isPwa,
    isMediaSessionSupported: 'mediaSession' in navigator,
    isWakeLockSupported: 'wakeLock' in navigator,
  };
}

export async function requestAllOverlayPermissions(): Promise<{
  micGranted: boolean;
  notifGranted: boolean;
}> {
  let micGranted = false;
  let notifGranted = false;

  // 1. Microphone
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    micGranted = true;
  } catch (e) {
    console.debug('Mic permission error:', e);
  }

  // 2. Notification
  try {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      notifGranted = res === 'granted';
    }
  } catch (e) {
    console.debug('Notification permission error:', e);
  }

  // 3. Audio & WakeLock
  enableLockScreenAudio();
  requestScreenWakeLock();

  return { micGranted, notifGranted };
}
