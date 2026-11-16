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

interface StoredAccount {
  email: string;
  password: string;
  fullName: string;
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
    accounts[account.email.toLowerCase().trim()] = account;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

/**
 * Format Firebase Auth errors into user-friendly messages
 */
export function formatAuthError(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/email-already-in-use') {
    return 'Account already exists, please Sign In';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Wrong password, try again';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found, please Create Account';
  }
  if (code === 'auth/weak-password') {
    return 'Password too weak';
  }
  if (code === 'auth/invalid-email') {
    return 'Invalid email format';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts, try later';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error, check internet';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'Email already used with Email login, please Sign In with Email';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return ''; // User intentionally closed popup, suppress error
  }
  if (code === 'auth/popup-blocked') {
    return 'Login popup blocked by your browser. Please allow popups or use redirect.';
  }

  // Generic fallback without technical error codes
  if (message && !message.includes('Firebase') && !message.includes('API key')) {
    return message;
  }
  return 'Authentication failed. Please check your credentials and try again.';
}

/**
 * Create a new user account with Email & Password
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

  // 1. Check local accounts store first
  const localAccounts = getLocalAccounts();
  if (localAccounts[cleanEmail]) {
    const err: any = new Error('Account already exists, please Sign In');
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

      // Write to Firestore users/{uid}
      if (db && firebaseUser) {
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            email: cleanEmail,
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
      // If it's a real Auth error (email in use, weak password, invalid email), rethrow
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

  // 3. Save to local storage registry
  saveLocalAccount({
    email: cleanEmail,
    password: pass,
    fullName: cleanName,
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
            lastLoginAt: serverTimestamp(),
          });
        } catch {}
      }
    } catch (fbErr: any) {
      const code = fbErr?.code;
      // If it's a definitive wrong-password or user-not-found from Firebase
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
            const err: any = new Error('Wrong password, try again');
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
      const err: any = new Error('No account found, please Create Account');
      err.code = 'auth/user-not-found';
      throw err;
    }
    if (local.password !== pass) {
      const err: any = new Error('Wrong password, try again');
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
        // Fallback to redirect
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

    // Check or update Firestore doc users/{uid}
    if (db) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email: cleanEmail,
            fullName: displayName,
            provider: providerName,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            role,
            photoURL: user.photoURL || null,
          });
        } else {
          await updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
          });
        }
      } catch (dbErr) {
        console.debug('[Firestore] Note: social user doc sync deferred', dbErr);
      }
    }

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
