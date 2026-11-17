import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Flame,
  AlertCircle,
  ShieldCheck,
  Crown,
  Shield,
  Loader2,
} from 'lucide-react';
import { AuthUser } from '../types';
import { speakText } from '../utils/speech';
import { isCofounderEmail } from '../utils/security';
import { GOLD_FOUNDERS, getFounderGreeting } from '../lib/auth';
import {
  createAccountWithEmail,
  loginWithEmail,
  loginWithSocial,
  loginAsGuest,
  formatAuthError,
  isGoldFounderEmail,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenTerms?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
  onLogout,
  onOpenTerms,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Field validation touched states
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);

  // Status and error states
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Remembered email
  useEffect(() => {
    try {
      const remembered =
        localStorage.getItem('agni_remembered_email') ||
        localStorage.getItem('user_email') ||
        '';
      if (remembered && remembered.includes('@')) {
        setEmail(remembered);
      }
    } catch {}
  }, []);

  if (!isOpen) return null;

  // Finalize session and navigate
  const completeAuth = (authUser: AuthUser) => {
    try {
      localStorage.setItem('user_email', authUser.email);
      localStorage.setItem('agni_user_email', authUser.email);
      localStorage.setItem('agni_remembered_email', authUser.email);
      localStorage.setItem('user_name', authUser.name);
      localStorage.setItem('agni_user_name', authUser.name);
      localStorage.setItem('agni_is_founder', String(authUser.isFounder || false));
      localStorage.setItem('agni_auth_user', JSON.stringify(authUser));
    } catch {}

    if (authUser.isFounder) {
      const greeting = getFounderGreeting(authUser.email);
      speakText(greeting, { rate: 0.95, pitch: 1.05, profile: 'natural-warm' });
    }

    // Clear form
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError(null);

    onLoginSuccess(authUser);
    onClose();
  };

  // If already logged in, show user profile details
  if (currentUser) {
    const cleanUserEmail = (currentUser.email || '').toLowerCase().trim();
    const isFounder =
      currentUser.isFounder || isGoldFounderEmail(cleanUserEmail);
    const isCoFounder =
      !isFounder && (currentUser.isCoFounder || isCofounderEmail(currentUser.email));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-center text-neutral-100 animate-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {isFounder ? (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-2xl font-black text-amber-950 shadow-lg shadow-amber-500/30 border-2 border-amber-300">
              👑
            </div>
          ) : isCoFounder ? (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-600 text-xl font-bold text-white uppercase shadow-md border-2 border-slate-300">
              🥈
            </div>
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-xl font-bold text-white uppercase shadow-md">
              {currentUser.name.charAt(0)}
            </div>
          )}

          <h2 className="mt-3 font-display text-lg font-bold text-white flex items-center justify-center gap-1.5">
            {currentUser.name}
            {isFounder && <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />}
            {isCoFounder && <Shield className="h-4 w-4 text-slate-400 fill-slate-300" />}
          </h2>
          <p className="text-xs text-neutral-400">{currentUser.email}</p>

          {isFounder ? (
            <div className="mt-3 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/80 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 px-3.5 py-1 text-xs font-black text-amber-950 shadow-sm">
                <span>👑 GOLD FOUNDER BADGE</span>
              </div>
              <p className="text-xs font-semibold text-amber-400 italic">
                &quot;Hii {currentUser.name}, I am proud to meet my founder 🫡&quot;
              </p>
            </div>
          ) : isCoFounder ? (
            <div className="mt-3 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-800 px-3.5 py-1 text-xs font-black text-slate-100 shadow-sm">
                <span>🥈 SILVER CO-FOUNDER BADGE</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-950/80 border border-orange-500/30 px-3 py-1 text-xs font-semibold text-orange-300">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
              <span>Logged In • {currentUser.provider}</span>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => {
                onLogout?.();
                onClose();
              }}
              className="w-full rounded-xl bg-red-950/40 border border-red-500/30 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition cursor-pointer"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validation checks
  const isEmailValid = Boolean(email.trim() && EMAIL_REGEX.test(email.trim()));
  const isPasswordValid = password.length >= 6;
  const isConfirmValid = !isSignUp || password === confirmPassword;

  const emailError =
    touchedEmail && !isEmailValid ? 'Enter valid email' : null;
  const passwordError =
    touchedPassword && !isPasswordValid
      ? 'Password must be at least 6 characters'
      : null;
  const confirmError =
    isSignUp && touchedConfirm && !isConfirmValid
      ? "Passwords don't match"
      : null;

  // Handle Email Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouchedEmail(true);
    setTouchedPassword(true);
    if (isSignUp) setTouchedConfirm(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setError('Enter valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoadingAction('email');

    try {
      if (isSignUp) {
        const newAuthUser = await createAccountWithEmail(
          cleanEmail,
          password,
          fullName.trim()
        );
        completeAuth(newAuthUser);
      } else {
        const loggedUser = await loginWithEmail(cleanEmail, password);
        completeAuth(loggedUser);
      }
    } catch (err: any) {
      console.error('Modal email auth error:', err);
      const friendlyMsg = formatAuthError(err);

      if (
        err?.code === 'auth/email-already-in-use' ||
        friendlyMsg.includes('Account already exists') ||
        friendlyMsg.includes('already registered with')
      ) {
        setError(friendlyMsg);
        setTimeout(() => {
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        }, 1400);
      } else if (
        err?.code === 'auth/user-not-found' ||
        friendlyMsg.includes('No account found')
      ) {
        setError(friendlyMsg);
        setTimeout(() => {
          setIsSignUp(true);
          setPassword('');
          setConfirmPassword('');
        }, 1400);
      } else {
        setError(friendlyMsg);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Social Login
  const handleSocial = async (
    provider: 'google' | 'facebook' | 'microsoft' | 'instagram'
  ) => {
    setError(null);
    setLoadingAction(provider);

    try {
      const socialUser = await loginWithSocial(provider);
      completeAuth(socialUser);
    } catch (err: any) {
      if (err?.message === 'CANCELLED') return;
      console.error(`Modal ${provider} login error:`, err);
      const friendly = formatAuthError(err);
      setError(friendly || `Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Student / Guest Login
  const handleGuest = async () => {
    setError(null);
    setLoadingAction('guest');

    try {
      const guestUser = await loginAsGuest();
      completeAuth(guestUser);
    } catch (err: any) {
      console.error('Modal guest login error:', err);
      const fallbackGuest: AuthUser = {
        id: `guest-${Date.now()}`,
        name: 'Student Guest',
        email: 'guest@agni.ai',
        provider: 'email',
        isFounder: false,
        isCoFounder: false,
      };
      completeAuth(fallbackGuest);
    } finally {
      setLoadingAction(null);
    }
  };

  const isLoadingAny = loadingAction !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-7 shadow-2xl text-neutral-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-black border border-orange-500/30 text-2xl shadow-md shadow-orange-500/10">
            🔥
          </div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            {isSignUp ? 'Create AGNI Account' : 'Sign In to AGNI'}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Founded by <strong>M. Sanjay &amp; T. Hasini</strong> &bull; Made in India
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-neutral-950 p-1 mb-4 border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            disabled={isLoadingAny}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            disabled={isLoadingAny}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isSignUp
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-3.5 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  disabled={isLoadingAny}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onBlur={() => setTouchedEmail(true)}
                placeholder="name@email.com"
                disabled={isLoadingAny}
                className={`w-full rounded-xl border bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none transition ${
                  emailError
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1 text-[10px] font-medium text-red-400">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-neutral-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                onBlur={() => setTouchedPassword(true)}
                placeholder="Min 6 characters"
                disabled={isLoadingAny}
                className={`w-full rounded-xl border bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none transition ${
                  passwordError
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>
            {passwordError && (
              <p className="mt-1 text-[10px] font-medium text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          {isSignUp && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-neutral-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouchedConfirm(true)}
                  placeholder="Re-enter password"
                  disabled={isLoadingAny}
                  className={`w-full rounded-xl border bg-neutral-950 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none transition ${
                    confirmError
                      ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                  }`}
                />
              </div>
              {confirmError && (
                <p className="mt-1 text-[10px] font-medium text-red-400">
                  {confirmError}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoadingAny}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-1"
          >
            {loadingAction === 'email' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In with Email'}</span>
            )}
          </button>

          {/* Friendly red error text below button */}
          {error && (
            <p className="text-center text-[11px] font-semibold text-red-400 mt-2 px-1">
              {error}
            </p>
          )}
        </form>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-neutral-800" />
          <span className="absolute bg-neutral-900 px-2.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            or continue with
          </span>
        </div>

        {/* 4 Social Login Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Google */}
          <button
            type="button"
            onClick={() => handleSocial('google')}
            disabled={isLoadingAny}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-xs font-semibold text-white hover:bg-neutral-850 hover:border-neutral-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'google' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            )}
            <span>Google</span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleSocial('facebook')}
            disabled={isLoadingAny}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-xs font-semibold text-white hover:bg-neutral-850 hover:border-neutral-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'facebook' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1877F2]" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            <span>Facebook</span>
          </button>

          {/* Microsoft */}
          <button
            type="button"
            onClick={() => handleSocial('microsoft')}
            disabled={isLoadingAny}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-xs font-semibold text-white hover:bg-neutral-850 hover:border-neutral-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'microsoft' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00A4EF]" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
            )}
            <span>Microsoft</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={() => handleSocial('instagram')}
            disabled={isLoadingAny}
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-xs font-semibold text-white hover:bg-neutral-850 hover:border-neutral-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'instagram' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d6249f]" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <defs>
                  <radialGradient id="ig-modal-grad" cx="20%" cy="100%" r="150%">
                    <stop offset="0%" stopColor="#fdf497"/>
                    <stop offset="5%" stopColor="#fdf497"/>
                    <stop offset="45%" stopColor="#fd5949"/>
                    <stop offset="60%" stopColor="#d6249f"/>
                    <stop offset="90%" stopColor="#285AEB"/>
                  </radialGradient>
                </defs>
                <path fill="url(#ig-modal-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            )}
            <span>Instagram</span>
          </button>
        </div>

        {/* Guest Action Button */}
        <div className="mt-3.5 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={handleGuest}
            disabled={isLoadingAny}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-700/80 bg-neutral-850 hover:bg-neutral-800 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'guest' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                <span>Entering as Student Guest...</span>
              </>
            ) : (
              <span>Continue as Student / Guest</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
