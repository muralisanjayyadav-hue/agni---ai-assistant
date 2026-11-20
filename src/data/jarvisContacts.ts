/**
 * AGNI Jarvis Mode - Contacts Registry
 * Used for voice commands: "send WhatsApp to Mummy", "send WhatsApp to 9876543210"
 * 100% Free & Local to device
 */

export interface JarvisContact {
  name: string;
  phone: string;
  email?: string;
}

export const DEFAULT_CONTACTS: Record<string, string> = {
  mummy: '9876543210',
  mom: '9876543210',
  mother: '9876543210',
  amma: '9876543210',
  papa: '9876543211',
  dad: '9876543211',
  father: '9876543211',
  appa: '9876543211',
  friend: '9876543212',
  bro: '9876543213',
  brother: '9876543213',
  sister: '9876543214',
  boss: '9876543215',
  teacher: '9876543216',
};

const CONTACTS_STORAGE_KEY = 'agni_jarvis_contacts';

export function getJarvisContacts(): Record<string, string> {
  if (typeof window === 'undefined') return DEFAULT_CONTACTS;
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONTACTS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CONTACTS;
}

export function saveJarvisContact(name: string, phone: string) {
  if (typeof window === 'undefined') return;
  try {
    const contacts = getJarvisContacts();
    contacts[name.toLowerCase().trim()] = phone.trim();
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch {}
}

export function formatIndianPhoneNumber(input: string): string {
  // Strip non-digits
  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return '91' + digitsOnly;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly;
  }
  return digitsOnly || input.trim();
}
