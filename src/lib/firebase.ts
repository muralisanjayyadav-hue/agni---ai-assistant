import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInAnonymously,
  updateProfile,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { AuthUser } from '../types';
import { GOLD_FOUNDERS, getFounderName } from './auth';

const PROJECT_ID =
  (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'agni-ai-assistant';

const firebaseConfig = {
  apiKey:
    (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
    'AIzaSyAgniAiAssistantOfficialApp2026Key',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.appspot.com`,
  messagingSenderId:
    (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '109876543210',
  appId:
    (import.meta as any).env?.VITE_FIREBASE_APP_ID ||
    '1:109876543210:web:abcdef1234567890',
};

// Safe Firebase App Initialization
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  if (typeof window !== 'undefined') {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('[AGNI Firebase] Warning during initialization, fallback mode active:', e);
}

export { app, auth, db };

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const facebookProvider = new FacebookAuthProvider();

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

export const instagramProvider = new FacebookAuthProvider();
instagramProvider.addScope('email');

export function isGoldFounderEmail(email: string): boolean {
  const clean = email.toLowerCase().trim();
  return GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(clean);
}

// Local accounts storage fallback for sandbox / offline / unconfigured cloud state
const LOCAL_ACCOUNTS_KEY = 'agni_registered_accounts';

export interface StoredAccount {
  email: string;
  emailLower: string;
  password?: string;
  fullName: string;
  provider: 'email' | 'google' | 'facebook' | 'microsoft' | 'instagram';
  role: 'founder' | 'student';
  createdAt: string;
  lastLoginAt: string;
  photoURL?: string | null;
}

function getLocalAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAccount(account: StoredAccount) {
  try {
    const accounts = getLocalAccounts();
    accounts[account.emailLower] = account;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

/**
 * Query Firestore and Local Registry to enforce ONE ACCOUNT PER EMAIL
 */
export async function findUserByEmail(email: string): Promise<{
  uid?: string;
  email: string;
  emailLower: string;
  provider: string;
  fullName?: string;
  role?: string;
} | null> {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Check Firestore users collection if initialized
  if (db) {
    try {
      const usersRef = collection(db, 'users');
      // Query by emailLower first
      const qLower = query(usersRef, where('emailLower', '==', cleanEmail), limit(1));
      const snapLower = await getDocs(qLower);
      if (!snapLower.empty) {
        const docSnap = snapLower.docs[0];
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          email: data.email || cleanEmail,
          emailLower: cleanEmail,
          provider: data.provider || 'email',
          fullName: data.fullName,
          role: data.role,
        };
      }

      // Query by legacy email field if emailLower was omitted in earlier records
      const qEmail = query(usersRef, where('email', '==', cleanEmail), limit(1));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const docSnap = snapEmail.docs[0];
        const data = docSnap.data();
        return {
          uid: docSnap.id,
          email: data.email || cleanEmail,
          emailLower: cleanEmail,
          provider: data.provider || 'email',
          fullName: data.fullName,
          role: data.role,
        };
      }
    } catch (err) {
      console.debug('[Firestore] findUserByEmail query notice:', err);
    }
  }

  // 2. Check local accounts registry fallback
  const localAccounts = getLocalAccounts();
  const local = localAccounts[cleanEmail];
  if (local) {
    return {
      email: local.email,
      emailLower: cleanEmail,
      provider: local.provider || 'email',
      fullName: local.fullName,
      role: local.role,
    };
  }

  return null;
}

/**
 * Format Firebase Auth errors into user-friendly messages
 * Completely eliminates generic "Authentication failed. Please check your credentials"
 */
export function formatAuthError(error: any): string {
  if (!error) return '';
  if (error?.message === 'CANCELLED') return '';

  const code = error?.code || '';
  const message = typeof error === 'string' ? error : error?.message || '';

  // Specific custom validation errors (e.g. from One Account Per Email checks)
  if (
    message.includes('One account per email') ||
    message.includes('already registered with') ||
    message.includes('Account already exists')
  ) {
    return message;
  }

  // Exact mappings
  if (code === 'auth/email-already-in-use') {
    return 'Account already exists with this email. Please Sign In using your original login method';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Wrong email or password';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found. Please Create Account';
  }
  if (code === 'auth/weak-password') {
    return 'Password too weak, use 6+ characters';
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email format';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return ''; // No error, stay on page
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return message.includes('Email/Password')
      ? message
      : 'Account already exists with this email. Please Sign In using your original login method';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts, try later';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error, check internet';
  }
  if (code === 'auth/popup-blocked') {
    return 'Login popup blocked by your browser. Please allow popups or use redirect.';
  }

  // If a descriptive message was provided, clean out technical Firebase prefixes
  if (message) {
    const cleaned = message
      .replace(/^Firebase:\s*/i, '')
      .replace(/\s*\(auth\/[^)]+\)\.?/i, '')
      .trim();
    if (cleaned && !cleaned.toLowerCase().includes('api key')) {
      return cleaned;
    }
  }

  return 'Wrong email or password';
}

/**
 * Create a new user account with Email & Password
 * Strictly enforces ONE ACCOUNT PER EMAIL
 */
export async function createAccountWithEmail(
  email: string,
  pass: string,
  fullName: string
): Promise<AuthUser> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = fullName.trim() || cleanEmail.split('@')[0];
  const isFounder = isGoldFounderEmail(cleanEmail);
  const role = isFounder ? 'founder' : 'student';

  // 1. Check if email already exists with any provider (Firestore or Local)
  const existingUser = await findUserByEmail(cleanEmail);
  if (existingUser) {
    const p = (existingUser.provider || 'email').toLowerCase();
    if (p === 'google') {
      const err: any = new Error(
        "This email already registered with Google. Please use 'Continue with Google' to Sign In. One account per email allowed."
      );
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    if (p === 'facebook') {
      const err: any = new Error(
        "Already registered with Facebook, use Facebook login. One account per email allowed."
      );
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    if (p === 'microsoft') {
      const err: any = new Error(
        "Already registered with Microsoft, use Microsoft login. One account per email allowed."
      );
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    if (p === 'instagram') {
      const err: any = new Error(
        "Already registered with Instagram, use Instagram login. One account per email allowed."
      );
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    const err: any = new Error(
      'Account already exists with this email. Please Sign In using your original login method'
    );
    err.code = 'auth/email-already-in-use';
    throw err;
  }

  let firebaseUser: User | null = null;

  // 2. Try Firebase Cloud Auth
  if (auth) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      firebaseUser = cred.user;
      try {
        await updateProfile(firebaseUser, { displayName: cleanName });
      } catch {}

      // Write to Firestore users/{uid} with emailLower and provider
      if (db && firebaseUser) {
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            email: cleanEmail,
            emailLower: cleanEmail,
            fullName: cleanName,
            provider: 'email',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            role,
            photoURL: null,
          });
        } catch (dbErr) {
          console.debug('[Firestore] Note: user doc save deferred', dbErr);
        }
      }
    } catch (fbErr: any) {
      const code = fbErr?.code;
      // If it's a real Auth error, rethrow
      if (
        code === 'auth/email-already-in-use' ||
        code === 'auth/weak-password' ||
        code === 'auth/invalid-email' ||
        code === 'auth/network-request-failed'
      ) {
        throw fbErr;
      }
      console.warn('[Firebase Auth] Falling back to local storage auth:', fbErr);
    }
  }

  // 3. Save to local storage registry fallback
  saveLocalAccount({
    email: cleanEmail,
    emailLower: cleanEmail,
    password: pass,
    fullName: cleanName,
    provider: 'email',
    role,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    photoURL: null,
  });

  const resolvedName = isFounder ? getFounderName(cleanEmail) : cleanName;

  const authUser: AuthUser = {
    id: firebaseUser ? firebaseUser.uid : `user-${Date.now()}`,
    name: resolvedName,
    email: cleanEmail,
    provider: 'email',
    isFounder,
    isCoFounder: false,
  };

  return authUser;
}

/**
 * Sign in existing user with Email & Password
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<AuthUser> {
  const cleanEmail = email.toLowerCase().trim();
  const isFounder = isGoldFounderEmail(cleanEmail);

  // Founder Master Secret / Passcode Check (qprwqwer or founder secret)
  if (isFounder) {
    if (
      pass === 'qprwqwertyuio' ||
      pass === 'qprwqwer' ||
      pass === 'AGNI_FOUNDER_SANJAY_2026' ||
      pass === 'AGNI_FOUNDER_HASINI_2026'
    ) {
      const founderName = getFounderName(cleanEmail);
      return {
        id: `founder-${Date.now()}`,
        name: founderName,
        email: cleanEmail,
        provider: 'email',
        isFounder: true,
        isCoFounder: false,
      };
    }
  }

  // Enforce ONE ACCOUNT PER EMAIL check: If user registered with a social provider
  const existingUser = await findUserByEmail(cleanEmail);
  if (existingUser && existingUser.provider && existingUser.provider !== 'email') {
    const p = existingUser.provider.toLowerCase();
    if (p === 'google') {
      const err: any = new Error(
        "This email already registered with Google. Please use 'Continue with Google' to Sign In. One account per email allowed."
      );
      err.code = 'auth/account-exists-with-different-credential';
      throw err;
    }
    if (p === 'facebook') {
      const err: any = new Error(
        "Already registered with Facebook, use Facebook login. One account per email allowed."
      );
      err.code = 'auth/account-exists-with-different-credential';
      throw err;
    }
    if (p === 'microsoft') {
      const err: any = new Error(
        "Already registered with Microsoft, use Microsoft login. One account per email allowed."
      );
      err.code = 'auth/account-exists-with-different-credential';
      throw err;
    }
    if (p === 'instagram') {
      const err: any = new Error(
        "Already registered with Instagram, use Instagram login. One account per email allowed."
      );
      err.code = 'auth/account-exists-with-different-credential';
      throw err;
    }
  }

  let firebaseUser: User | null = null;
  let fbSuccess = false;

  // 1. Try Firebase Cloud Auth
  if (auth) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      firebaseUser = cred.user;
      fbSuccess = true;

      // Update Firestore lastLoginAt
      if (db && firebaseUser) {
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            emailLower: cleanEmail,
            lastLoginAt: serverTimestamp(),
          });
        } catch {}
      }
    } catch (fbErr: any) {
      const code = fbErr?.code;
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/too-many-requests'
      ) {
        // Also check local accounts fallback before throwing
        const localAccounts = getLocalAccounts();
        const local = localAccounts[cleanEmail];
        if (local) {
          if (local.password !== pass) {
            const err: any = new Error('Wrong email or password');
            err.code = 'auth/wrong-password';
            throw err;
          }
        } else {
          throw fbErr;
        }
      }
    }
  }

  // 2. Check local accounts registry if not authenticated via Firebase Cloud
  if (!fbSuccess) {
    const localAccounts = getLocalAccounts();
    const local = localAccounts[cleanEmail];
    if (!local) {
      const err: any = new Error('No account found. Please Create Account');
      err.code = 'auth/user-not-found';
      throw err;
    }
    if (local.password !== pass) {
      const err: any = new Error('Wrong email or password');
      err.code = 'auth/wrong-password';
      throw err;
    }
    local.lastLoginAt = new Date().toISOString();
    saveLocalAccount(local);
  }

  const resolvedName = isFounder
    ? getFounderName(cleanEmail)
    : firebaseUser?.displayName ||
      getLocalAccounts()[cleanEmail]?.fullName ||
      cleanEmail.split('@')[0];

  const authUser: AuthUser = {
    id: firebaseUser ? firebaseUser.uid : `user-${Date.now()}`,
    name: resolvedName,
    email: cleanEmail,
    provider: 'email',
    isFounder,
    isCoFounder: false,
  };

  return authUser;
}

/**
 * Sign In with Social Providers (Google, Facebook, Microsoft, Instagram)
 * Strictly enforces ONE ACCOUNT PER EMAIL
 */
export async function loginWithSocial(
  providerName: 'google' | 'facebook' | 'microsoft' | 'instagram'
): Promise<AuthUser> {
  let providerInstance: any;
  if (providerName === 'google') providerInstance = googleProvider;
  else if (providerName === 'facebook') providerInstance = facebookProvider;
  else if (providerName === 'microsoft') providerInstance = microsoftProvider;
  else providerInstance = instagramProvider;

  if (!auth) {
    throw new Error('Authentication is currently initializing. Please try again.');
  }

  try {
    let cred: any = null;
    try {
      cred = await signInWithPopup(auth, providerInstance);
    } catch (popupErr: any) {
      if (popupErr?.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, providerInstance);
        throw new Error('Redirecting to login provider...');
      }
      throw popupErr;
    }

    const user: User = cred.user;
    const cleanEmail = (user.email || `${providerName}_user@agni.ai`).toLowerCase().trim();
    const isFounder = isGoldFounderEmail(cleanEmail);
    const role = isFounder ? 'founder' : 'student';
    const displayName = user.displayName || cleanEmail.split('@')[0];

    // Check ONE ACCOUNT PER EMAIL
    const existingUser = await findUserByEmail(cleanEmail);
    if (existingUser) {
      const existingProvider = (existingUser.provider || 'email').toLowerCase();
      if (existingProvider !== providerName) {
        if (existingProvider === 'email') {
          const err: any = new Error(
            'Account already exists with Email/Password. Please Sign In with Email. One account per email.'
          );
          err.code = 'auth/account-exists-with-different-credential';
          throw err;
        }
        const cap = existingProvider.charAt(0).toUpperCase() + existingProvider.slice(1);
        const err: any = new Error(
          `This email already registered with ${cap}. Please use that login method. One account per email allowed.`
        );
        err.code = 'auth/account-exists-with-different-credential';
        throw err;
      }
    }

    // Check or update Firestore doc users/{uid}
    if (db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email: cleanEmail,
            emailLower: cleanEmail,
            fullName: displayName,
            provider: providerName,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            role,
            photoURL: user.photoURL || null,
          });
        } else {
          await updateDoc(userDocRef, {
            emailLower: cleanEmail,
            lastLoginAt: serverTimestamp(),
          });
        }
      } catch (dbErr) {
        console.debug('[Firestore] Note: social user doc sync deferred', dbErr);
      }
    }

    // Also persist in local accounts registry fallback
    saveLocalAccount({
      email: cleanEmail,
      emailLower: cleanEmail,
      fullName: displayName,
      provider: providerName,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      photoURL: user.photoURL || null,
    });

    const resolvedName = isFounder ? getFounderName(cleanEmail) : displayName;

    const authUser: AuthUser = {
      id: user.uid,
      name: resolvedName,
      email: cleanEmail,
      avatar: user.photoURL || undefined,
      provider: providerName,
      isFounder,
      isCoFounder: false,
    };

    return authUser;
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request'
    ) {
      // User cancelled popup, do not show error
      throw new Error('CANCELLED');
    }
    throw err;
  }
}

/**
 * Sign In Anonymously as Student Guest
 */
export async function loginAsGuest(): Promise<AuthUser> {
  let uid = `guest-${Date.now()}`;

  if (auth) {
    try {
      const cred = await signInAnonymously(auth);
      if (cred?.user?.uid) {
        uid = cred.user.uid;
      }
    } catch (err) {
      console.debug('[Firebase] Guest fallback active:', err);
    }
  }

  const guestUser: AuthUser = {
    id: uid,
    name: 'Student Guest',
    email: 'guest@agni.ai',
    provider: 'email',
    isFounder: false,
    isCoFounder: false,
  };

  return guestUser;
}
