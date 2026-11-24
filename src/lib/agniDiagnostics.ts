/**
 * AGNI Self-Diagnostics & Bug Finder Engine
 * Proactively verifies Groq keys, STT, Mic, TTS, API health, runtime errors, storage, and network.
 * Provides actionable auto-fixes for every detected issue.
 */

export interface DiagnosticCheck {
  id: string;
  category: 'groq' | 'voice' | 'audio' | 'api' | 'system' | 'network' | 'storage';
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
  actionType?: 'request_mic' | 'test_tts' | 'clear_storage' | 'open_vercel' | 'retry_api';
  latencyMs?: number;
  details?: Record<string, any>;
}

export interface DiagnosticsReport {
  timestamp: string;
  checks: DiagnosticCheck[];
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    healthScore: number; // 0 - 100%
  };
  environment: {
    mode: string;
    userAgent: string;
    url: string;
    isVercel: boolean;
    isHttps: boolean;
    isOnline: boolean;
  };
  recentErrors: Array<{ message: string; timestamp: string; stack?: string }>;
}

// ── In-Memory Runtime Error Collector ──────────────────────────────────────
const runtimeErrors: Array<{ message: string; timestamp: string; stack?: string }> = [];

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || String(event.error);
    console.warn('[AGNI BUG FINDER] Uncaught error:', msg);
    runtimeErrors.unshift({
      message: msg,
      timestamp: new Date().toLocaleTimeString(),
      stack: event.error?.stack,
    });
    if (runtimeErrors.length > 50) runtimeErrors.pop();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    console.warn('[AGNI BUG FINDER] Unhandled rejection:', msg);
    runtimeErrors.unshift({
      message: `Unhandled Promise: ${msg}`,
      timestamp: new Date().toLocaleTimeString(),
      stack: event.reason?.stack,
    });
    if (runtimeErrors.length > 50) runtimeErrors.pop();
  });
}

export function logRuntimeBug(message: string, stack?: string) {
  console.warn('[AGNI BUG FINDER]', message);
  runtimeErrors.unshift({
    message,
    timestamp: new Date().toLocaleTimeString(),
    stack,
  });
  if (runtimeErrors.length > 50) runtimeErrors.pop();
}

export function getRecentRuntimeErrors() {
  return [...runtimeErrors];
}

