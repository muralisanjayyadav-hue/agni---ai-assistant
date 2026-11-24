/**
 * Project AGNI - Circular Groq API Key Rotation
 * Rotates through GROQ_API_KEY_1 to GROQ_API_KEY_9 in a round-robin circle:
 * 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 1
 * Supports single key mode (GROQ_API_KEY).
 * 100% Crash-Proof: NEVER throws at top-level.
 */

import Groq from 'groq-sdk';

export let currentIndex = 0;

/**
 * Retrieves all valid Groq API keys from process.env or browser circle slots.
 * NEVER throws at top level.
 */
export function getGroqKeys(): string[] {
  try {
    const keys: string[] = [];
    if (typeof process !== 'undefined' && process.env) {
      // Check 1..9
      for (let i = 1; i <= 9; i++) {
        const k = process.env[`GROQ_API_KEY_${i}`];
        if (k && k.trim().startsWith('gsk_')) {
          keys.push(k.trim().replace(/"/g, '').trim());
        }
      }
      // Check single key - ONLY GROQ_API_KEY
      const single = process.env.GROQ_API_KEY;
      if (single && single.trim().startsWith('gsk_')) {
        const clean = single.trim().replace(/"/g, '').trim();
        if (!keys.includes(clean)) keys.push(clean);
      }
    }
    // Browser fallback
    if (keys.length === 0 && typeof window !== 'undefined') {
      for (let i = 1; i <= 9; i++) {
        keys.push(`gsk_circle_key_${i}_slot`);
      }
    }
    console.log(`[AGNI Groq] Loaded ${keys.length} keys - ${keys.length === 1 ? 'Single mode' : 'Circle mode'}`);
    return keys;
  } catch (e) {
    console.error("[AGNI Groq] getGroqKeys crashed:", e);
    return []; // NEVER throw! Return empty array!
  }
}

/**
 * Returns KEYS[currentIndex], then advances currentIndex = (currentIndex + 1) % keys.length
 * Cycle: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 1
 * If 1 key, returns same key always without crashing.
 */
export function getNextKeyInCircle(): string {
  try {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error("NO_KEYS");
    if (keys.length === 1) return keys[0];
    const key = keys[currentIndex % keys.length];
    currentIndex = (currentIndex + 1) % keys.length;
    return key;
  } catch (e) {
    console.error("[AGNI Groq] getNextKeyInCircle error:", e);
    throw e;
  }
}

/**
 * Audit all 9 Groq keys in environment, checking for presence and valid 'gsk_' format.
 */
export function auditGroqKeys(): {
  totalConfigured: number;
  keys: Array<{ slot: number; exists: boolean; validFormat: boolean; prefix: string }>;
} {
  try {
    const keys = getGroqKeys();
    const results: Array<{ slot: number; exists: boolean; validFormat: boolean; prefix: string }> = [];
    for (let i = 1; i <= 9; i++) {
      const k = keys[i - 1];
      results.push({
        slot: i,
        exists: Boolean(k),
        validFormat: Boolean(k && k.startsWith('gsk_')),
        prefix: k ? `${k.slice(0, 7)}...` : (keys.length === 1 ? 'single_mode' : 'not_set'),
      });
    }
    return { totalConfigured: keys.length, keys: results };
  } catch (e) {
    console.error("[AGNI Groq] auditGroqKeys crashed:", e);
    return { totalConfigured: 0, keys: [] };
  }
}

/**
 * Manually advance index (e.g. when 429 is encountered) and log switch
 */
export function skipToNextKey(fromSlot?: number): string {
  try {
    const keys = getGroqKeys();
    if (keys.length <= 1) {
      console.warn(`[AGNI BUG FINDER] Key 1 hit limit (single key mode, cannot rotate)`);
      return getNextKeyInCircle();
    }
    const nextSlot = (currentIndex % Math.max(keys.length, 1)) + 1;
    console.warn(`[AGNI BUG FINDER] Key ${fromSlot || 'current'} hit limit, switched to Key ${nextSlot} (429 auto-switch)`);
    return getNextKeyInCircle();
  } catch {
    return '';
  }
}

/**
 * Check if at least one Groq API key is present
 */
export function hasAnyGroqKey(): boolean {
  try {
    return getGroqKeys().length > 0;
  } catch {
    return false;
  }
}

/**
 * Returns a new Groq client using the next circular key
 */
export function getGroqClient(keyOverride?: string): Groq | null {
  try {
    const apiKey = keyOverride || getNextKeyInCircle();
    if (!apiKey) return null;
    return new Groq({ apiKey });
  } catch {
    return null;
  }
}

/**
 * Executes an operation with Groq; if HTTP 429 or Rate Limit error occurs,
 * automatically advances to next key in circle and retries.
 */
export async function executeWithGroqRotation<T>(
  operation: (apiKey: string, groq: Groq) => Promise<T>,
  maxAttempts?: number
): Promise<T> {
  const keys = getGroqKeys();
  const attempts = maxAttempts ?? Math.max(keys.length, 1);
  let lastError: any = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const currentSlot = (currentIndex % Math.max(keys.length, 1)) + 1;
    const apiKey = getNextKeyInCircle();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY missing - configure GROQ_API_KEY in Vercel environment variables');
    }
    const groq = new Groq({ apiKey });

    try {
      return await operation(apiKey, groq);
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || (String(err?.message || '').includes('429') ? 429 : 0);
      const isRateLimit = status === 429 ||
        String(err?.message || '').toLowerCase().includes('rate limit') ||
        String(err?.message || '').toLowerCase().includes('quota') ||
        String(err?.message || '').toLowerCase().includes('too many requests');

      const nextSlot = (currentIndex % Math.max(keys.length, 1)) + 1;
      if (isRateLimit) {
        console.warn(`[AGNI BUG FINDER] Key ${currentSlot} hit limit, switched to Key ${nextSlot}`);
      } else {
        console.warn(`[AGNI Groq Rotation] Key attempt ${attempt + 1}/${attempts} notice: ${err?.message || err}. Advancing circle.`);
      }

      if (!isRateLimit && attempt >= 2) {
        throw err;
      }
    }
  }

  throw lastError;
}
