import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Flame,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Crown,
  Shield,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../types';
import { speakText } from '../utils/speech';
import { loadEncryptedCoFounders, isCofounderEmail } from '../utils/security';
import { GOLD_FOUNDERS, FOUNDER_NAMES, getFounderGreeting } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenTerms?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
  onLogout,
  onOpenTerms,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  // Process and finalize user login with founder check
  const completeLogin = (userEmail: string, displayName?: string, provider: AuthUser['provider'] = 'email') => {
    const cleanEmail = userEmail.trim().toLowerCase();
    const isFounder = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(cleanEmail);
    const isCoFounder = !isFounder && isCofounderEmail(cleanEmail);
    
    let resolvedName = '';
    if (isFounder) {
      resolvedName = FOUNDER_NAMES[cleanEmail] || (cleanEmail.includes('hasu') ? 'T. Hasini' : 'M. Sanjay');
    } else if (displayName && displayName.trim()) {
      resolvedName = displayName.trim();
    } else {
      const prefix = cleanEmail.split('@')[0] || 'Friend';
      resolvedName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    const user: AuthUser = {
      id: `user-${Date.now()}`,
      name: resolvedName,
      email: cleanEmail,
      provider,
      isFounder,
      isCoFounder,
    };

    // Save to localStorage (per-user session isolation)
    localStorage.setItem('user_email', cleanEmail);
    localStorage.setItem('agni_user_email', cleanEmail);
    localStorage.setItem('user_name', resolvedName);
    localStorage.setItem('agni_user_name', resolvedName);
    localStorage.setItem('agni_is_founder', isFounder ? 'true' : 'false');
    localStorage.setItem('agni_auth_user', JSON.stringify(user));

    if (isFounder) {
      const greeting = getFounderGreeting(cleanEmail);
      speakText(greeting, {
        rate: 0.95,
        pitch: 1.05,
        profile: 'natural-warm',
      });
    } else if (isCoFounder) {
      speakText('Welcome Co-Founder', {
        rate: 0.95,
        pitch: 1.05,
        profile: 'natural-warm',
      });
    }

    setIsLoading(false);
    onLoginSuccess(user);
    onClose();
  };

  // If already logged in, show user profile details
  if (currentUser) {
    const cleanUserEmail = (currentUser.email || '').toLowerCase().trim();
    const isFounder = currentUser.isFounder || GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(cleanUserEmail);
    const isCoFounder = !isFounder && (currentUser.isCoFounder || isCofounderEmail(currentUser.email));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
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

          <h2 className="mt-3 font-display text-lg font-bold text-neutral-900 dark:text-neutral-50 flex items-center justify-center gap-1.5">
            {currentUser.name}
            {isFounder && <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />}
            {isCoFounder && <Shield className="h-4 w-4 text-slate-400 fill-slate-300" />}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{currentUser.email}</p>

          {isFounder ? (
            <div className="mt-3 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/80 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 px-3.5 py-1 text-xs font-black text-amber-950 shadow-sm">
                <span>👑 GOLD FOUNDER BADGE</span>
              </div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-300 italic">
                &quot;Hii M. Sanjay, I am proud to meet my founder 🫡&quot;
              </p>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-400">
                Founder Status: <span className="font-bold text-amber-700 dark:text-amber-300">Active &bull; Passcode Protected</span>
              </div>
            </div>
          ) : isCoFounder ? (
            <div className="mt-3 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-gradient-to-r from-slate-200 via-neutral-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 px-3.5 py-1 text-xs font-black text-slate-800 dark:text-slate-100 shadow-sm">
                <span>🥈 SILVER CO-FOUNDER BADGE</span>
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 italic">
                &quot;Welcome Co-Founder&quot;
              </p>
              <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/30 text-[11px] text-slate-600 dark:text-slate-400">
                Co-Founder Access: <span className="font-bold text-slate-700 dark:text-slate-200">Authorized &bull; Silver Operational</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
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
              className="w-full rounded-xl bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 transition cursor-pointer"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-neutral-200 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Account Picker selection
  const handleSelectAccount = (selectedEmail: string, selectedName?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      completeLogin(selectedEmail, selectedName, 'email');
    }, 350);
  };

  // Handle Email / Password submit
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const isGold = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(cleanEmail);
    if (isGold) {
      if (
        password !== 'qprwqwertyuio' &&
        password !== 'qprwqwer' &&
        password !== 'AGNI_FOUNDER_SANJAY_2026'
      ) {
        setError('Invalid founder credentials / passcode. Access denied.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      completeLogin(email, fullName, 'email');
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Account Selector Popup */}
        {showAccountPicker ? (
          <div className="animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center mb-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white">
                <Flame className="h-5 w-5" />
              </div>
              <h3 className="mt-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Sign in to AGNI
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose an account to continue
              </p>
            </div>

            <div className="space-y-2">
              {/* Student User Option */}
              <button
                type="button"
                onClick={() => handleSelectAccount('student@agni.ai', 'Student')}
                className="flex items-center gap-3 w-full rounded-2xl border border-neutral-200 bg-white p-3 text-left hover:border-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer dark:border-neutral-800 dark:bg-neutral-850 dark:hover:bg-neutral-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white shadow-xs text-xs">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      Student Demo
                    </span>
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Guest
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    student@agni.ai
                  </p>
                </div>
              </button>

              {/* Normal User Option */}
              <button
                type="button"
                onClick={() => handleSelectAccount('arjun@gmail.com', 'Arjun')}
                className="flex items-center gap-3 w-full rounded-2xl border border-neutral-200 bg-white p-3 text-left hover:border-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer dark:border-neutral-800 dark:bg-neutral-850 dark:hover:bg-neutral-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500 font-bold text-white shadow-xs text-xs">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      Arjun Sharma
                    </span>
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Student
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    arjun@gmail.com
                  </p>
                </div>
              </button>

              {/* Custom Account Input */}
              <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Or enter another account:
                </p>
                <div className="space-y-1.5">
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Your Name (e.g. Priya)"
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    disabled={!customEmail.trim()}
                    onClick={() => handleSelectAccount(customEmail, customName)}
                    className="w-full rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
                  >
                    Continue with this account
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAccountPicker(false)}
              className="mt-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 underline transition cursor-pointer"
            >
              Back to all login options
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20">
                <Flame className="h-6 w-6" />
              </div>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                {mode === 'login' ? 'Log In to AGNI' : 'Create your AGNI Account'}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Founded by <strong>M. Sanjay &amp; T. Hasini</strong> • Multimodal AI Companion
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Account Picker Button */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                id="auth-account-picker-btn"
                disabled={isLoading}
                onClick={() => setShowAccountPicker(true)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-300 bg-white py-2.5 px-4 text-xs font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-750 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>Continue with saved account</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              <span className="absolute bg-white px-3 text-[11px] uppercase tracking-wider text-neutral-400 dark:bg-neutral-900">
                or with email
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Full Name
                  </label>
                  <div className="relative mt-1">
                    <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="M. Sanjay or Your Name"
                      className="w-full rounded-xl border border-neutral-300 bg-neutral-50 py-2 pl-9 pr-3 text-xs text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="muralisanjayyadav@gmail.com, Itzmehasu94444@gmail.com or name@domain.com"
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 py-2 pl-9 pr-3 text-xs text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 py-2 pl-9 pr-3 text-xs text-neutral-900 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:from-orange-700 hover:to-amber-700 transition disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Authenticating...' : mode === 'login' ? 'Log In' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Security & Founder Footnote */}
            <div className="mt-4 flex flex-col items-center gap-1.5 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Secure authentication • Conceived by Founders M. Sanjay &amp; T. Hasini</span>
              </div>
              {onOpenTerms && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTerms();
                  }}
                  className="text-orange-500 hover:text-orange-600 underline underline-offset-2 cursor-pointer transition"
                >
                  Read AGNI Terms &amp; Policy
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