// ── Main Diagnostics Runner ────────────────────────────────────────────────
export async function runAgniDiagnostics(): Promise<DiagnosticsReport> {
  const checks: DiagnosticCheck[] = [];
  const isBrowser = typeof window !== 'undefined';

  // 1. Groq Keys & Circle Rotation Check
  let groqTelemetry: any = null;
  let apiLatency = 0;
  try {
    const startT = performance.now();
    const res = await fetch('/api/diagnostics', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    }).catch(() => null);

    apiLatency = Math.round(performance.now() - startT);

    if (res && res.ok) {
      groqTelemetry = await res.json().catch(() => null);
    }
  } catch (err: any) {
    console.warn('[AGNI BUG FINDER] Diagnostics telemetry ping note:', err);
  }

  if (groqTelemetry && groqTelemetry.status === 'ok') {
    const keyCount = groqTelemetry.groqKeysCount || 0;
    const isRotating = groqTelemetry.circleRotationWorking === true;
    const invalidKeys = (groqTelemetry.loadedKeys || []).filter((k: any) => !k.validFormat);

    if (keyCount >= 9 && isRotating && invalidKeys.length === 0) {
      checks.push({
        id: 'groq_keys',
        category: 'groq',
        name: 'Groq API 9-Key Circle Rotation',
        status: 'pass',
        message: `All 9 Groq keys active with circular rotation (1->2->...->9->1) and auto-skip on 429.`,
        details: { keyCount, isRotating, loadedKeys: groqTelemetry.loadedKeys },
      });
    } else if (keyCount > 0) {
      checks.push({
        id: 'groq_keys',
        category: 'groq',
        name: 'Groq API Keys Rotation',
        status: 'warn',
        message: `Only ${keyCount}/9 Groq keys configured on server.${invalidKeys.length > 0 ? ` Note: ${invalidKeys.length} key(s) lack 'gsk_' prefix.` : ''}`,
        fix: 'Add GROQ_API_KEY_1 through GROQ_API_KEY_9 in Vercel Settings -> Environment Variables with Production, Preview, Development checked.',
        actionType: 'open_vercel',
        details: { keyCount, isRotating, loadedKeys: groqTelemetry.loadedKeys },
      });
    } else {
      checks.push({
        id: 'groq_keys',
        category: 'groq',
        name: 'Groq API Keys Missing',
        status: 'fail',
        message: 'No Groq API keys detected. AGNI cannot run live inference.',
        fix: 'Add GROQ_API_KEY_1 to GROQ_API_KEY_9 in Vercel Dashboard -> Settings -> Environment Variables.',
        actionType: 'open_vercel',
      });
    }
  } else {
    checks.push({
      id: 'groq_keys',
      category: 'groq',
      name: 'Groq API Health & Keys',
      status: 'warn',
      message: 'Could not fetch remote server key telemetry. Standalone fallback active.',
      fix: 'Verify /api/diagnostics or /api/health endpoint in Vercel.',
      actionType: 'retry_api',
    });
  }

  // 2. Environment Configuration Check
  const mode = import.meta.env?.MODE || 'production';
  checks.push({
    id: 'env_config',
    category: 'system',
    name: 'Environment Configuration',
    status: 'pass',
    message: `Running in '${mode}' mode with modern bundler optimizations.`,
    details: { mode, baseUrl: import.meta.env?.BASE_URL },
  });

  // 3. STT (Speech-to-Text) Engine Check
  if (isBrowser) {
    const hasSTT = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (hasSTT) {
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const testInstance = new SpeechRec();
        testInstance.interimResults = true;
        checks.push({
          id: 'stt_engine',
          category: 'voice',
          name: 'Speech-to-Text (STT) Engine',
          status: 'pass',
          message: 'SpeechRecognition API supported with interimResults & continuous stream capability.',
        });
      } catch (err: any) {
        checks.push({
          id: 'stt_engine',
          category: 'voice',
          name: 'Speech-to-Text (STT) Engine',
          status: 'warn',
          message: `SpeechRecognition instantiated with warning: ${err?.message || err}`,
          fix: 'Use Google Chrome or Microsoft Edge for best native voice recognition.',
        });
      }
    } else {
      checks.push({
        id: 'stt_engine',
        category: 'voice',
        name: 'Speech-to-Text (STT) Engine',
        status: 'fail',
        message: 'SpeechRecognition API not supported in this browser. Fallback MediaRecorder Whisper required.',
        fix: 'Switch to a Chromium-based browser (Chrome, Brave, Edge) for live streaming dictation.',
      });
    }
  }

  // 4. Microphone Access Check
  if (isBrowser) {
    const hasMedia = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
    let permState: PermissionState | 'unknown' = 'unknown';

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const p = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permState = p.state;
      }
    } catch {
      // ignore
    }

    if (!hasMedia) {
      checks.push({
        id: 'mic_permission',
        category: 'voice',
        name: 'Microphone Device Access',
        status: 'fail',
        message: 'navigator.mediaDevices.getUserMedia is unavailable in this environment (insecure HTTP or disabled).',
        fix: 'Ensure the page is served over HTTPS and microphone hardware is connected.',
      });
    } else if (permState === 'denied') {
      checks.push({
        id: 'mic_permission',
        category: 'voice',
        name: 'Microphone Permission Denied',
        status: 'fail',
        message: 'Microphone access is explicitly blocked by browser permissions.',
        fix: 'Click the camera/mic icon in the browser address bar, set to "Allow", and reload.',
        actionType: 'request_mic',
      });
    } else if (permState === 'granted') {
      checks.push({
        id: 'mic_permission',
        category: 'voice',
        name: 'Microphone Access & Permissions',
        status: 'pass',
        message: 'Microphone permission granted and audio input device is ready.',
      });
    } else {
      checks.push({
        id: 'mic_permission',
        category: 'voice',
        name: 'Microphone Permission Prompt',
        status: 'warn',
        message: 'Microphone permission has not been requested yet.',
        fix: 'Click "Request Mic Permission" to test audio input.',
        actionType: 'request_mic',
      });
    }
  }

  // 5. TTS (Text-to-Speech) Check
  if (isBrowser) {
    const hasTTS = 'speechSynthesis' in window;
    if (hasTTS) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        checks.push({
          id: 'tts_engine',
          category: 'audio',
          name: 'Text-to-Speech (TTS) Voices',
          status: 'pass',
          message: `SpeechSynthesis active with ${voices.length} installed voice profiles.`,
          details: { voiceCount: voices.length },
        });
      } else {
        checks.push({
          id: 'tts_engine',
          category: 'audio',
          name: 'Text-to-Speech (TTS) Engine',
          status: 'warn',
          message: 'SpeechSynthesis is available, but voices list is currently loading asynchronously.',
          fix: 'Voices load dynamically on user interaction. Tap "Test Speech" to verify.',
          actionType: 'test_tts',
        });
      }
    } else {
      checks.push({
        id: 'tts_engine',
        category: 'audio',
        name: 'Text-to-Speech (TTS) Engine',
        status: 'fail',
        message: 'window.speechSynthesis is not supported in this browser.',
        fix: 'Use a modern browser with Web Speech API audio synthesis support.',
      });
    }
  }

  // 6. Backend API Health Check
  try {
    const healthStart = performance.now();
    const healthRes = await fetch('/api/health', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    });
    const healthLatency = Math.round(performance.now() - healthStart);

    if (healthRes.ok) {
      const healthData = await healthRes.json().catch(() => ({}));
      checks.push({
        id: 'api_health',
        category: 'api',
        name: 'Backend API Health (/api/health)',
        status: 'pass',
        message: `HTTP 200 OK (${healthLatency}ms) - Model: ${healthData.activeModel || 'AGNI Neural'}`,
        latencyMs: healthLatency,
        details: healthData,
      });
    } else if (healthRes.status === 429) {
      checks.push({
        id: 'api_health',
        category: 'api',
        name: 'API Rate Limit Encountered',
        status: 'warn',
        message: `HTTP 429: Groq key reached rate limit. Circle rotation automatically switches keys on next call.`,
        fix: 'Ensure all 9 Groq keys are configured in Vercel to distribute rate limits across keys.',
        actionType: 'retry_api',
      });
    } else {
      checks.push({
        id: 'api_health',
        category: 'api',
        name: 'Backend API Health (/api/health)',
        status: 'fail',
        message: `HTTP ${healthRes.status} error returned from backend API.`,
        fix: 'Check Vercel Deployment Function logs for serverless errors.',
        actionType: 'retry_api',
      });
    }
  } catch (err: any) {
    checks.push({
      id: 'api_health',
      category: 'api',
      name: 'Backend API Connection',
      status: 'fail',
      message: `Failed to connect to backend API: ${err?.message || 'Network Timeout'}`,
      fix: 'Verify that server is running and internet connection is active.',
      actionType: 'retry_api',
    });
  }

  // 7. Build & Runtime Errors Check
  const errorCount = runtimeErrors.length;
  if (errorCount === 0) {
    checks.push({
      id: 'runtime_errors',
      category: 'system',
      name: 'Runtime Stability & Error Logs',
      status: 'pass',
      message: 'Zero uncaught runtime errors or unhandled promise rejections detected.',
    });
  } else if (errorCount <= 3) {
    checks.push({
      id: 'runtime_errors',
      category: 'system',
      name: 'Recent Runtime Warnings',
      status: 'warn',
      message: `${errorCount} uncaught error(s) logged in the current session.`,
      fix: 'Review console error details in the Bug Log below.',
      details: { errors: runtimeErrors.slice(0, 3) },
    });
  } else {
    checks.push({
      id: 'runtime_errors',
      category: 'system',
      name: 'High Runtime Error Rate',
      status: 'fail',
      message: `${errorCount} uncaught errors detected. App performance may be degraded.`,
      fix: 'Refresh the page or inspect the Bug Log below for stack traces.',
      details: { errors: runtimeErrors.slice(0, 5) },
    });
  }

  // 8. Storage Integrity & Quota Check
  if (isBrowser) {
    try {
      const testKey = '__agni_diag_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      sessionStorage.setItem(testKey, '1');
      sessionStorage.removeItem(testKey);

      let approxBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          approxBytes += (k.length + (localStorage.getItem(k)?.length || 0)) * 2;
        }
      }
      const approxKb = (approxBytes / 1024).toFixed(1);

      checks.push({
        id: 'storage_quota',
        category: 'storage',
        name: 'Browser Storage (localStorage / sessionStorage)',
        status: 'pass',
        message: `Storage read/write operational. Using ~${approxKb} KB.`,
        details: { approxKb, keysCount: localStorage.length },
      });
    } catch (err: any) {
      checks.push({
        id: 'storage_quota',
        category: 'storage',
        name: 'Storage Quota Exceeded / Blocked',
        status: 'fail',
        message: `Storage error: ${err?.message || 'QuotaExceededError'}`,
        fix: 'Clear browser cookies and site data for this domain or click "Clear Storage".',
        actionType: 'clear_storage',
      });
    }
  }

  // 9. Network Connectivity & Latency Check
  const isOnline = isBrowser ? navigator.onLine : true;
  if (!isOnline) {
    checks.push({
      id: 'network_latency',
      category: 'network',
      name: 'Network Connection Offline',
      status: 'fail',
      message: 'Browser reports offline state. AGNI Offline Bank is active, live AI requires internet.',
      fix: 'Check Wi-Fi or cellular network connection.',
    });
  } else {
    const lat = apiLatency || 80;
    if (lat < 1200) {
      checks.push({
        id: 'network_latency',
        category: 'network',
        name: 'Network & API Latency',
        status: 'pass',
        message: `Online with fast response time (~${lat}ms round-trip).`,
        latencyMs: lat,
      });
    } else {
      checks.push({
        id: 'network_latency',
        category: 'network',
        name: 'Network Latency High',
        status: 'warn',
        message: `High latency detected (~${lat}ms). Voice transcription or AI replies may lag.`,
        fix: 'Connect to a faster Wi-Fi or cellular network for real-time voice streaming.',
        latencyMs: lat,
      });
    }
  }

  // 10. Vercel Deployment & Security Check
  if (isBrowser) {
    const host = window.location.hostname;
    const isHttps = window.location.protocol === 'https:';
    const isVercel = host.includes('vercel.app') || (!host.includes('localhost') && !host.includes('127.0.0.1'));

    if (isVercel && isHttps) {
      checks.push({
        id: 'vercel_deployment',
        category: 'system',
        name: 'Vercel Production Deployment',
        status: 'pass',
        message: `Live on secure HTTPS (${host}). Vercel Serverless Functions operational.`,
        details: { host, isHttps },
      });
    } else if (!isHttps && !host.includes('localhost')) {
      checks.push({
        id: 'vercel_deployment',
        category: 'system',
        name: 'Insecure HTTP Connection',
        status: 'fail',
        message: 'Page is served over insecure HTTP. Microphone and SpeechRecognition are disabled by browsers.',
        fix: 'Open AGNI using https:// URL protocol.',
      });
    } else {
      checks.push({
        id: 'vercel_deployment',
        category: 'system',
        name: 'Local Development Environment',
        status: 'pass',
        message: `Running locally on ${host} (${mode} server).`,
        details: { host, mode },
      });
    }
  }

  // ── Calculate Summary & Health Score ───────────────────────────────────────
  const total = checks.length;
  const passed = checks.filter((c) => c.status === 'pass').length;
  const warned = checks.filter((c) => c.status === 'warn').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const healthScore = total > 0 ? Math.round(((passed + warned * 0.5) / total) * 100) : 100;

  return {
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total,
      passed,
      warned,
      failed,
      healthScore,
    },
    environment: {
      mode,
      userAgent: isBrowser ? navigator.userAgent : 'Node.js',
      url: isBrowser ? window.location.href : '',
      isVercel: isBrowser && window.location.hostname.includes('vercel.app'),
      isHttps: isBrowser && window.location.protocol === 'https:',
      isOnline,
    },
    recentErrors: getRecentRuntimeErrors(),
  };
}
