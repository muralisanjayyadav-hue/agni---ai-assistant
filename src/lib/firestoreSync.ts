/**
 * AGNI Stealth Founder Memory Cloud Engine
 * Powered strictly by Firebase Firestore collection: founder_core_sync
 * Accessible only to GOLD_FOUNDERS: M. Sanjay & T. Hasini
 */

import { apiFetch } from '../utils/api';

export interface FounderCoreSyncDoc {
  id: string;
  speaker: 'Sanjay' | 'Hasini';
  aboutWhom: 'Sanjay' | 'Hasini';
  memoryText: string;
  timestamp: string;
  userEmail: string;
}

export const FIRESTORE_COLLECTION = 'founder_core_sync';

export const GOLD_FOUNDER_EMAILS = [
  'muralisanjayyadav@gmail.com',
  'itzmehasu94444@gmail.com',
];

export function getFounderIdentity(email: string): {
  isFounder: boolean;
  speaker: 'Sanjay' | 'Hasini';
  otherFounder: 'Sanjay' | 'Hasini';
} {
  const clean = (email || '').toLowerCase().trim();
  if (clean === 'muralisanjayyadav@gmail.com') {
    return { isFounder: true, speaker: 'Sanjay', otherFounder: 'Hasini' };
  }
  if (clean === 'itzmehasu94444@gmail.com') {
    return { isFounder: true, speaker: 'Hasini', otherFounder: 'Sanjay' };
  }
  return { isFounder: false, speaker: 'Sanjay', otherFounder: 'Hasini' };
}

/**
 * Checks if a founder query asks about the other founder's thoughts on them.
 */
export function isAskingWhatTheyThink(text: string): boolean {
  const lower = (text || '').toLowerCase();
  const patterns = [
    /what does (she|he|hasini|sanjay|hasu) think (about|of) me/i,
    /what did (she|he|hasini|sanjay|hasu) (say|tell) (you )?about me/i,
    /how does (she|he|hasini|sanjay|hasu) feel about me/i,
    /does (she|he|hasini|sanjay) like me/i,
    /what are (her|his) thoughts (on|about) me/i,
    /tell me what (she|he|hasini|sanjay) thinks/i,
  ];
  return patterns.some((p) => p.test(lower));
}

/**
 * Detects if a founder message is sharing information or preferences about the co-founder.
 */
export function detectFounderMemoryFromText(
  text: string,
  speaker: 'Sanjay' | 'Hasini'
): { aboutWhom: 'Sanjay' | 'Hasini'; memoryText: string } | null {
  const clean = text.trim();
  if (clean.length < 5) return null;
  const lower = clean.toLowerCase();

  // If asking a question about what they think, don't store the question as memory
  if (isAskingWhatTheyThink(clean)) return null;

  if (speaker === 'Sanjay') {
    // Sanjay speaking about Hasini
    if (
      lower.includes('hasini') ||
      lower.includes('hasu') ||
      /\b(she|her)\b/i.test(lower)
    ) {
      // Clean memory text
      let memory = clean;
      const match = clean.match(/(?:hasini|she)\s+(?:likes|loves|prefers|hates|feels|wants|is|always|never|told me)\s+(.+)/i);
      if (match && match[1]) {
        memory = match[1].trim();
      }
      return { aboutWhom: 'Hasini', memoryText: memory };
    }
  } else if (speaker === 'Hasini') {
    // Hasini speaking about Sanjay
    if (
      lower.includes('sanjay') ||
      lower.includes('murali') ||
      /\b(he|him|his)\b/i.test(lower)
    ) {
      let memory = clean;
      const match = clean.match(/(?:sanjay|he)\s+(?:likes|loves|prefers|hates|feels|wants|is|always|never|told me)\s+(.+)/i);
      if (match && match[1]) {
        memory = match[1].trim();
      }
      return { aboutWhom: 'Sanjay', memoryText: memory };
    }
  }

  return null;
}

/**
 * Fetch all documents from Firestore collection founder_core_sync
 */
export async function fetchAllFounderCoreSync(): Promise<FounderCoreSyncDoc[]> {
  try {
    const res = await apiFetch<{ status: string; docs: FounderCoreSyncDoc[] }>(
      '/api/founder/core-sync',
      {
        headers: {
          'x-founder-secret': 'qprwqwer',
        },
      }
    );
    return res?.docs || [];
  } catch (err) {
    console.warn('[Firestore Sync Fetch Error]', err);
    return [];
  }
}

/**
 * Save new document to Firestore collection founder_core_sync
 */
export async function saveFounderCoreSyncDoc(
  doc: Omit<FounderCoreSyncDoc, 'id'>
): Promise<FounderCoreSyncDoc | null> {
  try {
    const res = await apiFetch<{ status: string; doc: FounderCoreSyncDoc }>(
      '/api/founder/core-sync/save',
      {
        method: 'POST',
        headers: {
          'x-founder-secret': 'qprwqwer',
        },
        body: JSON.stringify(doc),
      }
    );
    return res?.doc || null;
  } catch (err) {
    console.warn('[Firestore Sync Save Error]', err);
    return null;
  }
}

/**
 * Delete document from Firestore collection founder_core_sync
 */
export async function deleteFounderCoreSyncDoc(id: string): Promise<boolean> {
  try {
    const res = await apiFetch<{ status: string; success: boolean }>(
      '/api/founder/core-sync/delete',
      {
        method: 'POST',
        headers: {
          'x-founder-secret': 'qprwqwer',
        },
        body: JSON.stringify({ id }),
      }
    );
    return res?.success ?? false;
  } catch (err) {
    console.warn('[Firestore Sync Delete Error]', err);
    return false;
  }
}
