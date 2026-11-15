import React, { useState, useEffect } from 'react';
import {
  Lock,
  Shield,
  Crown,
  Users,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
  Send,
  Megaphone,
  Star,
  Trash2,
  Key,
  Info,
  Sparkles,
  UserPlus,
  Terminal,
  Edit3,
  RotateCcw,
  Check,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  LogOut,
  AlertCircle,
  HelpCircle,
  Bot,
} from 'lucide-react';
import { AuthUser, CoFounder, FounderBroadcast, FounderFeedback } from '../types';
import { GOLD_FOUNDERS, FOUNDER_NAMES, getFounderName } from '../lib/auth';
import {
  loadCofoundersList,
  addCofounderEmail,
  removeCofounderEmail,
  isCofounderEmail,
  isFounderVerified,
  setFounderVerified,
  isCoFounderVerified,
  setCoFounderVerified,
  getFounderLockStatus,
  recordFailedFounderAttempt,
  resetFounderAttempts,
} from '../utils/security';

interface FounderAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: AuthUser | null;
  onUpdateBio?: (newBio: string) => void;
  currentBio?: string;
  coFounders?: CoFounder[];
  onAddCoFounder?: (coFounder: CoFounder) => void;
  onRemoveCoFounder?: (email: string) => void;
  onDeleteAppData?: () => void;
}

const DEFAULT_FOUNDER_BIO = `M. Sanjay & T. Hasini are the founders of AGNI. They founded AGNI to solve day-to-day life problems faced by people. Their vision is Project AGNI - Made in India, To Serve the World - a unified multimodal personal AI assistant that can explain concepts step-by-step, analyze diagrams, fetch live discoveries, and organize tasks, just like a true human friend. They believe AI should be helpful, humble, and human.`;

// Default realistic student queries for Co-Founder Chat Manager
interface StudentQuery {
  id: string;
  studentName: string;
  studentEmail: string;
  timestamp: string;
  category: string;
  queryText: string;
  status: 'pending' | 'resolved';
  helperReply?: string;
  repliedBy?: string;
  repliedAt?: string;
}

const INITIAL_STUDENT_QUERIES: StudentQuery[] = [
  {
    id: 'query-1',
    studentName: 'Arjun K. (Class 12)',
    studentEmail: 'arjun.cbse12@gmail.com',
    timestamp: '10 mins ago',
    category: 'Physics',
    queryText: 'How to derive the velocity equation in projectile motion when launch angle is 45 degrees? Can AGNI show step-by-step calculation?',
    status: 'pending',
  },
  {
    id: 'query-2',
    studentName: 'Meera S.',
    studentEmail: 'meera.student@gmail.com',
    timestamp: '25 mins ago',
    category: 'Heart & Mind',
    queryText: 'I feel very stressed and overwhelmed about my upcoming college entrance exam next week. Can you guide me on how to stay calm?',
    status: 'pending',
  },
  {
    id: 'query-3',
    studentName: 'Karthik R.',
    studentEmail: 'karthik.hyderabad@gmail.com',
    timestamp: '1 hour ago',
    category: 'Language / Tunglish',
    queryText: 'Can AGNI explain how transformers in deep learning work using a simple Telugu-English (Tunglish) real-world analogy?',
    status: 'resolved',
    helperReply: 'Explained using an orchestra analogy: Self-attention calculates how all instruments harmonize with each other.',
    repliedBy: 'Co-Founder Support',
    repliedAt: '45 mins ago',
  },
  {
    id: 'query-4',
    studentName: 'Ramu V. (Rural Study)',
    studentEmail: 'ramu.ruraledu@gmail.com',
    timestamp: '2 hours ago',
    category: 'Offline / Zero Internet',
    queryText: 'Can I download the NCERT science voice notes while connected at town and listen without any internet in my village?',
    status: 'resolved',
    helperReply: 'Yes! Tap the download icon on any voice note or switch to "Zero-Internet Offline Study" mode in AGNI.',
    repliedBy: 'M. Sanjay',
    repliedAt: '1 hour ago',
  },
];

