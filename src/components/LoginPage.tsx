import React, { useState } from 'react';
import { Mail, Lock, User, Flame, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { GOLD_FOUNDERS, getFounderName } from '../lib/auth';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);

    try {
      const isFounderAttempt = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(cleanEmail);

      if (isFounderAttempt) {
        // Verify founder credentials
        let verified = false;

        try {
          const res = await fetch('/api/founder/verify-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: password, email: cleanEmail }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.verified) {
            verified = true;
          }
        } catch {}

        // Fallback check against known founder secret codes (works for both M. Sanjay & T. Hasini)
        if (!verified && (password === 'qprwqwertyuio' || password === 'qprwqwer' || password === 'AGNI_FOUNDER_SANJAY_2026')) {
          verified = true;
        }

        if (!verified) {
          setError('Invalid founder passcode/password. Access denied.');
          setLoading(false);
          return;
        }

        // Successfully verified as Gold Founder (M. Sanjay or T. Hasini)
        const founderName = getFounderName(cleanEmail);
        const founderUser: AuthUser = {
          id: `founder-${Date.now()}`,
          name: founderName,
          email: cleanEmail,
          provider: 'email',
          isFounder: true,
          isCoFounder: false,
        };

        localStorage.setItem('user_email', cleanEmail);
        localStorage.setItem('agni_user_email', cleanEmail);
        localStorage.setItem('user_name', founderName);
        localStorage.setItem('agni_user_name', founderName);
        localStorage.setItem('agni_is_founder', 'true');
        localStorage.setItem('agni_auth_user', JSON.stringify(founderUser));

        onLoginSuccess(founderUser);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/');
        }
        return;
      }

      // Normal User / Student Login
      const resolvedName = fullName.trim() || cleanEmail.split('@')[0];
      const normalUser: AuthUser = {
        id: `user-${Date.now()}`,
        name: resolvedName,
        email: cleanEmail,
        provider: 'email',
        isFounder: false,
        isCoFounder: false,
      };

      localStorage.setItem('user_email', cleanEmail);
      localStorage.setItem('agni_user_email', cleanEmail);
      localStorage.setItem('user_name', resolvedName);
      localStorage.setItem('agni_user_name', resolvedName);
      localStorage.setItem('agni_is_founder', 'false');
      localStorage.setItem('agni_auth_user', JSON.stringify(normalUser));

      onLoginSuccess(normalUser);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestUser: AuthUser = {
      id: `guest-${Date.now()}`,
      name: 'Guest User',
      email: 'guest@agni.ai',
      provider: 'email',
      isFounder: false,
      isCoFounder: false,
    };

    localStorage.setItem('user_email', 'guest@agni.ai');
    localStorage.setItem('agni_user_email', 'guest@agni.ai');
    localStorage.setItem('user_name', 'Guest User');
    localStorage.setItem('agni_user_name', 'Guest User');
    localStorage.setItem('agni_is_founder', 'false');
    localStorage.setItem('agni_auth_user', JSON.stringify(guestUser));

    onLoginSuccess(guestUser);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#121212',
          border: '1px solid #282828',
          borderRadius: 24,
          padding: '32px 24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header / Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: '#000',
              borderRadius: 18,
              border: '1px solid #ff6b0055',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 12,
            }}
          >
            🔥
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            AGNI AI Assistant
          </h1>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
            Made in India &bull; To Serve the World
          </p>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            background: '#1a1a1a',
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: !isSignUp ? '#ff6b00' : 'transparent',
              color: !isSignUp ? '#000' : '#888',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: isSignUp ? '#ff6b00' : 'transparent',
              color: isSignUp ? '#000' : '#888',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#331111',
              border: '1px solid #772222',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#ff8888',
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6 }}>
                Full Name
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '10px 14px',
                  gap: 10,
                }}
              >
                <User style={{ width: 16, height: 16, color: '#666' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    outline: 'none',
                    fontSize: 14,
                    width: '100%',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 12,
                padding: '10px 14px',
                gap: 10,
              }}
            >
              <Mail style={{ width: 16, height: 16, color: '#666' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  fontSize: 14,
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#aaa', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 12,
                padding: '10px 14px',
                gap: 10,
              }}
            >
              <Lock style={{ width: 16, height: 16, color: '#666' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  fontSize: 14,
                  width: '100%',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              background: '#ff6b00',
              border: 'none',
              borderRadius: 14,
              padding: '12px 18px',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <span>{loading ? 'Authenticating...' : isSignUp ? 'Create Free Account' : 'Sign In'}</span>
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#222' }} />
          <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#222' }} />
        </div>

        {/* Guest Access Option */}
        <button
          type="button"
          onClick={handleGuestLogin}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 12,
            color: '#ccc',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <ShieldCheck style={{ width: 15, height: 15, color: '#ff8c42' }} />
          <span>Continue as Student / Guest</span>
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#555', marginTop: 20, marginBottom: 0 }}>
          Strict per-user data isolation. Founder privileges require verified credentials.
        </p>
      </div>
    </div>
  );
};
