import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { UserPreferences, TabMode, AuthUser } from '../types';

interface HeaderProps {
  activeTab: TabMode;
  userPreferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onTabSelect: (tab: TabMode) => void;
  backendOnline: boolean;
  authUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  onOpenTerms?: (tab?: 'terms' | 'privacy' | 'student' | 'about') => void;
  onOpenFounderAccess?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabSelect,
  authUser,
  onOpenAuth,
  canGoBack = false,
  onGoBack,
}) => {
  const toggleAccountMenu = () => {
    const m = document.getElementById('accountMenu');
    if (m) {
      m.style.display = m.style.display === 'block' ? 'none' : 'block';
    }
  };

  const handleOpenJarvis = () => {
    onTabSelect('jarvis');
    try {
      window.history.pushState({ tab: 'jarvis' }, '', '/jarvis');
    } catch {}
  };

  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        background: '#0a0a0a',
        borderBottom: '1px solid #222',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: 0,
      }}
    >
      {/* Top row - Logo + Founder + Controls - BIGGER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          minHeight: '72px',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
          {canGoBack && onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              title="Go back"
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 12,
                padding: '8px 10px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </button>
          )}

          <div
            onClick={() => onTabSelect('home')}
            style={{
              width: 44,
              height: 44,
              background: '#000',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ff6b0033',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 24 }}>🔥</span>
          </div>

          <div
            onClick={() => onTabSelect('home')}
            style={{ display: 'flex', flexDirection: 'column', minWidth: 0, cursor: 'pointer' }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 20,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.5px',
              }}
            >
              AGNI
            </span>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: '#ff8c42',
                fontWeight: 500,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Founders: M. Sanjay & T. Hasini
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 24,
              padding: '6px 14px',
              fontSize: 12,
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🇮🇳 English (India)
          </div>

          {authUser ? (
            <button
              id="accountMenuBtn"
              type="button"
              onClick={toggleAccountMenu}
              title={`Account: ${authUser.name}`}
              style={{
                width: 40,
                height: 40,
                background: authUser.isFounder ? '#ff6b00' : '#2563eb',
                border: 'none',
                borderRadius: 50,
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {authUser.isFounder ? '👑' : (authUser.name?.charAt(0).toUpperCase() || 'U')}
            </button>
          ) : (
            <button
              id="accountMenuBtn"
              type="button"
              onClick={onOpenAuth}
              title="Sign In"
              style={{
                background: '#ff6b00',
                border: 'none',
                borderRadius: 20,
                padding: '8px 16px',
                color: '#000',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Bottom row - Navigation Tabs - BIGGER + SCROLLABLE + EASY CLICK */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 16px 12px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          minHeight: '52px',
        }}
      >
        <button
          type="button"
          onClick={() => onTabSelect('home')}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            background: activeTab === 'home' ? '#ff6b00' : '#1a1a1a',
            border: activeTab === 'home' ? 'none' : '1px solid #333',
            borderRadius: 24,
            color: activeTab === 'home' ? '#fff' : '#aaa',
            fontFamily: 'Inter, sans-serif',
            fontWeight: activeTab === 'home' ? 600 : 500,
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          🏠 Home Hub
        </button>

        <button
          type="button"
          onClick={() => onTabSelect('chat')}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            background: activeTab === 'chat' ? '#ff6b00' : '#1a1a1a',
            border: activeTab === 'chat' ? 'none' : '1px solid #333',
            borderRadius: 24,
            color: activeTab === 'chat' ? '#fff' : '#aaa',
            fontFamily: 'Inter, sans-serif',
            fontWeight: activeTab === 'chat' ? 600 : 500,
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          💬 AI Chat
        </button>

        <button
          type="button"
          onClick={() => onTabSelect('heart_care')}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            background: activeTab === 'heart_care' ? '#ff6b00' : '#1a1a1a',
            border: activeTab === 'heart_care' ? 'none' : '1px solid #333',
            borderRadius: 24,
            color: activeTab === 'heart_care' ? '#fff' : '#aaa',
            fontFamily: 'Inter, sans-serif',
            fontWeight: activeTab === 'heart_care' ? 600 : 500,
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          ❤️ Heart &amp; Mind Care
        </button>

        <button
          type="button"
          onClick={handleOpenJarvis}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            background: activeTab === 'jarvis' ? '#ff6b00' : '#1a1a1a',
            border: activeTab === 'jarvis' ? 'none' : '1px solid #333',
            borderRadius: 24,
            color: activeTab === 'jarvis' ? '#fff' : '#aaa',
            fontFamily: 'Inter, sans-serif',
            fontWeight: activeTab === 'jarvis' ? 600 : 500,
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          🔥 JARVIS
        </button>
      </div>
    </header>
  );
};