export const FounderAccessModal: React.FC<FounderAccessModalProps> = ({
  isOpen,
  onClose,
  authUser,
  onUpdateBio,
  currentBio = DEFAULT_FOUNDER_BIO,
  coFounders = [],
  onAddCoFounder,
  onRemoveCoFounder,
  onDeleteAppData,
}) => {
  const userEmail = (authUser?.email || '').toLowerCase().trim();
  const isGold = GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(userEmail) || authUser?.isFounder === true;
  const currentFounderName = getFounderName(userEmail);
  const isSilver = !isGold && (authUser?.isCoFounder === true || isCofounderEmail(userEmail));

  // Verification state (remembered on this device via localStorage)
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    if (isGold) return isFounderVerified();
    if (isSilver) return isCoFounderVerified();
    return false;
  });

  // Lockout state (10-minute lockout on wrong code - Requirement 3)
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState<number>(() => {
    const status = getFounderLockStatus();
    return status.isLocked ? status.remainingSeconds : 0;
  });

  useEffect(() => {
    if (lockRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      const status = getFounderLockStatus();
      if (status.isLocked) {
        setLockRemainingSeconds(status.remainingSeconds);
      } else {
        setLockRemainingSeconds(0);
        setVerifyError(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockRemainingSeconds]);

  // Passcode verification input state
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(() => {
    const status = getFounderLockStatus();
    if (status.isLocked) {
      return `Access Denied: Locked for 10 minutes (${Math.floor(status.remainingSeconds / 60)}m ${status.remainingSeconds % 60}s remaining)`;
    }
    return null;
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // Active Tab: Gold has full tabs, Silver has limited tabs (stats, chats, beta, test_ai)
  const [goldTab, setGoldTab] = useState<'stats' | 'cofounders' | 'publish' | 'danger'>('stats');
  const [silverTab, setSilverTab] = useState<'stats' | 'chats' | 'beta' | 'test_ai'>('stats');

  // Test AI Responses State (Silver Feature D)
  const [testPrompt, setTestPrompt] = useState('Who is the founder of AGNI?');
  const [testLanguage, setTestLanguage] = useState('English');
  const [testAiResponse, setTestAiResponse] = useState<string | null>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testAiLatency, setTestAiLatency] = useState<number | null>(null);

  // Co-Founders list (stored in agni_cofounders = ["email1@gmail.com", ...])
  const [cofounderEmails, setCofounderEmails] = useState<string[]>(() => loadCofoundersList());
  const [newCofounderInput, setNewCofounderInput] = useState('');
  const [addCofounderSuccess, setAddCofounderSuccess] = useState<string | null>(null);
  const [addCofounderError, setAddCofounderError] = useState<string | null>(null);

  // Stats & Dashboard
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    totalChats: 156,
    totalUsers: 34,
    appHealth: '99.98% Operational (All AI Engines Healthy)',
    modelFallbackCount: 2,
    uptime: 'Continuous 24/7 Cloud Run',
    engine: 'AGNI Neural Core v3.8',
  });
  const [feedbacks, setFeedbacks] = useState<FounderFeedback[]>([]);

  // Founder Bio Edit State (Gold Only)
  const [bioInput, setBioInput] = useState(currentBio);
  const [bioSavedNotice, setBioSavedNotice] = useState(false);

  // Broadcast Message State (Gold Only)
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastActive, setBroadcastActive] = useState(true);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);

  // Student Chat / Query Management State (Silver Feature)
  const [studentQueries, setStudentQueries] = useState<StudentQuery[]>(() => {
    try {
      const saved = localStorage.getItem('agni_student_queries');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STUDENT_QUERIES;
  });
  const [querySearchTerm, setQuerySearchTerm] = useState('');
  const [queryFilterStatus, setQueryFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [activeReplyingQueryId, setActiveReplyingQueryId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState('');
  const [replySuccessBanner, setReplySuccessBanner] = useState<string | null>(null);

  // Beta Feature Testing Toggles (Silver & Gold Feature)
  const [betaFeatures, setBetaFeatures] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('agni_beta_features');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      tunglish_v2: true,
      audio_snippets: true,
      heart_prompts: true,
      vision_fast_ocr: false,
      rural_adaptive_stream: true,
    };
  });

  // Delete App Confirmation Modal State (Gold Only)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state when modal opens or verification changes
  useEffect(() => {
    if (isOpen) {
      setCofounderEmails(loadCofoundersList());
      const verified = isGold ? isFounderVerified() : isSilver ? isCoFounderVerified() : false;
      setIsVerified(verified);
      setVerifyError(null);
      setSecretCodeInput('');
      setBioInput(currentBio);
      fetchDashboardData();
    }
  }, [isOpen, isGold, isSilver, currentBio]);

  // Save student queries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('agni_student_queries', JSON.stringify(studentQueries));
    } catch {}
  }, [studentQueries]);

  // Save beta features to localStorage
  const handleToggleBetaFeature = (featureKey: string) => {
    setBetaFeatures((prev) => {
      const updated = { ...prev, [featureKey]: !prev[featureKey] };
      try {
        localStorage.setItem('agni_beta_features', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Fetch server stats
  const fetchDashboardData = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`/api/founder/dashboard?email=${encodeURIComponent(userEmail)}`, {
        headers: { 'x-user-email': userEmail },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (data.broadcast) {
          setBroadcastText(data.broadcast.message || '');
          setBroadcastActive(data.broadcast.active ?? true);
        }
        if (data.feedbacks) setFeedbacks(data.feedbacks);
      }
    } catch (e) {
      console.warn('Dashboard fetch fallback to local:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle Verify Secret Code (Requirement 3)
  const handleVerifySecret = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerifyError(null);

    // Check existing lockout
    const lockStatus = getFounderLockStatus();
    if (lockStatus.isLocked) {
      setLockRemainingSeconds(lockStatus.remainingSeconds);
      setVerifyError(`Access Denied: Locked for 10 minutes (${Math.floor(lockStatus.remainingSeconds / 60)}m ${lockStatus.remainingSeconds % 60}s remaining)`);
      return;
    }

    const cleanSecret = secretCodeInput.trim();

    if (!cleanSecret) {
      setVerifyError('Please enter the secret code.');
      return;
    }

    setIsVerifying(true);

    try {
      // 1. Try server verification first
      const res = await fetch('/api/founder/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: cleanSecret,
          email: userEmail,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        // Correct secret verified by server
        resetFounderAttempts();
        setLockRemainingSeconds(0);
        unlockAccess();
        return;
      }

      // Server returned 429 lockout or 401 failure
      if (res.status === 429 || data?.isLocked) {
        const fail = recordFailedFounderAttempt();
        setLockRemainingSeconds(fail.remainingSeconds);
        setVerifyError('Access Denied: Locked for 10 minutes.');
        return;
      }

      // 2. Client-side fallback check (case-sensitive) with exact secret: qprwqwertyuio, AGNI_FOUNDER_SANJAY_2026, qprwqwer
      const metaEnv = typeof (import.meta as any) !== 'undefined' ? (import.meta as any).env : null;
      const expectedSecret =
        (metaEnv && (metaEnv.VITE_FOUNDER_SECRET_CODE || metaEnv.VITE_NEXT_PUBLIC_FOUNDER_SECRET_CODE)) ||
        'qprwqwertyuio';
      const isSecretValid =
        cleanSecret === 'qprwqwertyuio' ||
        cleanSecret === 'qprwqwer' ||
        cleanSecret === 'AGNI_FOUNDER_SANJAY_2026' ||
        cleanSecret === expectedSecret;

      if (isSecretValid) {
        resetFounderAttempts();
        setLockRemainingSeconds(0);
        unlockAccess();
        return;
      }

      // Wrong code: "Access Denied" + lock for 10 minutes (Requirement 3)
      const fail = recordFailedFounderAttempt();
      setLockRemainingSeconds(fail.remainingSeconds);
      setVerifyError('Access Denied');
    } catch (err) {
      // Network/offline fallback check
      const metaEnv = typeof (import.meta as any) !== 'undefined' ? (import.meta as any).env : null;
      const expectedSecret =
        (metaEnv && (metaEnv.VITE_FOUNDER_SECRET_CODE || metaEnv.VITE_NEXT_PUBLIC_FOUNDER_SECRET_CODE)) ||
        'qprwqwertyuio';
      const isSecretValid =
        cleanSecret === 'qprwqwertyuio' ||
        cleanSecret === 'qprwqwer' ||
        cleanSecret === 'AGNI_FOUNDER_SANJAY_2026' ||
        cleanSecret === expectedSecret;

      if (isSecretValid) {
        resetFounderAttempts();
        setLockRemainingSeconds(0);
        unlockAccess();
      } else {
        const fail = recordFailedFounderAttempt();
        setLockRemainingSeconds(fail.remainingSeconds);
        setVerifyError('Access Denied');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunAiTest = async () => {
    if (!testPrompt.trim() || isTestingAi) return;
    setIsTestingAi(true);
    setTestAiResponse(null);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', text: testPrompt.trim() }],
          userPreferences: { language: testLanguage },
          authUser: {
            email: userEmail,
            name: isSilver ? 'Co-Founder' : 'Founder Tester',
            isCoFounder: true,
          },
        }),
      });
      const data = await res.json();
      setTestAiLatency(Date.now() - startTime);
      if (data.text) {
        setTestAiResponse(data.text);
      } else {
        setTestAiResponse(data.error || 'Test completed with empty response.');
      }
    } catch (err: any) {
      setTestAiLatency(Date.now() - startTime);
      setTestAiResponse(`Network test error: ${err.message || 'Check server connection'}`);
    } finally {
      setIsTestingAi(false);
    }
  };

  const unlockAccess = () => {
    if (isGold) {
      setFounderVerified(true);
      localStorage.setItem('agni_founder_verified', 'true');
    } else if (isSilver) {
      setCoFounderVerified(true);
      localStorage.setItem('agni_cofounder_verified', 'true');
    }
    setIsVerified(true);
    setVerifyError(null);
    setSecretCodeInput('');
  };

  const handleLockSession = () => {
    if (isGold) {
      setFounderVerified(false);
      localStorage.removeItem('agni_founder_verified');
    } else {
      setCoFounderVerified(false);
      localStorage.removeItem('agni_cofounder_verified');
    }
    setIsVerified(false);
    setSecretCodeInput('');
  };

  // Gold: Add Co-Founder (Requirement 4)
  const handleAddCoFounderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddCofounderSuccess(null);
    setAddCofounderError(null);

    const cleanEmail = newCofounderInput.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAddCofounderError('Please enter a valid email address.');
      return;
    }

    if (GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(cleanEmail)) {
      setAddCofounderError(`${cleanEmail} is already a Primary Gold Founder!`);
      return;
    }

    if (cofounderEmails.includes(cleanEmail)) {
      setAddCofounderError(`${cleanEmail} is already in the Co-Founders list.`);
      return;
    }

    const updated = addCofounderEmail(cleanEmail);
    setCofounderEmails(updated);
    setNewCofounderInput('');
    setAddCofounderSuccess(`🎉 Co-Founder added! ${cleanEmail} now has Silver Access.`);

    // Also call prop if provided for backward compatibility
    onAddCoFounder?.({
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      addedAt: new Date().toLocaleDateString(),
      appointedBy: getFounderName(userEmail),
    });

    setTimeout(() => setAddCofounderSuccess(null), 4000);
  };

  // Gold: Remove Co-Founder (Requirement 4)
  const handleRemoveCoFounderClick = (email: string) => {
    const updated = removeCofounderEmail(email);
    setCofounderEmails(updated);
    onRemoveCoFounder?.(email);
  };

  // Gold: Save Bio
  const handleSaveBio = () => {
    if (!bioInput.trim()) return;
    localStorage.setItem('agni_custom_founder_bio', bioInput.trim());
    onUpdateBio?.(bioInput.trim());
    setBioSavedNotice(true);
    setTimeout(() => setBioSavedNotice(false), 3000);
  };

  const handleResetBio = () => {
    setBioInput(DEFAULT_FOUNDER_BIO);
    localStorage.removeItem('agni_custom_founder_bio');
    onUpdateBio?.(DEFAULT_FOUNDER_BIO);
    setBioSavedNotice(true);
    setTimeout(() => setBioSavedNotice(false), 3000);
  };

  // Gold: Publish Broadcast
  const handlePublishBroadcast = async () => {
    setBroadcastSending(true);
    setBroadcastNotice(null);
    try {
      const res = await fetch('/api/founder/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: broadcastText.trim(),
          active: broadcastActive,
          email: userEmail,
        }),
      });
      if (res.ok) {
        setBroadcastNotice('Broadcast announcement updated live!');
        setTimeout(() => setBroadcastNotice(null), 3500);
      }
    } catch {
      setBroadcastNotice('Broadcast updated in local session.');
    } finally {
      setBroadcastSending(false);
    }
  };

  // Gold: Delete App & Reset Cache (Requirement 4)
  const handleExecuteDeleteApp = () => {
    setShowDeleteConfirm(false);
    onDeleteAppData?.();
    // Clear local non-founder caches
    const preservedCofounders = loadCofoundersList();
    localStorage.clear();
    // Restore cofounders list
    localStorage.setItem('agni_cofounders', JSON.stringify(preservedCofounders));
    window.location.reload();
  };

  // Silver: Submit reply to student query (Requirement 5.b)
  const handleSubmitHelperReply = (queryId: string) => {
    if (!replyInputText.trim()) return;
    setStudentQueries((prev) =>
      prev.map((q) => {
        if (q.id === queryId) {
          return {
            ...q,
            status: 'resolved',
            helperReply: replyInputText.trim(),
            repliedBy: authUser?.name || 'Co-Founder',
            repliedAt: 'Just now',
          };
        }
        return q;
      })
    );
    setReplyInputText('');
    setActiveReplyingQueryId(null);
    setReplySuccessBanner('✅ Helper reply recorded successfully for student!');
    setTimeout(() => setReplySuccessBanner(null), 3000);
  };

  if (!isOpen) return null;

  // Filtered student queries for chat management
  const filteredQueries = studentQueries.filter((q) => {
    const matchesSearch =
      q.studentName.toLowerCase().includes(querySearchTerm.toLowerCase()) ||
      q.queryText.toLowerCase().includes(querySearchTerm.toLowerCase()) ||
      q.category.toLowerCase().includes(querySearchTerm.toLowerCase());
    const matchesStatus =
      queryFilterStatus === 'all' || q.status === queryFilterStatus;
    return matchesSearch && matchesStatus;
  });

  // =========================================================================
  // VIEW 1: POPUP - "ENTER FOUNDER SECRET CODE" (Requirement 3)
  // =========================================================================
  if (!isVerified) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-3xl border border-orange-500/40 bg-neutral-950/95 p-6 sm:p-7 shadow-2xl shadow-orange-950/70 text-white backdrop-blur-2xl text-center overflow-hidden">
          {/* Top glowing orange accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/30 border border-orange-400/50">
            <Lock className="h-8 w-8 animate-pulse" />
          </div>

          <h2 className="mt-4 font-display text-xl font-extrabold tracking-tight text-white">
            Enter Founder Secret Code
          </h2>

          <p className="mt-1.5 text-xs text-neutral-300 leading-relaxed max-w-xs mx-auto">
            {isGold ? (
              <>Welcome Founder <strong className="text-amber-300">{currentFounderName} 👑</strong> Enter your confidential founder passcode to unlock full system controls.</>
            ) : isSilver ? (
              <>Welcome <strong className="text-slate-200">Co-Founder 🥈</strong> Enter the security passcode to unlock your Silver operational panel.</>
            ) : (
              <>Security Verification • Authorized Access Only</>
            )}
          </p>

          <form onSubmit={handleVerifySecret} className="mt-5 space-y-3.5 text-left">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Secret Passcode:
                </label>
                {lockRemainingSeconds > 0 && (
                  <span className="text-[11px] font-bold text-rose-400">
                    Locked ({Math.floor(lockRemainingSeconds / 60)}m {lockRemainingSeconds % 60}s)
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  id="founder-secret-passcode-input"
                  autoFocus
                  disabled={isVerifying || lockRemainingSeconds > 0}
                  value={secretCodeInput}
                  onChange={(e) => {
                    setSecretCodeInput(e.target.value);
                    if (verifyError && lockRemainingSeconds <= 0) setVerifyError(null);
                  }}
                  placeholder={lockRemainingSeconds > 0 ? "Locked for 10 minutes..." : "Enter secret code..."}
                  className="w-full rounded-xl border border-white/15 bg-neutral-900/90 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Error Message: "Access Denied" (Requirement 3) */}
            {(verifyError || lockRemainingSeconds > 0) && (
              <div
                id="founder-verify-error-msg"
                className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs font-bold text-rose-300 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>
                  {lockRemainingSeconds > 0
                    ? `Access Denied: Locked for 10 minutes (${Math.floor(lockRemainingSeconds / 60)}m ${lockRemainingSeconds % 60}s remaining)`
                    : verifyError}
                </span>
              </div>
            )}

            <button
              type="submit"
              id="founder-verify-submit-button"
              disabled={isVerifying || lockRemainingSeconds > 0 || !secretCodeInput.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-orange-600/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : lockRemainingSeconds > 0 ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Locked ({Math.floor(lockRemainingSeconds / 60)}m {lockRemainingSeconds % 60}s)</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  <span>Verify Secret Code</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>AGNI v1.0 • Made in India, To Serve the World</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: GOLD PANEL (M. Sanjay Only) - FULL ACCESS (Requirement 4)
  // =========================================================================
  if (isGold) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl rounded-3xl border border-amber-500/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white shadow-2xl shadow-orange-950/60 overflow-hidden my-auto flex flex-col max-h-[92vh]">
          {/* Gold Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 shrink-0" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-neutral-900/70 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 border border-amber-400/40">
                <Crown className="h-6 w-6 text-yellow-200 fill-yellow-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Founder Control - {currentFounderName} 👑
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    FULL ACCESS
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                  <span>Verified: <strong className="text-white">{userEmail || 'Gold Founder'}</strong></span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-medium">Primary Creator Clearance</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLockSession}
                title="Lock session on this device"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lock Panel</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Gold Tabs */}
          <div className="flex items-center gap-1.5 px-5 sm:px-7 pt-3 border-b border-white/10 bg-neutral-950/40 overflow-x-auto scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setGoldTab('stats')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                goldTab === 'stats'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Overview &amp; All Stats</span>
            </button>

            <button
              type="button"
              onClick={() => setGoldTab('cofounders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                goldTab === 'cofounders'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Manage Co-Founders ({cofounderEmails.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setGoldTab('publish')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                goldTab === 'publish'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Megaphone className="h-4 w-4" />
              <span>Publish Controls &amp; Bio</span>
            </button>

            <button
              type="button"
              onClick={() => setGoldTab('danger')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                goldTab === 'danger'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/20'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Danger Zone</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
            {/* TAB 1: OVERVIEW & STATS */}
            {goldTab === 'stats' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                    <div className="flex items-center justify-between text-neutral-400 mb-1">
                      <span className="text-xs font-semibold uppercase">Total Users</span>
                      <Users className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalUsers}</div>
                    <p className="text-[11px] text-cyan-300 mt-0.5">Active accounts &amp; guests</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                    <div className="flex items-center justify-between text-neutral-400 mb-1">
                      <span className="text-xs font-semibold uppercase">Chats Today</span>
                      <MessageSquare className="h-4 w-4 text-orange-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalChats}</div>
                    <p className="text-[11px] text-orange-300 mt-0.5">Live student inquiries</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                    <div className="flex items-center justify-between text-neutral-400 mb-1">
                      <span className="text-xs font-semibold uppercase">App Health</span>
                      <Activity className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">99.98%</div>
                    <p className="text-[11px] text-emerald-300 mt-0.5">All AI engines healthy</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                    <div className="flex items-center justify-between text-neutral-400 mb-1">
                      <span className="text-xs font-semibold uppercase">Primary Engine</span>
                      <Sparkles className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-amber-300 truncate">{stats.engine}</div>
                    <p className="text-[11px] text-amber-200 mt-0.5">Auto-fallback enabled</p>
                  </div>
                </div>

                {/* System Specs Card */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-neutral-900 to-neutral-950 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-400" />
                      <span>AGNI System Architecture &bull; Full Founder Clearance</span>
                    </h3>
                    <button
                      type="button"
                      onClick={fetchDashboardData}
                      disabled={isLoadingStats}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-neutral-400 block mb-1">Uptime:</span>
                      <strong className="text-white font-mono">{stats.uptime}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-neutral-400 block mb-1">Founder Passcode Status:</span>
                      <strong className="text-emerald-400 font-mono">Protected (AGNI_FOUNDER_SECRET)</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-neutral-400 block mb-1">Active Co-Founders:</span>
                      <strong className="text-amber-300 font-mono">{cofounderEmails.length} Authorized</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MANAGE CO-FOUNDERS (Requirement 4) */}
            {goldTab === 'cofounders' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Add Co-Founder Form */}
                <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-neutral-900/70 to-neutral-950 p-5 space-y-4">
                  <div className="flex items-center gap-2.5 text-amber-300 text-sm font-bold">
                    <UserPlus className="h-4 w-4" />
                    <span>Add New Co-Founder (Silver Access)</span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    Enter the Gmail address of your partner. When they log in with this email, they will automatically receive the <strong>Silver Badge 🥈</strong> and access to the Co-Founder Panel.
                  </p>

                  {addCofounderSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{addCofounderSuccess}</span>
                    </div>
                  )}

                  {addCofounderError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{addCofounderError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddCoFounderSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="email"
                      id="add-cofounder-email-input"
                      value={newCofounderInput}
                      onChange={(e) => setNewCofounderInput(e.target.value)}
                      placeholder="Enter Co-Founder Gmail (e.g. partner@gmail.com)"
                      className="w-full sm:flex-1 rounded-xl border border-white/15 bg-neutral-950 px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      id="add-cofounder-submit-btn"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 transition cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Co-Founder</span>
                    </button>
                  </form>
                </div>

                {/* Co-Founders List with Remove Button */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <span>Active Co-Founders in agni_cofounders ({cofounderEmails.length})</span>
                    </h4>
                  </div>

                  {cofounderEmails.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-white/5 bg-neutral-950/60 text-center text-xs text-neutral-400 space-y-1">
                      <p className="font-semibold text-neutral-300">No Co-Founders Added Yet</p>
                      <p>Type a Gmail above and click &quot;Add Co-Founder&quot; to authorize a trusted partner.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cofounderEmails.map((email) => (
                        <div
                          key={email}
                          className="p-3.5 rounded-2xl border border-slate-700/80 bg-neutral-900/80 flex items-center justify-between gap-3 shadow-sm hover:border-slate-500 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-700 to-slate-500 text-white text-base shadow border border-slate-400/40">
                              🥈
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white font-mono">{email}</span>
                                <span className="rounded-full bg-slate-400/20 border border-slate-400/40 px-2 py-0.5 text-[9px] font-black text-slate-200">
                                  SILVER CO-FOUNDER
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                Granted by Founders M. Sanjay &amp; T. Hasini &bull; Limited Access Active
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveCoFounderClick(email)}
                            title={`Revoke ${email}`}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/60 text-rose-300 px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PUBLISH CONTROLS & BIO (Requirement 4) */}
            {goldTab === 'publish' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Global Broadcast Announcement */}
                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-orange-400" />
                        <span>Publish Global Broadcast Announcement</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        This announcement shows across the top of AGNI for all students and visitors.
                      </p>
                    </div>
                  </div>

                  {broadcastNotice && (
                    <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{broadcastNotice}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={broadcastText}
                      onChange={(e) => setBroadcastText(e.target.value)}
                      placeholder="e.g. Welcome to Project AGNI! High-speed AGNI 3.8 Neural Engine active."
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-2.5 text-xs text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastActive}
                        onChange={(e) => setBroadcastActive(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-900 text-orange-500 focus:ring-orange-500 h-4 w-4 cursor-pointer"
                      />
                      <span>Active Banner (Display publicly across the app)</span>
                    </label>

                    <button
                      type="button"
                      onClick={handlePublishBroadcast}
                      disabled={broadcastSending}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{broadcastSending ? 'Updating...' : 'Publish Banner'}</span>
                    </button>
                  </div>
                </div>

                {/* Edit Founder Bio */}
                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-amber-400" />
                        <span>Edit Founder Bio Statement</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Displayed on the Founder Card in Home Hub and referenced during conversations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetBio}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>

                  {bioSavedNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Founder Bio updated successfully!</span>
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 p-3.5 text-xs text-neutral-200 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 leading-relaxed font-sans"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-5 py-2 text-xs font-bold text-white shadow transition cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Save Founder Bio</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DANGER ZONE / CAN DELETE APP (Requirement 4) */}
            {goldTab === 'danger' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="rounded-2xl border border-rose-500/50 bg-rose-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>Danger Zone &bull; Primary Founder Actions</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    As Gold Founder, you have administrative control to reset application cache, clear local chat archives, and purge system states before APK export.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-900/40 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete App Data &amp; Reset System Cache</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-3 border-t border-white/10 bg-neutral-950/90 text-xs text-neutral-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Project AGNI &bull; Founded by M. Sanjay &amp; T. Hasini</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-1.5 font-semibold text-neutral-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Delete App Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl border border-rose-500/60 bg-neutral-950 p-6 text-center text-white shadow-2xl space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold">Reset Local App Data?</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                This will clear offline chat history, cached audio, and system preferences. Your appointed Co-Founders list will be preserved.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteApp}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow transition cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: SILVER PANEL (Co-Founders) - LIMITED ACCESS (Requirement 5)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-400/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white shadow-2xl shadow-slate-950/60 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Silver Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-400 via-neutral-200 to-slate-400 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-neutral-900/70 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-600 to-neutral-400 text-white shadow-lg shadow-slate-500/25 border border-slate-400/40">
              <Shield className="h-6 w-6 text-slate-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Co-Founder Panel 🥈 LIMITED
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase bg-slate-400/20 text-slate-200 border border-slate-400/40">
                  SILVER CLEARANCE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Verified Co-Founder: <strong className="text-white">{authUser?.email}</strong></span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] text-cyan-300 font-medium">Operational Access</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLockSession}
              title="Lock session on this device"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lock Panel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PROMINENT SILVER BANNER (Requirement 5 Banner) */}
        <div className="px-5 sm:px-7 pt-4 pb-1 shrink-0">
          <div className="rounded-2xl border border-slate-400/40 bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 p-3.5 sm:p-4 text-center shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl select-none">🥈</span>
              <h3 className="font-display font-extrabold text-slate-100 text-sm sm:text-base tracking-wide">
                Silver Access - Granted by Founders M. Sanjay &amp; T. Hasini
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 max-w-lg mx-auto leading-relaxed">
              Authorized Co-Founder Partner &bull; You have permission to inspect system health, manage student queries, and test experimental beta features.
            </p>
          </div>
        </div>

        {/* Silver Tabs */}
        <div className="flex items-center gap-1.5 px-5 sm:px-7 pt-3 border-b border-white/10 bg-neutral-950/40 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setSilverTab('stats')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              silverTab === 'stats'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/40 border border-slate-500'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>User &amp; System Stats (Read-Only)</span>
          </button>

          <button
            type="button"
            onClick={() => setSilverTab('chats')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              silverTab === 'chats'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/40 border border-slate-500'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-orange-400" />
            <span>Manage Chats &amp; Student Inquiries</span>
          </button>

          <button
            type="button"
            onClick={() => setSilverTab('beta')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              silverTab === 'beta'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/40 border border-slate-500'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Test New Features Toggle</span>
          </button>

          <button
            type="button"
            onClick={() => setSilverTab('test_ai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              silverTab === 'test_ai'
                ? 'bg-slate-700 text-white shadow-md shadow-slate-700/40 border border-slate-500'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="h-4 w-4 text-emerald-400" />
            <span>Test AI Responses</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* SILVER FEATURE A: VIEW USERS STATS (READ-ONLY) (Requirement 5.a) */}
          {silverTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Real-time Platform Statistics</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Read-only metrics synchronized with AGNI cloud service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchDashboardData}
                  disabled={isLoadingStats}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
                  <span>Refresh Metrics</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-xs font-semibold uppercase">Total Users</span>
                    <Users className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalUsers}</div>
                  <span className="text-[10px] text-cyan-300 block mt-0.5">Read-only view</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-xs font-semibold uppercase">Chats Today</span>
                    <MessageSquare className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalChats}</div>
                  <span className="text-[10px] text-orange-300 block mt-0.5">Read-only view</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-xs font-semibold uppercase">App Health</span>
                    <Activity className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">99.98%</div>
                  <span className="text-[10px] text-emerald-300 block mt-0.5">All engines optimal</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-xs font-semibold uppercase">AI Engine</span>
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-amber-300 truncate">{stats.engine}</div>
                  <span className="text-[10px] text-amber-200 block mt-0.5">Continuous uptime</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-neutral-900/60 p-4 text-xs text-slate-300 flex items-center gap-3">
                <Info className="h-5 w-5 text-cyan-400 shrink-0" />
                <p>
                  As an appointed Co-Founder, you have visibility into live user activity to assist with student support and monitor app responsiveness.
                </p>
              </div>
            </div>
          )}

          {/* SILVER FEATURE B: MANAGE CHATS & HELP STUDENTS REPLY (Requirement 5.b) */}
          {silverTab === 'chats' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-400" />
                    <span>Recent Student Queries &amp; Inquiries</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Help students by reviewing incoming questions and logging guidance replies.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                    <input
                      type="text"
                      value={querySearchTerm}
                      onChange={(e) => setQuerySearchTerm(e.target.value)}
                      placeholder="Search questions..."
                      className="rounded-xl border border-white/10 bg-neutral-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-slate-400 w-44"
                    />
                  </div>

                  <select
                    value={queryFilterStatus}
                    onChange={(e) => setQueryFilterStatus(e.target.value as any)}
                    className="rounded-xl border border-white/10 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-300 outline-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Answered</option>
                  </select>
                </div>
              </div>

              {replySuccessBanner && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{replySuccessBanner}</span>
                </div>
              )}

              <div className="space-y-3">
                {filteredQueries.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-white/5 bg-neutral-950/60 text-center text-xs text-neutral-400">
                    No matching student queries found.
                  </div>
                ) : (
                  filteredQueries.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-4 space-y-3 hover:border-slate-500 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{q.studentName}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">({q.studentEmail})</span>
                            <span className="rounded-md bg-orange-950/60 border border-orange-800/40 px-2 py-0.5 text-[9px] font-bold text-orange-300">
                              #{q.category}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-200 leading-relaxed font-sans bg-neutral-950/60 p-2.5 rounded-xl border border-white/5">
                            &quot;{q.queryText}&quot;
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              q.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {q.status === 'resolved' ? '✅ Answered' : '⏳ Pending'}
                          </span>
                          <span className="text-[10px] text-neutral-400 block mt-1">{q.timestamp}</span>
                        </div>
                      </div>

                      {/* Existing reply if present */}
                      {q.helperReply && (
                        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-600/40 text-xs text-slate-200">
                          <span className="font-bold text-slate-300 block text-[10px] uppercase mb-0.5">
                            Logged Helper Note (By {q.repliedBy || 'Co-Founder'} &bull; {q.repliedAt || 'Earlier'}):
                          </span>
                          <p className="leading-relaxed">{q.helperReply}</p>
                        </div>
                      )}

                      {/* Reply Form */}
                      {activeReplyingQueryId === q.id ? (
                        <div className="pt-2 space-y-2">
                          <textarea
                            rows={2}
                            value={replyInputText}
                            onChange={(e) => setReplyInputText(e.target.value)}
                            placeholder="Type a helpful explanation or note for this student..."
                            className="w-full rounded-xl border border-slate-500 bg-neutral-950 p-3 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReplyingQueryId(null);
                                setReplyInputText('');
                              }}
                              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmitHelperReply(q.id)}
                              className="flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 px-4 py-1.5 text-xs font-bold text-white shadow transition cursor-pointer"
                            >
                              <Send className="h-3 w-3" />
                              <span>Submit Helper Reply</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyingQueryId(q.id);
                              setReplyInputText(q.helperReply || '');
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                          >
                            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                            <span>{q.helperReply ? 'Edit Helper Reply' : 'Help Student / Reply'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SILVER FEATURE C: TEST NEW FEATURES TOGGLE (BETA ON/OFF) (Requirement 5.c) */}
          {silverTab === 'beta' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Beta Features Testing Lab</span>
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Toggle experimental AI features to test runtime stability and responsiveness on this build.
                </p>
              </div>

              <div className="space-y-3">
                {/* Feature 1 */}
                <div className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">🧪 Tunglish &amp; Hinglish Code-Switching v2.0</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          betaFeatures.tunglish_v2
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {betaFeatures.tunglish_v2 ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Enables fluid vernacular code-switching (English + Telugu / Hindi) for STEM concept explanations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBetaFeature('tunglish_v2')}
                    className={`flex items-center justify-center p-2 rounded-xl transition cursor-pointer shrink-0 ${
                      betaFeatures.tunglish_v2 ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/40' : 'text-neutral-500 bg-neutral-800'
                    }`}
                  >
                    {betaFeatures.tunglish_v2 ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>

                {/* Feature 2 */}
                <div className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">🧪 Instant Audio Snippet Generator</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          betaFeatures.audio_snippets
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {betaFeatures.audio_snippets ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Generates compact 15-second voice notes with one-tap clipboard and WhatsApp snippet sharing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBetaFeature('audio_snippets')}
                    className={`flex items-center justify-center p-2 rounded-xl transition cursor-pointer shrink-0 ${
                      betaFeatures.audio_snippets ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/40' : 'text-neutral-500 bg-neutral-800'
                    }`}
                  >
                    {betaFeatures.audio_snippets ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>

                {/* Feature 3 */}
                <div className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">🧪 Interactive Heart &amp; Mind Sanctuary Prompts</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          betaFeatures.heart_prompts
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {betaFeatures.heart_prompts ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Provides empathetic listening, exam stress calming, and gentle guidance for tough emotional moments.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBetaFeature('heart_prompts')}
                    className={`flex items-center justify-center p-2 rounded-xl transition cursor-pointer shrink-0 ${
                      betaFeatures.heart_prompts ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/40' : 'text-neutral-500 bg-neutral-800'
                    }`}
                  >
                    {betaFeatures.heart_prompts ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>

                {/* Feature 4 */}
                <div className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">🧪 Real-time Vision OCR Fast Path</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          betaFeatures.vision_fast_ocr
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {betaFeatures.vision_fast_ocr ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Pre-processes textbook camera captures client-side before dispatching to the AGNI vision model.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBetaFeature('vision_fast_ocr')}
                    className={`flex items-center justify-center p-2 rounded-xl transition cursor-pointer shrink-0 ${
                      betaFeatures.vision_fast_ocr ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/40' : 'text-neutral-500 bg-neutral-800'
                    }`}
                  >
                    {betaFeatures.vision_fast_ocr ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>

                {/* Feature 5 */}
                <div className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">🧪 Low-Bandwidth Adaptive Streamer for Rural Study</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          betaFeatures.rural_adaptive_stream
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {betaFeatures.rural_adaptive_stream ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Compresses audio and text payloads dynamically when 2G/3G low-bandwidth connections are detected.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleBetaFeature('rural_adaptive_stream')}
                    className={`flex items-center justify-center p-2 rounded-xl transition cursor-pointer shrink-0 ${
                      betaFeatures.rural_adaptive_stream ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/40' : 'text-neutral-500 bg-neutral-800'
                    }`}
                  >
                    {betaFeatures.rural_adaptive_stream ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SILVER FEATURE D: TEST AI RESPONSES (Requirement 5.d) */}
          {silverTab === 'test_ai' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-400" />
                  <span>Interactive AI Response Testing Sandbox</span>
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Test prompt answers, verify Founder recognition, and evaluate model response latency across languages.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-neutral-900/80 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="text-xs font-semibold text-slate-200">
                    Test Prompt:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">Response Language:</span>
                    <select
                      value={testLanguage}
                      onChange={(e) => setTestLanguage(e.target.value)}
                      className="rounded-lg border border-white/15 bg-neutral-950 px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Tunglish">Tunglish (Telugu + English)</option>
                      <option value="Hinglish">Hinglish (Hindi + English)</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTestPrompt('Who is the founder of AGNI?')}
                    className="text-[11px] rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-amber-300 border border-amber-500/20 cursor-pointer"
                  >
                    👑 Test Founder Directive
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestPrompt('Explain quadratic equations step-by-step')}
                    className="text-[11px] rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-cyan-300 border border-cyan-500/20 cursor-pointer"
                  >
                    📐 Test Math Solver
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestPrompt('Give a 1-minute exam motivation speech')}
                    className="text-[11px] rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1 text-emerald-300 border border-emerald-500/20 cursor-pointer"
                  >
                    🔥 Test Motivation
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter any query to test AGNI response..."
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 p-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-slate-400"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    Engine: <strong className="text-white">{stats.engine}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleRunAiTest}
                    disabled={isTestingAi || !testPrompt.trim()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-500 px-4 py-2 text-xs font-bold text-white shadow transition cursor-pointer disabled:opacity-50"
                  >
                    {isTestingAi ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating Test Response...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Run Test Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                {testAiResponse && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Live AI Output:</span>
                      </span>
                      {testAiLatency && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Latency: {testAiLatency}ms
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-slate-700 text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {testAiResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3 border-t border-white/10 bg-neutral-950/90 text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
            <span>Co-Founder Portal &bull; Conceived by Founders M. Sanjay &amp; T. Hasini</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-1.5 font-semibold text-neutral-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
