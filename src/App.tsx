import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import AccountMenu from './components/AccountMenu';
import { Navigation } from './components/Navigation';
import { HomeHub } from './components/HomeHub';
import { ChatView } from './components/ChatView';
const LearnView = lazy(() => import('./components/LearnView').then(m => ({ default: m.LearnView })));
const VisionView = lazy(() => import('./components/VisionView').then(m => ({ default: m.VisionView })));
const DocumentsView = lazy(() => import('./components/DocumentsView').then(m => ({ default: m.DocumentsView })));
import { SearchView } from './components/SearchView';
import { AssistantActionsView } from './components/AssistantActionsView';
import { MemoryView } from './components/MemoryView';
import { WhatsAppBotView } from './components/WhatsAppBotView';
import { OfflineLiteView } from './components/OfflineLiteView';
const AgniCanvas = lazy(() => import('./components/AgniCanvas').then(m => ({ default: m.AgniCanvas })));
import { SmartLifeOS } from './components/SmartLifeOS';
const JarvisView = lazy(() => import('./components/JarvisView').then(m => ({ default: m.JarvisView })));
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { SiriVoiceOverlay } from './components/SiriVoiceOverlay';
import { VoiceTriggerFab } from './components/VoiceTriggerFab';
import { TermsPolicyModal } from './components/TermsPolicyModal';
import { FounderAccessModal } from './components/FounderAccessModal';
import { HeartCareChatView } from './components/HeartCareChatView';
import { SettingsView } from './components/SettingsView';
import { VoiceChatView } from './components/VoiceChatView';
import { AndroidHardwareTriggerModal } from './components/AndroidHardwareTriggerModal';
import { AndroidInstallPrompt } from './components/AndroidInstallPrompt';
const DoubtBattleView = lazy(() => import('./components/DoubtBattleView'));
const TNBoardMode = lazy(() => import('./components/TNBoardMode'));
import { ExamPredictorModal } from './components/ExamPredictorModal';
const MyVoiceView = lazy(() => import('./components/MyVoiceView'));
const ParentDashboardView = lazy(() => import('./components/ParentDashboardView'));
const FounderAnalyticsView = lazy(() => import('./components/FounderAnalyticsView'));
const FounderAccessView = lazy(() => import('./components/FounderAccessView'));
import {
  attachHardwareTriggerListener,
  setupMediaSessionTrigger,
  releaseScreenWakeLock,
} from './utils/hardwareTrigger';
import {
  saveEncryptedCoFounders,
  loadEncryptedCoFounders,
  purgeAllAuthData,
  checkVoiceBoxRateLimit,
  isPrimaryFounder,
} from './utils/security';
import { GOLD_FOUNDERS, getFounderName } from './lib/auth';
import { Volume2, Sparkles, Radio, Square, Shield, Heart, Flame } from 'lucide-react';
import {
  TabMode,
  ChatMessage,
  MediaAttachment,
  UserPreferences,
  StoredMemory,
  ReminderItem,
  AuthUser,
  ChatSession,
  CoFounder,
  FounderBroadcast,
} from './types';
import { speakText, stopSpeaking, subscribeSpeechState, getSpokenSnippet } from './utils/speech';
import { apiFetch } from './utils/api';
import { Analytics } from "@vercel/analytics/react";


