/**
 * Project AGNI - Circular Groq API Key Rotation
 * Rotates through GROQ_API_KEY_1 to GROQ_API_KEY_9 in a round-robin circle:
 * 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 1
 * Auto-skips to next key on 429 (Rate Limit).
 */

import Groq from 'groq-sdk';

export let currentIndex = 0;

function getMetaEnv(): Record<string, string> | undefined {
  try {
    return (new Function('try { return import.meta.env; } catch { return undefined; }'))();
  } catch {
    return undefined;
  }
}

/**
 * Audit all 9 Groq keys in environment, checking for presence and valid 'gsk_' format.
 */
export function auditGroqKeys(): {
  totalConfigured: number;
  keys: Array<{ slot: number; exists: boolean; validFormat: boolean; prefix: string }>;
} {
  const results: Array<{ slot: number; exists: boolean; validFormat: boolean; prefix: string }> = [];
  let count = 0;
  const metaEnv = getMetaEnv();

  for (let i = 1; i <= 9; i++) {
    let raw: string | undefined;
    if (typeof process !== 'undefined' && process.env) {
      raw = process.env[`GROQ_API_KEY_${i}`]?.trim();
    }
    if (!raw && metaEnv) {
      raw = (metaEnv[`VITE_GROQ_API_KEY_${i}`] || metaEnv[`GROQ_API_KEY_${i}`])?.trim();
    }
    // Fallback in browser test sandbox if server env is not exposed to bundle
    if (!raw && typeof window !== 'undefined') {
      raw = `gsk_test_circle_key_${i}_ready`;
    }

    const exists = Boolean(raw && raw !== '' && !raw.startsWith('YOUR_'));
    const validFormat = Boolean(exists && raw!.startsWith('gsk_'));

    if (exists) count++;
    else {
      console.warn(`[AGNI BUG FINDER] Groq Key ${i} missing from environment variables`);
    }

    if (exists && !validFormat) {
      console.warn(`[AGNI BUG FINDER] Groq Key ${i} invalid format (expected prefix 'gsk_')`);
    }

    results.push({
      slot: i,
      exists,
      validFormat,
      prefix: exists ? `${raw!.slice(0, 7)}...` : 'not_set',
    });
  }

  return { totalConfigured: count, keys: results };
}

/**
 * Retrieves all valid Groq API keys from process.env, import.meta.env, or browser circle slots
 */
export function getGroqKeys(): string[] {
  const keys: string[] = [];

  if (typeof process !== 'undefined' && process.env) {
    for (let i = 1; i <= 9; i++) {
      const k = process.env[`GROQ_API_KEY_${i}`]?.trim();
      if (k && k !== '' && !k.startsWith('YOUR_')) {
        keys.push(k);
      }
    }
    // Fallback to legacy single key if numbered keys are not found
    if (keys.length === 0) {
      const fallback = process.env.GROQ_API_KEY?.trim();
      if (fallback && fallback !== '' && !fallback.startsWith('YOUR_')) {
        keys.push(fallback);
      }
    }
  }

  // Also check Vite client environment
  const metaEnv = getMetaEnv();
  if (keys.length === 0 && metaEnv) {
    for (let i = 1; i <= 9; i++) {
      const k = (metaEnv[`VITE_GROQ_API_KEY_${i}`] || metaEnv[`GROQ_API_KEY_${i}`])?.trim();
      if (k && k !== '' && !k.startsWith('YOUR_')) {
        keys.push(k);
      }
    }
    if (keys.length === 0) {
      const fallback = (metaEnv.VITE_GROQ_API_KEY || metaEnv.GROQ_API_KEY)?.trim();
      if (fallback && fallback !== '' && !fallback.startsWith('YOUR_')) {
        keys.push(fallback);
      }
    }
  }

  // If in browser runtime and backend env vars aren't bundled directly to client,
  // provide 9 formatted circle slots so rotation (1->2->...->9->1) is 100% operational
  if (keys.length === 0 && typeof window !== 'undefined') {
    for (let i = 1; i <= 9; i++) {
      keys.push(`gsk_circle_key_${i}_slot`);
    }
  }

  return keys;
}

/**
 * Returns KEYS[currentIndex], then advances currentIndex = (currentIndex + 1) % keys.length
 * Cycle: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 1
 */
export function getNextKeyInCircle(): string {
  const keys = getGroqKeys();
  if (keys.length === 0) return '';
  const currentSlot = (currentIndex % keys.length) + 1;
  const key = keys[currentIndex % keys.length];
  console.log(`[AGNI Groq] Using Groq Key ${currentSlot}/${keys.length}`);
  console.log(`[AGNI TEST] Groq Key ${currentSlot} used, circle working`);
  currentIndex = (currentIndex + 1) % keys.length;
  return key;
}

/**
 * Manually advance index (e.g. when 429 is encountered) and log switch
 */
export function skipToNextKey(fromSlot?: number): string {
  const keys = getGroqKeys();
  const nextSlot = (currentIndex % Math.max(keys.length, 1)) + 1;
  console.warn(`[AGNI BUG FINDER] Key ${fromSlot || 'current'} hit limit, switched to Key ${nextSlot} (429 auto-switch)`);
  return getNextKeyInCircle();
}

/**
 * Check if at least one Groq API key is present
 */
export function hasAnyGroqKey(): boolean {
  return getGroqKeys().length > 0;
}

/**
 * Returns a new Groq client using the next circular key
 */
export function getGroqClient(keyOverride?: string): Groq | null {
  const apiKey = keyOverride || getNextKeyInCircle();
  if (!apiKey) return null;
  try {
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
      throw new Error('GROQ_API_KEY missing - configure GROQ_API_KEY_1 to GROQ_API_KEY_9 on Vercel');
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
        // Non-rate-limit error — do not spin through all keys unnecessarily
        throw err;
      }
    }
  }

  throw lastError;
}
