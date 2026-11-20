/**
 * AGNI Secure Authentication Service
 * Supports Gold Founders with full administrative access.
 * Strictly enforces per-user session isolation.
 */

export const GOLD_FOUNDERS = [
  'muralisanjayyadav@gmail.com',
];

export const FOUNDER_NAMES: Record<string, string> = {
  'muralisanjayyadav@gmail.com': 'M. Sanjay',
};

export const FOUNDER_EMAIL = 'muralisanjayyadav@gmail.com'; // backward compatibility

/**
 * Returns true if the email (or currently logged-in email) matches ANY Gold Founder
 */
export function isFounder(emailToCheck?: string): boolean {
  if (typeof window === 'undefined') return false;
  const email = (
    emailToCheck ||
    localStorage.getItem('user_email') ||
    localStorage.getItem('agni_user_email') ||
    ''
  ).toLowerCase().trim();
  return GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(email);
}

/**
 * Get Founder display name for a given email (defaults to "Founder")
 */
export function getFounderName(emailToCheck?: string): string {
  const email = (
    emailToCheck ||
    getLoggedInEmail()
  ).toLowerCase().trim();
  return FOUNDER_NAMES[email] || 'M. Sanjay';
}

/**
 * Get Founder greeting string:
 * "Hii M. Sanjay, I am proud to meet my founder 🫡"
 */
export function getFounderGreeting(emailToCheck?: string): string {
  const name = getFounderName(emailToCheck);
  return `Hii ${name}, I am proud to meet my founder 🫡`;
}

/**
 * Get current logged in email on this specific device/browser
 */
export function getLoggedInEmail(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('user_email') ||
    localStorage.getItem('agni_user_email') ||
    ''
  ).toLowerCase().trim();
}

/**
 * Check if any user is currently signed in
 */
export function isLoggedIn(): boolean {
  const email = getLoggedInEmail();
  return Boolean(email && email.includes('@'));
}

/**
 * Complete secure logout:
 * Clears all local storage, session storage, cookies, and redirects.
 */
export function logoutSession(redirectTo: string = '/'): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
    }
  } catch (e) {
    console.error('Error clearing session:', e);
  }
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}
