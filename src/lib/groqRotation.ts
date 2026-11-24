/**
 * Project AGNI - Circular Groq API Key Rotation
 * Rotates through GROQ_API_KEY_1 to GROQ_API_KEY_9 in a round-robin circle:
 * 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 1
 * Auto-skips to next key on 429 (Rate Limit).
 */

import Groq from 'groq-sdk';

export let currentIndex = 0;

/**
 * Retrieves all valid Groq API keys from process.env (GROQ_API_KEY_1 to 9, plus GROQ_API_KEY)
 */
export function getGroqKeys(): string[] {
  if (typeof process === 'undefined' || !process.env) return [];
  const keys: string[] = [];
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
  return keys;
}

/**
 * Returns KEYS[currentIndex], then advances currentIndex = (currentIndex + 1) % keys.length
 * Cycle: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 1
 */
export function getNextKeyInCircle(): string {
  const keys = getGroqKeys();
  if (keys.length === 0) return '';
  const key = keys[currentIndex % keys.length];
  currentIndex = (currentIndex + 1) % keys.length;
  return key;
}

/**
 * Manually advance index (e.g. when 429 is encountered)
 */
export function skipToNextKey(): string {
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

      console.warn(`[AGNI Groq Rotation] Key attempt ${attempt + 1}/${attempts} notice: ${err?.message || err}. Advancing circle.`);

      if (!isRateLimit && attempt >= 2) {
        // Non-rate-limit error — do not spin through all keys unnecessarily
        throw err;
      }
    }
  }

  throw lastError;
}