const ViewLoadingSkeleton: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 bg-neutral-800 rounded-2xl" />
      <div className="h-6 w-48 bg-neutral-800 rounded-xl" />
    </div>
    <div className="h-32 bg-neutral-900/80 rounded-3xl border border-neutral-800/80" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="h-24 bg-neutral-900/80 rounded-2xl border border-neutral-800/60" />
      <div className="h-24 bg-neutral-900/80 rounded-2xl border border-neutral-800/60" />
      <div className="h-24 bg-neutral-900/80 rounded-2xl border border-neutral-800/60" />
      <div className="h-24 bg-neutral-900/80 rounded-2xl border border-neutral-800/60" />
    </div>
    <div className="h-44 bg-neutral-900/60 rounded-3xl border border-neutral-800/40" />
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabMode>('home');
  const [tabHistory, setTabHistory] = useState<TabMode[]>(['home']);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/';
  });

  // Strict Per-User Session Isolation:
  // If no user email exists in this browser's localStorage, direct user to Login page
  useEffect(() => {
    const email = localStorage.getItem('user_email') || localStorage.getItem('agni_user_email');
    if (!email) {
      if (window.location.pathname !== '/login') {
        try {
          window.history.replaceState({}, '', '/login');
          setCurrentPath('/login');
        } catch {}
      }
    }
  }, []);

  // Terms & Policy Modal State
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [termsInitialTab, setTermsInitialTab] = useState<'terms' | 'privacy' | 'student' | 'about'>('terms');

  const handleOpenTerms = (tab: 'terms' | 'privacy' | 'student' | 'about' = 'terms') => {
    setTermsInitialTab(tab);
    setIsTermsModalOpen(true);
  };

  // Global AI Speaking State
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);

  // Offline Mode: OFF by default (API ONLY mode)
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('agni_offline_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Android PWA Shortcut & Path Router (e.g. /, /home, /jarvis, /ai-chat)
  useEffect(() => {
    const syncRouteFromLocation = () => {
      try {
        const path = window.location.pathname.toLowerCase();
        if (path === '/login') {
          setCurrentPath('/login');
          return;
        }
        if (path === '/jarvis' || path.startsWith('/jarvis')) {
          setActiveTab('jarvis');
          return;
        }
        if (path === '/parent-dashboard' || path.startsWith('/parent-dashboard')) {
          setActiveTab('parent_dashboard');
          return;
        }
        if (path === '/founder-panel' || path === '/founder' || path.startsWith('/founder-panel') || path.startsWith('/founder')) {
          setActiveTab('founder_panel');
          return;
        }
        if (path === '/founder-analytics' || path.startsWith('/founder-analytics')) {
          setActiveTab('founder_analytics');
          return;
        }
        if (path === '/ai-chat' || path === '/chat') {
          setActiveTab('chat');
          return;
        }
        if (path === '/home' || path === '/') {
          const tabParam = new URLSearchParams(window.location.search).get('tab');
          if (tabParam) {
            setActiveTab(tabParam as TabMode);
            return;
          }
          if (path === '/home') {
            setActiveTab('home');
          }
        }

        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const tab = params.get('tab');
        if (tab) {
          setActiveTab(tab as TabMode);
        } else if (action === 'voice') {
          setTimeout(() => openVoiceBoxSafely(false), 350);
        } else if (action === 'jarvis') {
          setActiveTab('jarvis');
        } else if (action === 'offline') {
          setActiveTab('offline');
        } else if (action === 'vision') {
          setActiveTab('vision');
        } else if (action === 'settings') {
          setActiveTab('settings');
        }
      } catch {}
    };

    syncRouteFromLocation();
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSpeechState((speaking) => {
      setIsAiSpeaking(speaking);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsAiSpeaking(false);
  };

  // Handle Tab Navigation with History Tracking & Browser URL Sync
  const handleSelectTab = (newTab: TabMode) => {
    stopSpeaking();
    if (newTab === activeTab) return;
    setTabHistory((prev) => [...prev, newTab]);
    setActiveTab(newTab);
    try {
      const targetPath =
        newTab === 'jarvis'
          ? '/jarvis'
          : newTab === 'chat'
          ? '/ai-chat'
          : newTab === 'home'
          ? '/'
          : `/?tab=${newTab}`;
      if (window.location.pathname !== targetPath && !(newTab === 'home' && window.location.pathname === '/')) {
        window.history.pushState({ tab: newTab }, '', targetPath);
      }
    } catch {}
  };

  // Handle Back Navigation with Native History Back
  const handleGoBack = () => {
    stopSpeaking();
    if (window.history.length > 1 && window.history.state) {
      window.history.back();
      return;
    }
    if (tabHistory.length > 1) {
      const newHistory = [...tabHistory];
      newHistory.pop(); // Remove current tab
      const previousTab = newHistory[newHistory.length - 1] || 'home';
      setTabHistory(newHistory);
      setActiveTab(previousTab);
    } else {
      setActiveTab('home');
      try {
        window.history.pushState({ tab: 'home' }, '', '/');
      } catch {}
    }
  };

  // Authentication State with robust encrypted local storage restoration
  const [coFounders, setCoFounders] = useState<CoFounder[]>(() => {
    return loadEncryptedCoFounders();
  });

  useEffect(() => {
    saveEncryptedCoFounders(coFounders);
  }, [coFounders]);

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const isCoFounderEmail = (email: string) => {
      const list = loadEncryptedCoFounders();
      return list.some((c: any) => c.email?.toLowerCase().trim() === email.toLowerCase().trim());
    };

    const saved = localStorage.getItem('agni_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          const isFounder = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(parsed.email.toLowerCase().trim());
          const isCoFounder = !isFounder && (parsed.isCoFounder || isCoFounderEmail(parsed.email));
          return {
            ...parsed,
            name: isFounder ? getFounderName(parsed.email) : parsed.name,
            isFounder,
            isCoFounder,
          };
        }
      } catch (e) {
        console.warn('Failed to parse auth user', e);
      }
    }
    const savedEmail = localStorage.getItem('user_email') || localStorage.getItem('agni_user_email');
    if (savedEmail) {
      const isFounder = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(savedEmail.toLowerCase().trim());
      const isCoFounder = !isFounder && isCoFounderEmail(savedEmail);
      return {
        uid: 'saved-session',
        email: savedEmail,
        name: isFounder ? getFounderName(savedEmail) : (localStorage.getItem('user_name') || localStorage.getItem('agni_user_name') || savedEmail.split('@')[0]),
        isFounder,
        isCoFounder,
      };
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isFounderAccessOpen, setIsFounderAccessOpen] = useState<boolean>(false);
  const [broadcast, setBroadcast] = useState<FounderBroadcast | null>(null);
  const [customFounderBio, setCustomFounderBio] = useState<string>(() => {
    return localStorage.getItem('agni_custom_founder_bio') || '';
  });

  // Fetch active broadcast announcement & remote config
  useEffect(() => {
    apiFetch<FounderBroadcast>('/api/broadcast')
      .then((data) => {
        if (data && data.active && data.message) {
          setBroadcast(data);
        }
      })
      .catch(() => {});

    apiFetch<any>('/api/remote-config')
      .then((cfg) => {
        if (cfg && cfg.banner && cfg.banner.enabled && cfg.banner.text) {
          setBroadcast({
            id: 'banner-remote',
            message: cfg.banner.text,
            timestamp: new Date().toISOString(),
            active: true,
            author: 'Founders M. Sanjay & T. Hasini',
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenFounderAccess = () => {
    const isFounder = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(authUser?.email?.toLowerCase().trim() || '');
    if (isFounder) {
      setActiveTab('founder_panel');
    } else {
      setIsFounderAccessOpen(true);
    }
  };

  const handleUpdateBio = (newBio: string) => {
    setCustomFounderBio(newBio);
    localStorage.setItem('agni_custom_founder_bio', newBio);
  };

  const handleAddCoFounder = (newCoFounder: CoFounder) => {
    setCoFounders((prev) => {
      const filtered = prev.filter((c) => c.email.toLowerCase().trim() !== newCoFounder.email.toLowerCase().trim());
      return [newCoFounder, ...filtered];
    });
    if (authUser && authUser.email.toLowerCase().trim() === newCoFounder.email.toLowerCase().trim()) {
      setAuthUser((prev) => (prev ? { ...prev, isCoFounder: true } : null));
    }
  };

  const handleRemoveCoFounder = (email: string) => {
    setCoFounders((prev) => prev.filter((c) => c.email.toLowerCase().trim() !== email.toLowerCase().trim()));
    if (authUser && authUser.email.toLowerCase().trim() === email.toLowerCase().trim()) {
      setAuthUser((prev) => (prev ? { ...prev, isCoFounder: false } : null));
    }
  };

  // AGNI Live Voice Assistant Overlay State (Single Voice Box)
  const [isSiriOpen, setIsSiriOpen] = useState<boolean>(false);
  const [isSiriExpanded, setIsSiriExpanded] = useState<boolean>(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);
  const [hardwareHoldProgress, setHardwareHoldProgress] = useState<number>(0);
  const [isHardwareHolding, setIsHardwareHolding] = useState<boolean>(false);
  const spaceHeldRef = useRef<boolean>(false);

  // Rate-limited voice box opener (Max 1 open per 2 seconds)
  const openVoiceBoxSafely = (expanded = false) => {
    if (!checkVoiceBoxRateLimit()) return;
    setIsSiriExpanded(expanded);
    setIsSiriOpen(true);
  };

  // Android Hardware Trigger (Vol Up + Power for 1.5s) & Media Session Lock Screen Integration
  useEffect(() => {
    // 1. Initialize Media Session for Android Lock Screen & Headset button triggers
    setupMediaSessionTrigger(() => {
      openVoiceBoxSafely(false);
    });

    // 2. Attach Hardware Keydown / Keyup Combo Listener (Vol Up + Power held for 1.5s)
    const detachHardware = attachHardwareTriggerListener({
      holdDurationMs: 1500,
      onProgress: (prog, isHolding) => {
        setHardwareHoldProgress(prog);
        setIsHardwareHolding(isHolding);
      },
      onTrigger: () => {
        openVoiceBoxSafely(false);
      },
    });

    return () => {
      detachHardware();
    };
  }, []);

  // Screen Wake Lock cleanup when Voice Box closes
  useEffect(() => {
    if (!isSiriOpen) {
      releaseScreenWakeLock();
    }
  }, [isSiriOpen]);

  // Global keyboard shortcuts: Desktop (Hold Space + V, Alt + A, or single V)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as any)?.isContentEditable;

      // Track Space key state when outside of text fields
      if (!isInputFocused && (e.code === 'Space' || e.key === ' ')) {
        spaceHeldRef.current = true;
      }

      // Desktop: Hold Space + V
      if (spaceHeldRef.current && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
        e.preventDefault();
        openVoiceBoxSafely(false);
        return;
      }

      // Desktop: Press Alt + A (or Alt + S)
      if (e.altKey && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        openVoiceBoxSafely(false);
        return;
      }

      // Desktop: Single 'v' when not typing in any input field
      if (
        !isInputFocused &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === 'v' || e.key === 'V')
      ) {
        e.preventDefault();
        openVoiceBoxSafely(false);
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        spaceHeldRef.current = false;
      }
    };

    const handleWindowBlur = () => {
      spaceHeldRef.current = false;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handleTransferSiriToChat = (userText: string, assistantReply?: string) => {
    const userMsg: ChatMessage = {
      id: `siri-u-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const newMsgs: ChatMessage[] = [userMsg];
    if (assistantReply) {
      newMsgs.push({
        id: `siri-a-${Date.now() + 1}`,
        role: 'model',
        text: assistantReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
    setMessages((prev) => [...prev, ...newMsgs]);
    setActiveTab('chat');
  };

  // User Preferences with LocalStorage
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('agni_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved preferences', e);
      }
    }
    return {
      userName: '',
      language: 'English',
      responseStyle: 'balanced',
      isStudent: true,
      studentGrade: 'High School (Class 9-12)',
      voiceEnabled: true,
      voiceSpeed: 0.95,
      voicePitch: 1.05,
      voiceProfile: 'natural-warm',
      agniVoice: 'Aoede',
      theme: 'dark',
    };
  });

  // Apply dark/light class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (userPreferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('agni_preferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  // Chat Sessions & History Management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('agni_chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse chat sessions', e);
      }
    }
    const legacySaved = localStorage.getItem('agni_chat_messages');
    let initialMessages: ChatMessage[] = [];
    if (legacySaved) {
      try {
        initialMessages = JSON.parse(legacySaved);
      } catch {}
    }
    const initialSessionId = `session-${Date.now()}`;
    return [
      {
        id: initialSessionId,
        title: initialMessages.length > 0 ? (initialMessages[0].text.slice(0, 32) + '...') : 'Welcome to AGNI',
        createdAt: new Date().toLocaleDateString(),
        updatedAt: 'Just now',
        messages: initialMessages,
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem('agni_active_session_id');
    return savedId || (chatSessions[0]?.id ?? 'default-session');
  });

  // Active messages computed from current session
  const activeSession = chatSessions.find((s) => s.id === activeSessionId) || chatSessions[0];
  const messages = activeSession?.messages || [];

  // Ensure activeSessionId stays valid and never orphaned
  useEffect(() => {
    if (chatSessions.length > 0 && !chatSessions.some((s) => s.id === activeSessionId)) {
      setActiveSessionId(chatSessions[0].id);
    }
  }, [chatSessions, activeSessionId]);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('agni_chat_sessions', JSON.stringify(chatSessions));
    if (activeSession?.id) {
      localStorage.setItem('agni_active_session_id', activeSession.id);
    }
    if (messages) {
      localStorage.setItem('agni_chat_messages', JSON.stringify(messages));
    }
  }, [chatSessions, activeSession?.id, messages]);

  const setMessages = (newMessagesOrUpdater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setChatSessions((prevSessions) => {
      // Find the target session safely: match activeSessionId, fallback to first session or activeSession
      const targetId = prevSessions.some((s) => s.id === activeSessionId)
        ? activeSessionId
        : (activeSession?.id || prevSessions[0]?.id || 'default-session');

      // If sessions array is unexpectedly empty, initialize with target
      if (prevSessions.length === 0) {
        const fallbackId = targetId || `session-${Date.now()}`;
        const newMsgs = typeof newMessagesOrUpdater === 'function' ? newMessagesOrUpdater([]) : newMessagesOrUpdater;
        return [{
          id: fallbackId,
          title: newMsgs[0]?.text?.slice(0, 32) || 'New Conversation',
          createdAt: new Date().toLocaleDateString(),
          updatedAt: 'Just now',
          messages: newMsgs,
        }];
      }

      return prevSessions.map((session) => {
        if (session.id === targetId) {
          const currentMsgs = session.messages || [];
          const updatedMsgs =
            typeof newMessagesOrUpdater === 'function'
              ? newMessagesOrUpdater(currentMsgs)
              : newMessagesOrUpdater;

          let updatedTitle = session.title;
          if (
            (session.title === 'New Conversation' || session.title === 'Welcome to AGNI' || !session.title) &&
            updatedMsgs.length > 0
          ) {
            const firstUserMsg = updatedMsgs.find((m) => m.role === 'user');
            if (firstUserMsg) {
              updatedTitle = firstUserMsg.text.slice(0, 32) + (firstUserMsg.text.length > 32 ? '...' : '');
            }
          }

          return {
            ...session,
            title: updatedTitle,
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: updatedMsgs,
          };
        }
        return session;
      });
    });
  };

  const handleCreateNewSession = () => {
    stopSpeaking();
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Conversation',
      createdAt: new Date().toLocaleDateString(),
      updatedAt: 'Just now',
      messages: [],
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
  };

  const handleSelectSession = (id: string) => {
    stopSpeaking();
    const exists = chatSessions.some((s) => s.id === id);
    if (exists) {
      setActiveSessionId(id);
    }
  };

  const handleDeleteSession = (id: string) => {
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const freshId = `session-${Date.now()}`;
        const freshSession: ChatSession = {
          id: freshId,
          title: 'New Conversation',
          createdAt: new Date().toLocaleDateString(),
          updatedAt: 'Just now',
          messages: [],
        };
        setActiveSessionId(freshId);
        return [freshSession];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleClearAllSessions = () => {
    const freshId = `session-${Date.now()}`;
    const freshSession: ChatSession = {
      id: freshId,
      title: 'New Conversation',
      createdAt: new Date().toLocaleDateString(),
      updatedAt: 'Just now',
      messages: [],
    };
    setChatSessions([freshSession]);
    setActiveSessionId(freshId);
  };

  // AGNI Heart & Mind Care Dedicated State & Sessions (Strictly Separated from Normal Chat)
  const [heartCareSessions, setHeartCareSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('agni_heart_care_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse heart care sessions', e);
      }
    }
    const initialSessionId = `heart-session-${Date.now()}`;
    return [
      {
        id: initialSessionId,
        title: 'AGNI Heart & Mind Sanctuary',
        createdAt: new Date().toLocaleDateString(),
        updatedAt: 'Just now',
        messages: [],
      },
    ];
  });

  const [activeHeartCareSessionId, setActiveHeartCareSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem('agni_heart_care_active_session_id');
    return savedId || (heartCareSessions[0]?.id ?? 'default-heart-session');
  });

  const [initialHeartCareInput, setInitialHeartCareInput] = useState<string>('');
  const [isHeartCareLoading, setIsHeartCareLoading] = useState<boolean>(false);
  const [isExamPredictorOpen, setIsExamPredictorOpen] = useState<boolean>(false);


  // Persist Heart Care sessions completely separated from normal chat
  useEffect(() => {
    localStorage.setItem('agni_heart_care_sessions', JSON.stringify(heartCareSessions));
    if (activeHeartCareSessionId) {
      localStorage.setItem('agni_heart_care_active_session_id', activeHeartCareSessionId);
    }
  }, [heartCareSessions, activeHeartCareSessionId]);

  // Ensure activeHeartCareSessionId remains valid
  useEffect(() => {
    if (heartCareSessions.length > 0 && !heartCareSessions.some((s) => s.id === activeHeartCareSessionId)) {
      setActiveHeartCareSessionId(heartCareSessions[0].id);
    }
  }, [heartCareSessions, activeHeartCareSessionId]);

  const setHeartCareMessages = (
    newMessagesOrUpdater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setHeartCareSessions((prevSessions) => {
      const targetId = prevSessions.some((s) => s.id === activeHeartCareSessionId)
        ? activeHeartCareSessionId
        : (prevSessions[0]?.id || 'default-heart-session');

      if (prevSessions.length === 0) {
        const fallbackId = `heart-session-${Date.now()}`;
        const newMsgs = typeof newMessagesOrUpdater === 'function' ? newMessagesOrUpdater([]) : newMessagesOrUpdater;
        return [{
          id: fallbackId,
          title: newMsgs[0]?.text?.slice(0, 32) || 'Heart Care Sanctuary',
          createdAt: new Date().toLocaleDateString(),
          updatedAt: 'Just now',
          messages: newMsgs,
        }];
      }

      return prevSessions.map((session) => {
        if (session.id === targetId) {
          const currentMsgs = session.messages || [];
          const updatedMsgs =
            typeof newMessagesOrUpdater === 'function'
              ? newMessagesOrUpdater(currentMsgs)
              : newMessagesOrUpdater;

          let updatedTitle = session.title;
          if (
            (session.title === 'AGNI Heart & Mind Sanctuary' || session.title === 'Heart Care Sanctuary' || !session.title) &&
            updatedMsgs.length > 0
          ) {
            const firstUserMsg = updatedMsgs.find((m) => m.role === 'user');
            if (firstUserMsg) {
              updatedTitle = firstUserMsg.text.slice(0, 32) + (firstUserMsg.text.length > 32 ? '...' : '');
            }
          }

          return {
            ...session,
            title: updatedTitle,
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: updatedMsgs,
          };
        }
        return session;
      });
    });
  };

  const handleCreateNewHeartCareSession = () => {
    stopSpeaking();
    const newSessionId = `heart-session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Heart Conversation',
      createdAt: new Date().toLocaleDateString(),
      updatedAt: 'Just now',
      messages: [],
    };
    setHeartCareSessions((prev) => [newSession, ...prev]);
    setActiveHeartCareSessionId(newSessionId);
  };

  const handleDeleteHeartCareSession = (id: string) => {
    setHeartCareSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const freshId = `heart-session-${Date.now()}`;
        setActiveHeartCareSessionId(freshId);
        return [{
          id: freshId,
          title: 'AGNI Heart & Mind Sanctuary',
          createdAt: new Date().toLocaleDateString(),
          updatedAt: 'Just now',
          messages: [],
        }];
      }
      if (activeHeartCareSessionId === id) {
        setActiveHeartCareSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleClearAllHeartCareSessions = () => {
    const freshId = `heart-session-${Date.now()}`;
    setHeartCareSessions([
      {
        id: freshId,
        title: 'AGNI Heart & Mind Sanctuary',
        createdAt: new Date().toLocaleDateString(),
        updatedAt: 'Just now',
        messages: [],
      },
    ]);
    setActiveHeartCareSessionId(freshId);
  };

  // Heart Care message send handler (Separated from normal chat)
  const handleSendHeartCareMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `heart-u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentHeartSession = heartCareSessions.find((s) => s.id === activeHeartCareSessionId) || heartCareSessions[0];
    const currentMsgs = currentHeartSession?.messages || [];
    const updatedMessages = [...currentMsgs, userMsg];
    setHeartCareMessages(updatedMessages);
    setIsHeartCareLoading(true);

    try {
      const data = await apiFetch<{ text?: string; reply?: string; suggestedMemories?: string[] }>('/api/heart', {
        method: 'POST',
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
          isHeartCare: true,
          authUser: authUser
            ? {
                name: authUser.name,
                email: authUser.email,
                isFounder: authUser.isFounder,
              }
            : undefined,
        }),
      });

      const heartReply = data.text || data.reply || 'I am here with you. Take your time. Ã°Å¸â€™â„¢';
      const modelMsg: ChatMessage = {
        id: `heart-m-${Date.now()}`,
        role: 'model',
        text: heartReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHeartCareMessages((prev) => [...prev, modelMsg]);

      if (userPreferences.voiceEnabled) {
        const textToSpeak = getSpokenSnippet(heartReply);
        speakText(textToSpeak, {
          rate: 0.94,
          pitch: 1.02,
          volume: 1.0,
          profile: 'natural-warm',
        });
      }
    } catch (err: any) {
      console.error('Heart Care Chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `heart-err-${Date.now()}`,
        role: 'model',
        text: err?.message?.includes('key') || err?.message?.includes('GROQ') ? "âš ï¸ AI service unavailable. Please add GROQ_API_KEY in Vercel settings." : "Something went wrong. Please try again in a moment. ðŸ’™",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setHeartCareMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsHeartCareLoading(false);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: AuthUser) => {
    const isFounder = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(user.email.toLowerCase().trim());
    const isCoFounder = !isFounder && (user.isCoFounder || coFounders.some((c) => c.email.toLowerCase().trim() === user.email.toLowerCase().trim()));
    const finalUser: AuthUser = {
      ...user,
      name: isFounder ? getFounderName(user.email) : user.name,
      isFounder,
      isCoFounder,
    };
    setAuthUser(finalUser);
    setIsAuthModalOpen(false);
    setCurrentPath('/');
    localStorage.setItem('user_email', finalUser.email);
    localStorage.setItem('agni_user_email', finalUser.email);
    localStorage.setItem('user_name', finalUser.name);
    localStorage.setItem('agni_user_name', finalUser.name);
    localStorage.setItem('agni_is_founder', String(finalUser.isFounder || false));
    localStorage.setItem('agni_auth_user', JSON.stringify(finalUser));

    setUserPreferences((prev) => ({ ...prev, userName: finalUser.name }));

    // If logged in as Founder, seed personal greeting in chat if empty
    if (finalUser.isFounder) {
      const founderGreetingText = `Hii ${finalUser.name}! I am proud to meet my founder. Welcome back to your own creation - AGNI. What shall we build today?`;
      setChatSessions((prevSessions) => {
        return prevSessions.map((session) => {
          if (session.id === activeSessionId && (session.messages.length === 0 || !session.messages.some((m) => m.text.includes('proud to meet my founder')))) {
            return {
              ...session,
              messages: [
                {
                  id: `founder-welcome-${Date.now()}`,
                  role: 'model',
                  text: founderGreetingText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...session.messages,
              ],
            };
          }
          return session;
        });
      });
    } else if (finalUser.isCoFounder) {
      const coFounderGreetingText = `Hii ${finalUser.name}! Welcome back Co-Founder. AGNI systems are operating smoothly. How can I assist you today? Ã°Å¸â€ºÂ¡Ã¯Â¸Â`;
      setChatSessions((prevSessions) => {
        return prevSessions.map((session) => {
          if (session.id === activeSessionId && (session.messages.length === 0 || !session.messages.some((m) => m.text.includes('Co-Founder')))) {
            return {
              ...session,
              messages: [
                {
                  id: `cofounder-welcome-${Date.now()}`,
                  role: 'model',
                  text: coFounderGreetingText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...session.messages,
              ],
            };
          }
          return session;
        });
      });
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
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
    } catch {}
    purgeAllAuthData();
    setUserPreferences((prev) => ({ ...prev, userName: '' }));
    setCurrentPath('/login');
    try {
      window.history.replaceState({}, '', '/login');
    } catch {}
  };

  // Memory Records
  const [memories, setMemories] = useState<StoredMemory[]>(() => {
    const founderMem: StoredMemory = {
      id: 'mem-founder',
      content: 'Founders of AGNI are M. Sanjay & T. Hasini, kind-hearted innovators who founded AGNI to solve day-to-day life problems. Vision: Made in India, To Serve the World.',
      category: 'preference',
      createdAt: '2026-09-14',
    };

    const saved = localStorage.getItem('agni_memories');
    if (saved) {
      try {
        const parsed: StoredMemory[] = JSON.parse(saved);
        if (!parsed.some((m) => m.id === 'mem-founder' || m.content.includes('M. Sanjay'))) {
          return [founderMem, ...parsed];
        }
        return parsed;
      } catch (e) {
        console.warn('Failed to parse memories', e);
      }
    }
    return [
      founderMem,
      {
        id: 'mem-1',
        content: 'I prefer step-by-step guidance with real-life analogies before final answers.',
        category: 'study',
        createdAt: '2026-09-14',
      },
      {
        id: 'mem-2',
        content: 'Preparing for Science & Mathematics exams in English and Hindi.',
        category: 'goal',
        createdAt: '2026-09-14',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('agni_memories', JSON.stringify(memories));
  }, [memories]);

  // Reminders
  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    const saved = localStorage.getItem('agni_reminders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse reminders', e);
      }
    }
    return [
      {
        id: 'rem-1',
        title: 'Physics: Practice 5 Numerical Problems on NewtonÃ¢â‚¬â„¢s 2nd Law',
        time: '18:30',
        completed: false,
        category: 'homework',
      },
      {
        id: 'rem-2',
        title: 'Biology: Revise Photosynthesis Light Reaction Diagram',
        time: '20:00',
        completed: false,
        category: 'study',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('agni_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Cross-view initial prompt/topic state
  const [initialChatInput, setInitialChatInput] = useState<string>('');
  const [initialLearnTopic, setInitialLearnTopic] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Health check on mount
  useEffect(() => {
    apiFetch<{ status: string }>('/api/health')
      .then((data) => {
        setBackendOnline(data.status === 'ok');
      })
      .catch((err) => {
        console.warn('Backend health check error:', err);
        setBackendOnline(false);
      });
  }, []);

  // Update Preferences helper
  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setUserPreferences((prev) => ({ ...prev, ...updated }));
  };

  // Quick prompt launcher from Home Hub
  const handleQuickPrompt = (tab: TabMode, promptText: string) => {
    stopSpeaking();
    if (tab === 'chat') {
      setInitialChatInput(promptText);
      setActiveTab('chat');
    } else if (tab === 'heart_care') {
      setInitialHeartCareInput(promptText);
      setActiveTab('heart_care');
    } else if (tab === 'learn') {
      setInitialLearnTopic(promptText);
      setActiveTab('learn');
    } else {
      setActiveTab(tab);
    }
  };

  // Chat message send handler
  const handleSendMessage = async (text: string, attachments?: MediaAttachment[]) => {
    localStorage.setItem('lastUserMessage', text || (attachments?.length ? 'Uploaded media attachment' : ''));
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text || (attachments?.length ? `[Attached ${attachments.length} file(s)]` : ''),
      attachments,
      mediaUrl: attachments && attachments[0] ? attachments[0].url : undefined,
      mediaType: attachments && attachments[0] ? attachments[0].type : undefined,
      thumbnailUrl: attachments && attachments[0] ? attachments[0].thumbnailUrl : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentMsgs = activeSession?.messages || messages;
    const updatedMessages = [...currentMsgs, userMsg];
    setMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const data = await apiFetch<{ text?: string; reply?: string; suggestedMemories?: string[] }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
          message: text,
          attachments,
          images: attachments?.map((a) => a.thumbnailUrl || a.url).filter(Boolean),
          mediaUrl: attachments?.[0]?.url,
          mediaType: attachments?.[0]?.type,
          thumbnailUrl: attachments?.[0]?.thumbnailUrl,
          email: authUser?.email || localStorage.getItem('agni_user_email') || undefined,
          isFounder: authUser?.isFounder,
          userPreferences,
          memories: memories.map((m) => m.content),
          authUser: authUser
            ? {
                name: authUser.name,
                email: authUser.email,
                isFounder: authUser.isFounder,
              }
            : undefined,
        }),
      });

      const replyContent = data.text || data.reply || 'Vanakkam! I received your message.';
      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);

      // Auto-ingest suggested memories from AI response (name, age, class detected)
      if (data.suggestedMemories && data.suggestedMemories.length > 0) {
        setMemories((prev) => {
          const newMems = data.suggestedMemories!.filter(
            (sm) => !prev.some((existing) => existing.content.toLowerCase() === sm.toLowerCase())
          );
          if (newMems.length === 0) return prev;
          return [
            ...prev,
            ...newMems.map((content) => ({
              id: `mem-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              content,
              category: 'preference' as const,
              createdAt: new Date().toISOString().split('T')[0],
            })),
          ];
        });
        // Auto-set user name from detected memory
        const nameMem = data.suggestedMemories.find((m) => m.startsWith("User's name is"));
        if (nameMem && !userPreferences.userName) {
          const detectedName = nameMem.replace("User's name is ", '');
          setUserPreferences((prev) => ({ ...prev, userName: detectedName }));
        }
      }

      // If voice enabled, speak snappy spoken summary so AGNI does not talk endlessly
      if (userPreferences.voiceEnabled) {
        const textToSpeak = getSpokenSnippet(replyContent);
        speakText(textToSpeak, {
          rate: userPreferences.voiceSpeed || 1.02,
          pitch: userPreferences.voicePitch || 1.05,
          volume: 1.0,
          profile: userPreferences.voiceProfile || 'natural-warm',
        });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      let errorText =
        err?.message ||
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (typeof err === 'object' ? JSON.stringify(err) : 'Please check your connection.');

      if (!errorText || errorText === '[object Object]') {
        errorText = 'AGNI service notice. Please verify Vercel environment variables (GROQ_API_KEY).';
      }

      try {
        const jsonMatch = errorText.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error) {
            errorText = typeof parsed.error === 'string' ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error));
          }
        }
      } catch {}

      if (
        errorText.includes('503') ||
        errorText.includes('high demand') ||
        errorText.includes('UNAVAILABLE') ||
        errorText.includes('<!doctype') ||
        errorText.includes('Unexpected token')
      ) {
        errorText = 'The AGNI AI service is momentarily reconnecting or experiencing high demand. Please click Retry in a moment.';
      }

      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'model',
        text: `⚠️ API Error - Check Groq Key in Vercel. ${errorText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRetryLastMessage = async () => {
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) return;
    const realIndex = messages.length - 1 - lastUserIndex;

    const trimmed = messages.slice(0, realIndex + 1);
    setMessages(trimmed);
    setIsChatLoading(true);

    try {
      const data = await apiFetch<{ text?: string; reply?: string; suggestedMemories?: string[] }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: trimmed.map((m) => ({ role: m.role, text: m.text })),
          userPreferences,
          memories: memories.map((m) => m.content),
          authUser: authUser
            ? {
                name: authUser.name,
                email: authUser.email,
                isFounder: authUser.isFounder,
              }
            : undefined,
        }),
      });

      const replyContent = data.text || data.reply || 'Vanakkam! I received your message.';
      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);

      if (userPreferences.voiceEnabled) {
        const textToSpeak = getSpokenSnippet(replyContent);
        speakText(textToSpeak, {
          rate: userPreferences.voiceSpeed || 1.02,
          pitch: userPreferences.voicePitch || 1.05,
          volume: 1.0,
          profile: userPreferences.voiceProfile || 'natural-warm',
        });
      }
    } catch (err: any) {
      console.error('Chat retry error:', err);
      let errorText =
        err?.message ||
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        (typeof err === 'object' ? JSON.stringify(err) : 'Please check your connection.');

      if (!errorText || errorText === '[object Object]') {
        errorText = 'AGNI service notice. Please verify Vercel environment variables (GROQ_API_KEY).';
      }

      try {
        const jsonMatch = errorText.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error) {
            errorText = typeof parsed.error === 'string' ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error));
          }
        }
      } catch {}

      if (
        errorText.includes('503') ||
        errorText.includes('high demand') ||
        errorText.includes('UNAVAILABLE') ||
        errorText.includes('<!doctype') ||
        errorText.includes('Unexpected token')
      ) {
        errorText = 'The AGNI AI service is momentarily reconnecting or experiencing high demand. Please click Retry in a moment.';
      }

      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: 'model',
        text: `⚠️ API Error - Check Groq Key in Vercel. ${errorText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Memory Handlers
  const handleAddMemory = (content: string, category: 'preference' | 'study' | 'personal' | 'goal') => {
    const newMem: StoredMemory = {
      id: `mem-${Date.now()}`,
      content,
      category,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearMemories = () => {
    setMemories([]);
  };

  // Reminder Handlers
  const handleAddReminder = (title: string, time: string, category: 'study' | 'homework' | 'general') => {
    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      title,
      time,
      completed: false,
      category,
    };
    setReminders((prev) => [newRem, ...prev]);
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSendVoiceQuery = async (text: string): Promise<string | null> => {
    try {
      const data = await apiFetch<{ text: string; suggestedMemories?: string[] }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', text }],
          userPreferences,
          memories: memories.map((m) => m.content),
        }),
      });
      return data.text || null;
    } catch (e) {
      console.error('Voice query error:', e);
      return null;
    }
  };

  // Per-User Authentication Wall:
  // On fresh devices, other phones, or incognito (empty localStorage), or /login path,
  // immediately render LoginPage to protect Founder privacy and prevent token leak.
  const hasStoredEmail = typeof window !== 'undefined' && Boolean(
    localStorage.getItem('user_email') || localStorage.getItem('agni_user_email')
  );

  if ((!authUser && !hasStoredEmail) || currentPath === '/login') {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setCurrentPath('/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 transition-colors flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        userPreferences={userPreferences}
        onUpdatePreferences={handleUpdatePreferences}
        onTabSelect={handleSelectTab}
        backendOnline={backendOnline}
        authUser={authUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        canGoBack={activeTab !== 'home' || tabHistory.length > 1}
        onGoBack={handleGoBack}
        isSpeaking={isAiSpeaking}
        onStopSpeaking={handleStopSpeaking}
        onOpenTerms={() => handleOpenTerms('terms')}
        onOpenFounderAccess={handleOpenFounderAccess}
      />
      <AccountMenu
        authUser={authUser}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Global Broadcast Announcement Banner (Controlled from Founder Dashboard) */}
      {broadcast && broadcast.active && broadcast.message && (
        <div
          id="founder-global-broadcast-banner"
          className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md relative z-30 animate-in slide-in-from-top duration-300 border-b border-orange-400/30"
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1 overflow-hidden">
            <span className="text-base select-none shrink-0">Ã°Å¸â€˜â€˜</span>
            <span className="font-bold tracking-wide uppercase text-[10px] sm:text-xs bg-black/25 px-2 py-0.5 rounded-full border border-white/20 shrink-0">
              Founder Broadcast
            </span>
            <p className="truncate text-white/95 font-medium">{broadcast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setBroadcast((prev) => prev ? { ...prev, active: false } : null)}
            className="text-white/80 hover:text-white p-1 rounded-md text-xs cursor-pointer ml-2 shrink-0"
            title="Dismiss Announcement"
          >
            Ã¢Å“â€¢
          </button>
        </div>
      )}

      {/* Navigation Sub-header / Pill Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        canGoBack={activeTab !== 'home' || tabHistory.length > 1}
        onGoBack={handleGoBack}
      />

      {/* Offline Mode Active Banner (Moved to Settings) */}

      {/* Main Content Area */}
      <main className={activeTab === 'chat' || activeTab === 'heart_care' ? 'flex-1 flex flex-col min-h-0' : activeTab === 'canvas' ? 'flex-1 flex flex-col min-h-[700px]' : 'flex-1 pb-10'}>
        <Suspense fallback={<ViewLoadingSkeleton />}>
        {activeTab === 'home' && (
          <HomeHub
            userPreferences={userPreferences}
            onSelectTab={handleSelectTab}
            onQuickPrompt={handleQuickPrompt}
            recentHistoryCount={messages.length}
            onOpenSiri={() => {
              openVoiceBoxSafely(false);
            }}
            onOpenTerms={handleOpenTerms}
            onUpdatePreferences={handleUpdatePreferences}
            authUser={authUser}
            onOpenFounderAccess={handleOpenFounderAccess}
            customFounderBio={customFounderBio}
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={setIsOfflineMode}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            onRetryLastMessage={handleRetryLastMessage}
            onClearMessages={() => setMessages([])}
            isLoading={isChatLoading}
            userPreferences={userPreferences}
            memories={memories}
            initialInput={initialChatInput}
            onClearInitialInput={() => setInitialChatInput('')}
            sessions={chatSessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onCreateNewSession={handleCreateNewSession}
            onDeleteSession={handleDeleteSession}
            onClearAllSessions={handleClearAllSessions}
            authUser={authUser}
          />
        )}

        {activeTab === 'heart_care' && (
          <HeartCareChatView
            messages={
              (heartCareSessions.find((s) => s.id === activeHeartCareSessionId) || heartCareSessions[0])?.messages || []
            }
            onSendMessage={handleSendHeartCareMessage}
            onClearMessages={() => setHeartCareMessages([])}
            isLoading={isHeartCareLoading}
            userPreferences={userPreferences}
            initialInput={initialHeartCareInput}
            onClearInitialInput={() => setInitialHeartCareInput('')}
            sessions={heartCareSessions}
            activeSessionId={activeHeartCareSessionId}
            onSelectSession={(id) => {
              stopSpeaking();
              setActiveHeartCareSessionId(id);
            }}
            onCreateNewSession={handleCreateNewHeartCareSession}
            onDeleteSession={handleDeleteHeartCareSession}
            onClearAllSessions={handleClearAllHeartCareSessions}
            onDeleteMessage={(messageId) =>
              setHeartCareMessages((prev) => prev.filter((m) => m.id !== messageId))
            }
            onSwitchToNormalChat={() => setActiveTab('chat')}
            authUser={authUser}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceChatView
            userPreferences={userPreferences}
            onUpdatePreferences={handleUpdatePreferences}
            onTransferToChat={(userText) => {
              handleQuickPrompt('chat', userText);
            }}
            authUser={authUser}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            userPreferences={userPreferences}
            onUpdatePreferences={handleUpdatePreferences}
            authUser={authUser}
            onOpenTerms={handleOpenTerms}
            onOpenFounderAccess={handleOpenFounderAccess}
            onOpenHardwareTriggerModal={() => setIsHardwareModalOpen(true)}
            onNavigateTab={handleSelectTab}
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={setIsOfflineMode}
          />
        )}

        {activeTab === 'vision' && <VisionView />}

        {activeTab === 'canvas' && (
          <AgniCanvas
            onExplainWithVoice={(text) => handleQuickPrompt('chat', text)}
          />
        )}

        {activeTab === 'jarvis' && <JarvisView />}

        {activeTab === 'life_os' && (
          <SmartLifeOS
            authUser={authUser}
            userName={userPreferences.userName || authUser?.name}
            onNavigateTab={handleSelectTab}
          />
        )}

        {activeTab === 'learn' && (
          <LearnView
            userPreferences={userPreferences}
            initialTopic={initialLearnTopic}
            onClearInitialTopic={() => setInitialLearnTopic('')}
          />
        )}

        {activeTab === 'bot' && <WhatsAppBotView />}

        {activeTab === 'offline' && (
          <OfflineLiteView
            isOfflineMode={isOfflineMode}
            onToggleOfflineMode={setIsOfflineMode}
            savedSessions={chatSessions}
            onOpenSession={(id) => {
              handleSelectSession(id);
              setActiveTab('chat');
            }}
          />
        )}

        {activeTab === 'documents' && <DocumentsView />}

        {activeTab === 'search' && <SearchView />}

        {activeTab === 'actions' && (
          <AssistantActionsView
            reminders={reminders}
            onAddReminder={handleAddReminder}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={handleDeleteReminder}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryView
            userPreferences={userPreferences}
            onUpdatePreferences={handleUpdatePreferences}
            memories={memories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            onClearMemories={handleClearMemories}
          />
        )}
        {activeTab === 'doubt_battle' && <DoubtBattleView />}

        {activeTab === 'tn_board' && <TNBoardMode />}

        {activeTab === 'my_voice' && <MyVoiceView />}

        {activeTab === 'parent_dashboard' && <ParentDashboardView />}
        {activeTab === 'founder_analytics' && <FounderAnalyticsView />}
        {activeTab === 'founder_panel' && (
          <FounderAccessView
            authUser={authUser}
            onBack={() => setActiveTab('home')}
          />
        )}

        <ExamPredictorModal
          isOpen={isExamPredictorOpen}
          onClose={() => setIsExamPredictorOpen(false)}
        />
              </Suspense>
      </main>

      {/* Global Floating AI Speaking Interrupt Bar */}
      {isAiSpeaking && (
        <div
          id="global-stop-speaking-pill"
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-neutral-950/95 text-white pl-4 pr-2.5 py-2 shadow-2xl shadow-red-950/60 border border-red-500/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-neutral-200">
              AGNI is speaking
            </span>
          </div>
          <div className="h-4 w-px bg-neutral-800" />
          <button
            id="global-stop-speaking-action-btn"
            type="button"
            onClick={handleStopSpeaking}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold shadow-md shadow-red-600/40 transition-all cursor-pointer animate-pulse"
            title="Stop AI Speaking immediately"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop Speaking</span>
          </button>
        </div>
      )}

      {/* Platform Footer with Terms & Policy and Founder Attribution */}
      <footer className="w-full border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 py-6 px-4 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pr-16 sm:pr-24">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">AGNI AI</span>
            <span>Ã¢â‚¬Â¢</span>
            <span className="text-orange-600 dark:text-orange-400 font-semibold">Made in India</span>
            <span>Ã¢â‚¬Â¢</span>
            <span>Conceived &amp; Developed by Founders <strong>M. Sanjay &amp; T. Hasini</strong></span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => handleOpenTerms('terms')}
              className="hover:text-orange-500 underline underline-offset-2 transition cursor-pointer"
            >
              Terms of Service
            </button>
            <span>Ã¢â‚¬Â¢</span>
            <button
              type="button"
              onClick={() => handleOpenTerms('privacy')}
              className="hover:text-orange-500 underline underline-offset-2 transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>Ã¢â‚¬Â¢</span>
            <button
              type="button"
              onClick={() => handleOpenTerms('student')}
              className="hover:text-orange-500 underline underline-offset-2 transition cursor-pointer"
            >
              Student Safety
            </button>
            <span>Ã¢â‚¬Â¢</span>
            <button
              type="button"
              onClick={() => handleOpenTerms('about')}
              className="hover:text-orange-500 underline underline-offset-2 transition cursor-pointer"
            >
              Founders M. Sanjay &amp; T. Hasini
            </button>
          </div>
        </div>
      </footer>

      {/* Global Glowing Voice FAB (Tap or Hold 1s to launch AGNI Voice Box) */}
      <VoiceTriggerFab
        isOpen={isSiriOpen}
        onTrigger={() => {
          openVoiceBoxSafely(false);
        }}
      />

      {/* AGNI Voice Box Ã¢â‚¬â€ Neural Voice Companion */}
      <SiriVoiceOverlay
        isOpen={isSiriOpen}
        isExpanded={isSiriExpanded}
        onToggleExpand={(val) => setIsSiriExpanded(val)}
        onClose={() => setIsSiriOpen(false)}
        onTransferToChat={handleTransferSiriToChat}
        userPreferences={userPreferences}
        onUpdatePreferences={handleUpdatePreferences}
        memories={memories.map((m) => m.content)}
        onOpenTerms={() => handleOpenTerms('terms')}
        onNavigateTab={handleSelectTab}
        authUser={authUser}
        onUpdateLanguage={(lang) => {
          handleUpdatePreferences({ language: lang });
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={authUser}
        onLogout={handleLogout}
        onOpenTerms={() => handleOpenTerms('terms')}
      />

      {/* AGNI Terms & Policy Modal */}
      <TermsPolicyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        initialTab={termsInitialTab}
        authUser={authUser}
        onOpenFounderAccess={handleOpenFounderAccess}
        customFounderBio={customFounderBio}
      />

      {/* Secret Founder Access & Control Dashboard */}
      <FounderAccessModal
        isOpen={isFounderAccessOpen}
        onClose={() => setIsFounderAccessOpen(false)}
        authUser={authUser}
        onUpdateBio={handleUpdateBio}
        currentBio={customFounderBio}
        coFounders={coFounders}
        onAddCoFounder={handleAddCoFounder}
        onRemoveCoFounder={handleRemoveCoFounder}
      />

      {/* Android Hardware Trigger Permissions & Setup Modal */}
      <AndroidHardwareTriggerModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        onTriggerVoice={() => openVoiceBoxSafely(false)}
      />

      {/* Android PWA Chrome Install Prompt Banner */}
      <AndroidInstallPrompt
        onInstallSuccess={() => setIsOfflineMode(false)}
        onOpenOffline={() => handleSelectTab('offline')}
      />

      {/* Siri-like Hardware Hold Countdown Overlay (Vol Up + Power 1.5s) */}
      {isHardwareHolding && (
        <div
          id="hardware-trigger-countdown-overlay"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none animate-in fade-in duration-100"
        >
          <div className="relative flex h-36 w-36 items-center justify-center">
            {/* Glowing Aura Rings */}
            <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-orange-600/40 via-amber-500/30 to-red-500/40 blur-lg animate-spin" />

            {/* Circular Progress Gauge */}
            <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-white/15"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-orange-500 transition-all duration-75"
                strokeWidth="6"
                strokeDasharray="264"
                strokeDashoffset={264 - 264 * hardwareHoldProgress}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Central Siri Orb Flame Icon */}
            <div className="flex flex-col items-center justify-center">
              <Flame className="h-12 w-12 text-orange-400 animate-pulse drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
              <span className="text-[10px] font-black tracking-widest text-white uppercase mt-1">
                AGNI
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center gap-1">
            <div className="rounded-full bg-neutral-900/90 border border-orange-500/40 px-5 py-2 text-xs font-bold text-white shadow-xl shadow-orange-950/50 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
              <span>Holding Vol Up + Power: {(hardwareHoldProgress * 1.5).toFixed(1)}s / 1.5s</span>
            </div>
            <p className="text-[11px] text-neutral-300 font-medium tracking-wide">
              Hold for 1.5s to wake AGNI Voice Assistant
            </p>
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
}
