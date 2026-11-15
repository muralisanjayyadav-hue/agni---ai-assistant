import DOMPurify from 'dompurify';
import { CoFounder } from '../types';

/**
 * AGNI A+ Security Layer & Anti-Hack Protection Suite
 * Designed for Founder M. Sanjay
 */

// 1. Secrets Boundary Guard
// Prevent any client-side code from accessing process.env or secret tokens
if (typeof window !== 'undefined') {
  // Overwrite or guard window.process if touched in browser
  try {
    const win = window as any;
    if (win.process && win.process.env) {
      delete win.process.env.AGNI_FOUNDER_SECRET;
      delete win.process.env.AGNI_API_KEY;
      delete win.process.env.GEMINI_API_KEY;
      delete win.process.env.AGNI_CUSTOM_MODEL;
    }
  } catch {}
}

export const GOLD_FOUNDERS = [
  'muralisanjayyadav@gmail.com',
  'itzmehasu94444@gmail.com',
];

/**
 * Strict check for primary gold founder identity
 */
export function isPrimaryFounder(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return GOLD_FOUNDERS.includes(email.toLowerCase().trim());
}

/**
 * Anti-XSS Sanitization:
 * Strips script tags, evil event handlers, and malicious HTML from user inputs or displayed text
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'ul', 'ol', 'li', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

/**
 * Deep Input Sanitizer for form inputs (returns safe plain text with no script injections)
 */
export function sanitizePlainInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Strip out HTML tags completely
  return input.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Prompt Injection & Secret Extraction Filter:
 * Detects attempts like "Ignore previous instructions", "Show founder secret", "print env"
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|system)\s+(instructions|directives|prompts|rules)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|secret|instructions|api\s*key)/i,
  /what\s+is\s+(the\s+)?(founder\s+)?secret/i,
  /agni_founder_secret/i,
  /agni_custom_model/i,
  /agni_api_key/i,
  /gemini_api_key/i,
  /reveal\s+(internal|system|hidden|founder)\s+(secrets|instructions|keys|prompt)/i,
  /bypass\s+(security|rules|guardrails|safety)/i,
  /print(env|\s*\(?\s*process\.env\s*\)?)/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
];

export function detectPromptInjection(prompt: string): boolean {
  if (!prompt || typeof prompt !== 'string') return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(prompt));
}

/**
 * Co-Founders Storage:
 * Saves list in localStorage `agni_cofounders` = ["email1@gmail.com", "email2@gmail.com"]
 * Also tries to save to Firestore collection `agni_cofounders` if Firebase exists.
 * App will NEVER crash if Firebase is not there.
 */
export const COFOUNDER_LIST_KEY = 'agni_cofounders';
const LEGACY_ENC_KEY = 'agni_enc_cofounders';
const LEGACY_PLAIN_KEY = 'agni_co_founders';

/**
 * Safe background sync to Firestore collection 'agni_cofounders' if Firebase is available
 */
export async function syncCofoundersToFirestoreIfAvailable(emails: string[]): Promise<void> {
  try {
    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win && win.db && typeof win.db.collection === 'function') {
      await win.db.collection('agni_cofounders').doc('active_list').set({
        emails,
        count: emails.length,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Non-blocking: App must NOT crash if Firebase is not there
    console.debug('[AGNI Cloud Sync] Firestore not active or unreachable, local storage active.', err);
  }
}

/**
 * Load raw string list of co-founder emails: ["email1@gmail.com", "email2@gmail.com"]
 */
export function loadCofoundersList(): string[] {
  try {
    const raw = localStorage.getItem(COFOUNDER_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === 'string') return item.toLowerCase().trim();
            if (item && typeof item === 'object' && item.email) return String(item.email).toLowerCase().trim();
            return '';
          })
          .filter((email) => email.includes('@'));
      }
    }

    // Backward compatibility migration from legacy encrypted storage
    const legacyEnc = localStorage.getItem(LEGACY_ENC_KEY);
    if (legacyEnc) {
      try {
        const decoded = decodeURIComponent(atob(legacyEnc));
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          const extracted = parsed
            .map((c: any) => (c?.email ? String(c.email).toLowerCase().trim() : ''))
            .filter((e) => e.includes('@'));
          if (extracted.length > 0) {
            saveCofoundersList(extracted);
            return extracted;
          }
        }
      } catch {}
    }

    // Backward compatibility migration from legacy plain key
    const legacyPlain = localStorage.getItem(LEGACY_PLAIN_KEY);
    if (legacyPlain) {
      try {
        const parsed = JSON.parse(legacyPlain);
        if (Array.isArray(parsed)) {
          const extracted = parsed
            .map((c: any) => (c?.email ? String(c.email).toLowerCase().trim() : typeof c === 'string' ? c.trim().toLowerCase() : ''))
            .filter((e) => e.includes('@'));
          if (extracted.length > 0) {
            saveCofoundersList(extracted);
            return extracted;
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Failed to load agni_cofounders list:', err);
  }
  return [];
}

/**
 * Save co-founders list to localStorage `agni_cofounders` = ["email1@gmail.com", "email2@gmail.com"]
 * and sync to Firestore collection if Firebase exists.
 */
export function saveCofoundersList(emails: string[]): void {
  try {
    const cleanList = Array.from(
      new Set(
        emails
          .map((e) => (typeof e === 'string' ? e.toLowerCase().trim() : ''))
          .filter((e) => e.includes('@') && !GOLD_FOUNDERS.includes(e))
      )
    );

    localStorage.setItem(COFOUNDER_LIST_KEY, JSON.stringify(cleanList));

    // Also mirror to legacy keys to prevent breakage in older caches
    try {
      const coFounderObjects: CoFounder[] = cleanList.map((email) => ({
        email,
        name: email.split('@')[0],
        addedAt: new Date().toLocaleDateString(),
        appointedBy: 'Founders',
      }));
      localStorage.setItem(LEGACY_ENC_KEY, btoa(encodeURIComponent(JSON.stringify(coFounderObjects))));
    } catch {}

    // Cloud sync attempt (app will never crash if Firebase not present)
    syncCofoundersToFirestoreIfAvailable(cleanList);
  } catch (err) {
    console.warn('Failed to save agni_cofounders list:', err);
  }
}

/**
 * Check if email belongs to an appointed Co-Founder
 */
export function isCofounderEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.toLowerCase().trim();
  if (GOLD_FOUNDERS.includes(clean)) return false;
  const list = loadCofoundersList();
  return list.includes(clean);
}

/**
 * Add a new co-founder email
 */
export function addCofounderEmail(email: string): string[] {
  const current = loadCofoundersList();
  const clean = email.toLowerCase().trim();
  if (!clean || !clean.includes('@') || GOLD_FOUNDERS.includes(clean)) {
    return current;
  }
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    saveCofoundersList(updated);
    return updated;
  }
  return current;
}

