import React, { useEffect, useRef } from 'react';
import { AuthUser } from '../types';
import { isFounder as checkIsFounder } from '../lib/auth';

interface AccountMenuProps {
  authUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export default function AccountMenu({ authUser, onLogout, onOpenAuth }: AccountMenuProps = {}) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
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
      if (onLogout) onLogout();
    } catch {}
    window.location.href = '/login';
  };

  const closeMenu = () => {
    const m = document.getElementById('accountMenu');
    if (m) m.style.display = 'none';
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current && !menuRef.current.contains(target)) {
        const toggleBtn = document.getElementById('accountMenuBtn');
        if (toggleBtn && toggleBtn.contains(target)) return;
        closeMenu();
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const isUserFounder = Boolean(authUser?.isFounder || checkIsFounder());

  return (
    <div
      id="accountMenu"
      ref={menuRef}
      style={{
        display: 'none',
        position: 'absolute',
        top: '76px',
        right: '16px',
        width: '280px',
        background: '#111',
        border: '1px solid #333',
        borderRadius: 16,
        padding: '16px',
        zIndex: 200,
        boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {authUser ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: isUserFounder ? '#ff6b00' : '#2563eb',
                borderRadius: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#fff',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {isUserFounder ? '👑' : (authUser.name?.charAt(0).toUpperCase() || 'U')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: '#fff',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {authUser.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {authUser.email}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: isUserFounder ? '#ff8c42' : '#60a5fa',
                  background: isUserFounder ? '#ff6b0018' : '#2563eb18',
                  padding: '2px 8px',
                  borderRadius: 10,
                  display: 'inline-block',
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                {isUserFounder ? 'Founder • Full System Access' : 'Verified Member'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #222', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#aaa' }}>
              🔥 JARVIS Private Mode:{' '}
              {isUserFounder ? (
                <span style={{ color: '#22c55e', fontWeight: 600 }}>Active (Founder)</span>
              ) : (
                <span style={{ color: '#eab308' }}>Locked (Founder Only)</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#aaa' }}>
              🛡️ Session: <span style={{ color: '#fff' }}>Isolated Device Storage</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 10,
                color: '#ff6666',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              Sign Out & Clear Session
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '8px 4px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 4 }}>
            Not Signed In
          </div>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px 0', lineHeight: 1.4 }}>
            Sign in to access your personal AGNI assistant features.
          </p>
          <button
            type="button"
            onClick={() => {
              closeMenu();
              if (onOpenAuth) onOpenAuth();
              else window.location.href = '/login';
            }}
            style={{
              width: '100%',
              padding: '10px',
              background: '#ff6b00',
              border: 'none',
              borderRadius: 10,
              color: '#000',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign In / Register
          </button>
        </div>
      )}
    </div>
  );
}