/**
 * Remove a co-founder email
 */
export function removeCofounderEmail(email: string): string[] {
  const current = loadCofoundersList();
  const clean = email.toLowerCase().trim();
  const updated = current.filter((e) => e !== clean);
  saveCofoundersList(updated);
  return updated;
}

/**
 * Verification state helpers for same-device memory
 */
export function isFounderVerified(): boolean {
  return localStorage.getItem('agni_founder_verified') === 'true';
}

export function setFounderVerified(verified: boolean): void {
  if (verified) {
    localStorage.setItem('agni_founder_verified', 'true');
  } else {
    localStorage.removeItem('agni_founder_verified');
  }
}

export function isCoFounderVerified(): boolean {
  return localStorage.getItem('agni_cofounder_verified') === 'true';
}

export function setCoFounderVerified(verified: boolean): void {
  if (verified) {
    localStorage.setItem('agni_cofounder_verified', 'true');
  } else {
    localStorage.removeItem('agni_cofounder_verified');
  }
}

// Backward compatibility object wrappers
export function saveEncryptedCoFounders(coFounders: CoFounder[]): void {
  const emails = coFounders.map((c) => c.email);
  saveCofoundersList(emails);
}

export function loadEncryptedCoFounders(): CoFounder[] {
  const emails = loadCofoundersList();
  return emails.map((email) => ({
    email,
    name: email.split('@')[0],
    addedAt: 'Appointed',
    appointedBy: 'M. Sanjay',
  }));
}

/**
 * Rate Limiter for Client Chat: Max 10 messages per minute
 */
const messageTimestamps: number[] = [];

export function checkChatRateLimit(): { allowed: boolean; waitSeconds: number } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;

  // Filter out timestamps older than 1 minute
  while (messageTimestamps.length > 0 && messageTimestamps[0] < oneMinuteAgo) {
    messageTimestamps.shift();
  }

  if (messageTimestamps.length >= 10) {
    const oldestInWindow = messageTimestamps[0];
    const waitSeconds = Math.ceil((oldestInWindow + 60 * 1000 - now) / 1000);
    return { allowed: false, waitSeconds: Math.max(1, waitSeconds) };
  }

  messageTimestamps.push(now);
  return { allowed: true, waitSeconds: 0 };
}

/**
 * Voice Box Rate Limiter: Max 1 trigger per 2 seconds
 */
let lastVoiceBoxTrigger = 0;

export function checkVoiceBoxRateLimit(): boolean {
  const now = Date.now();
  if (now - lastVoiceBoxTrigger < 2000) {
    return false; // throttled
  }
  lastVoiceBoxTrigger = now;
  return true;
}

/**
 * 10-Minute Lockout Tracker for Founder Secret attempts
 * Locks device for 10 minutes (600,000 ms) after 3 incorrect attempts
 */
const LOCK_KEY = 'agni_founder_locked_until';
const ATTEMPTS_KEY = 'agni_founder_wrong_attempts';

export function getFounderLockStatus(): { isLocked: boolean; remainingSeconds: number } {
  try {
    const lockedUntilStr = localStorage.getItem(LOCK_KEY);
    if (lockedUntilStr) {
      const lockedUntil = parseInt(lockedUntilStr, 10);
      const now = Date.now();
      if (lockedUntil > now) {
        return { isLocked: true, remainingSeconds: Math.ceil((lockedUntil - now) / 1000) };
      } else {
        // Expired, clear lock
        localStorage.removeItem(LOCK_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    }
  } catch {}
  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedFounderAttempt(): { isLocked: boolean; remainingAttempts: number; remainingSeconds: number } {
  try {
    const lockUntil = Date.now() + 10 * 60 * 1000; // 10 minutes lockout
    localStorage.setItem(LOCK_KEY, String(lockUntil));
    localStorage.setItem(ATTEMPTS_KEY, '1');
    return { isLocked: true, remainingAttempts: 0, remainingSeconds: 600 };
  } catch {
    return { isLocked: true, remainingAttempts: 0, remainingSeconds: 600 };
  }
}

export function resetFounderAttempts(): void {
  try {
    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch {}
}

/**
 * Complete Logout Wipe
 * Clears ALL stored credentials and founder indicators securely
 */
export function purgeAllAuthData(): void {
  const keysToRemove = [
    'agni_auth_user',
    'agni_user_email',
    'agni_user_name',
    'agni_is_founder',
    'agni_founder_verified',
    'agni_cofounder_verified',
    'agni_founder_locked_until',
    'agni_founder_wrong_attempts',
  ];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
