import BackButton from './BackButton';
import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  MessageSquare,
  LifeBuoy,
  Clock,
  User,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage, UserPreferences, ChatSession, AuthUser } from '../types';
import { MarkdownView } from './MarkdownView';
import { sanitizePlainInput } from '../utils/security';
import {
  speakText,
  stopSpeaking,
  subscribeSpeechState,
  getSpokenSnippet,
} from '../utils/speech';

interface HeartCareChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onClearMessages: () => void;
  isLoading: boolean;
  userPreferences: UserPreferences;
  initialInput?: string;
  onClearInitialInput?: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  onSwitchToNormalChat: () => void;
  authUser?: AuthUser | null;
  onDeleteMessage?: (messageId: string) => void;
}

const HEART_CARE_STARTERS = [
  {
    category: 'convince',
    icon: '🩹',
    title: 'Convince Me When I Feel Bad',
    desc: 'Feeling guilty, inadequate, or like a failure? Let AGNI restore your self-worth',
    prompt: 'I feel so terrible and disappointed in myself today, like I am a failure and everything went wrong. Can you talk to me, convince me with perspective, and help me feel hope again?',
  },
  {
    category: 'questions',
    icon: '❓',
    title: 'Tough Questions & Honest Advice',
    desc: 'Get direct, wise, and practical answers to your difficult life dilemmas',
    prompt: 'I am facing a really difficult situation in my personal life and I have questions on what to do. Can you hear me out and give me direct, thoughtful, and practical advice?',
  },
  {
    category: 'problems',
    icon: '😤',
    title: 'Everyday Inconveniences & Frustrations',
    desc: 'When daily hassles, delays, unfair situations, or stress push you to your limit',
    prompt: 'Today has been exhausting with frustrating inconveniences, hassles, and annoyances. Can I vent to you and get some calm perspective on how to deal with this?',
  },
  {
    category: 'problems',
    icon: '🧩',
    title: 'Family & Friendship Conflicts',
    desc: 'Complicated dynamics, misunderstandings, and setting healthy boundaries',
    prompt: 'I am dealing with a complicated relationship conflict with people close to me. Can you help me understand why this happened and how I should respond?',
  },
  {
    category: 'heartbreak',
    icon: '💔',
    title: 'Breakup & Heartbreak',
    desc: 'Healing when love hurts, you feel abandoned, or grief hits you',
    prompt: 'I recently went through a painful breakup and I feel completely broken, lonely, and heartbroken. Can you talk to me and help me through this pain?',
  },
  {
    category: 'heartbreak',
    icon: '🫂',
    title: 'Deep Loneliness',
    desc: 'When you feel isolated and need a kind, understanding friend who listens',
    prompt: 'I am feeling very lonely and depressed today, like nobody really understands what I am going through. Can you be here with me?',
  },
  {
    category: 'problems',
    icon: '📚',
    title: 'Student & Career Burnout',
    desc: 'When exam pressure, marks, or career uncertainty feel suffocating',
    prompt: 'I am drowning in stress and anxiety about my exams, career path, and future. Can you answer my worries, calm me down, and help me take clear next steps?',
  },
  {
    category: 'convince',
    icon: '🌙',
    title: 'Late Night Overthinking & Guilt',
    desc: 'Quiet the racing mind when regrets, worries, or self-blame won’t stop',
    prompt: 'My mind is racing with overthinking, self-doubt, and painful memories. Can you convince me of my strengths and guide me through a calming thought exercise?',
  },
  {
    category: 'convince',
    icon: '🕊️',
    title: '2-Min Calming Breaths & Reset',
    desc: 'Step-by-step box breathing to soothe racing pulse and emotional overwhelm',
    prompt: 'My anxiety and frustration are peaking right now. Can you guide me through a soothing 2-minute breathing and grounding technique to reset my mind?',
  },
];

const QUICK_MOODS = [
  '🩹 Feeling Bad & Guilty',
  '❓ Need Answers & Advice',
  '😤 Frustrated by Inconveniences',
  '💔 Heartbroken',
  '🫂 Feeling Lonely',
  '📚 Overwhelmed by Exams/Job',
  '🕊️ Need Calming Peace',
];

export const HeartCareChatView: React.FC<HeartCareChatViewProps> = ({
  messages,
  onSendMessage,
  onClearMessages,
  isLoading,
  userPreferences,
  initialInput,
  onClearInitialInput,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onClearAllSessions,
  onSwitchToNormalChat,
  authUser,
  onDeleteMessage,
}) => {
  const [inputText, setInputText] = useState(initialInput || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [showHelplines, setShowHelplines] = useState(false);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'convince' | 'questions' | 'problems' | 'heartbreak'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionTargetToDelete, setSessionTargetToDelete] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleDeleteChatRequest = (sessionId?: string) => {
    setSessionTargetToDelete(sessionId || activeSessionId);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteChat = () => {
    const targetId = sessionTargetToDelete || activeSessionId;
    stopSpeaking();
    onDeleteSession(targetId);
    setShowDeleteModal(false);
    setSessionTargetToDelete(null);
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle incoming initial prompt
  useEffect(() => {
    if (initialInput) {
      setInputText(initialInput);
      onClearInitialInput?.();
      inputRef.current?.focus();
    }
  }, [initialInput, onClearInitialInput]);

  // Listen to speech state
  useEffect(() => {
    const unsubscribe = subscribeSpeechState((speaking) => {
      setIsAiSpeaking(speaking);
      if (!speaking) {
        setCurrentlySpeakingId(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const sanitized = sanitizePlainInput(inputText).trim();
    if (!sanitized || isLoading) return;

    setInputText('');
    await onSendMessage(sanitized);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakMessage = (msg: ChatMessage) => {
    if (currentlySpeakingId === msg.id && isAiSpeaking) {
      stopSpeaking();
      setCurrentlySpeakingId(null);
      return;
    }

    stopSpeaking();
    setCurrentlySpeakingId(msg.id);
    const snippet = getSpokenSnippet(msg.text);
    speakText(snippet, {
      rate: 0.94, // Gentle and soothing
      pitch: 1.02,
      volume: 1.0,
      profile: 'natural-warm',
    });
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  return (
    <div id="agni-heart-care-view" className="flex-1 flex flex-col h-full bg-gradient-to-b from-rose-50/40 via-neutral-50 to-neutral-100 dark:from-rose-950/20 dark:via-neutral-950 dark:to-neutral-900">
      {/* Top Sanctuary Header */}
      <div className="px-4 pt-2 bg-white/90 dark:bg-neutral-900/90">
        <BackButton label="Back to Home" onClick={() => window.location.href = '/'} />
      </div>
      <header className="border-b border-rose-200/60 bg-white/90 px-4 py-3 shadow-xs backdrop-blur-md dark:border-rose-900/30 dark:bg-neutral-900/90 z-10 shrink-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white shadow-md shadow-rose-500/25">
              <Heart className="h-5 w-5 fill-current animate-pulse" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-950 text-[9px] border border-rose-400">
                🌸
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-50">
                  AGNI Heart &amp; Mind Care
                </h1>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Separate Chat
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>Private &amp; Confidential • Not saved to normal chat history</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowSessionDrawer(!showSessionDrawer)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
              title="View Heart Care Sessions"
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Heart Sessions</span>
              <span className="rounded-full bg-rose-200 dark:bg-rose-900 px-1.5 py-0.2 text-[10px]">
                {sessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={onCreateNewSession}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-rose-600 hover:to-amber-600 transition cursor-pointer"
              title="Start a fresh heart-to-heart conversation"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Heart Chat</span>
            </button>

            {/* Prominent Delete Chat Button */}
            <button
              type="button"
              id="delete-current-heart-chat-btn"
              onClick={() => handleDeleteChatRequest(activeSessionId)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50/80 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 transition cursor-pointer"
              title="Delete current Heart Care chat"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span className="hidden sm:inline">Delete Chat</span>
            </button>

            <button
              type="button"
              onClick={onSwitchToNormalChat}
              className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition cursor-pointer"
              title="Switch back to General AI Chat"
            >
              <MessageSquare className="h-3.5 w-3.5 text-orange-500" />
              <span className="hidden md:inline">Normal Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Heart Care Sessions Drawer Modal */}
      {showSessionDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
            onClick={() => setShowSessionDrawer(false)}
          />
          <div className="relative z-10 flex w-full max-w-xs flex-col bg-white dark:bg-neutral-900 shadow-2xl border-r border-rose-200 dark:border-rose-900/30 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500 fill-current" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Heart Care Chats
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionDrawer(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-2.5">
              <button
                type="button"
                onClick={() => {
                  onCreateNewSession();
                  setShowSessionDrawer(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 py-2 text-xs font-bold text-white shadow-xs hover:from-rose-600 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Start New Heart Session</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 py-2">
              {sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectSession(s.id);
                      setShowSessionDrawer(false);
                    }}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs transition cursor-pointer ${
                      isActive
                        ? 'bg-rose-100 text-rose-900 font-bold dark:bg-rose-950/50 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                        : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <p className="truncate font-medium">{s.title || 'Gentle Conversation'}</p>
                      <span className="text-[10px] text-neutral-400 font-normal">
                        {s.updatedAt || s.createdAt}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChatRequest(s.id);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                      title="Delete this heart chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all Heart Care chat history? Normal chats will remain safe.')) {
                    onClearAllSessions();
                    setShowSessionDrawer(false);
                  }
                }}
                className="w-full text-center text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 py-1.5 cursor-pointer"
              >
                Clear All Heart History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {/* Reassurance Banner */}
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
                <Heart className="h-4 w-4 fill-current" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Private Sanctuary for Your Feelings, Inconveniences &amp; Tough Questions
                </h2>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                  Not just heartbreak — share daily hassles, life problems, or when you feel down. AGNI answers your questions directly, reassures you, and convinces you of hope.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelplines(!showHelplines)}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0 cursor-pointer"
            >
              <LifeBuoy className="h-3 w-3" />
              <span>{showHelplines ? 'Hide Helplines' : '24/7 Helplines'}</span>
            </button>
          </div>


          {/* V20 SOS Quick Call Buttons - Always Visible */}
          <div className="flex flex-col gap-2 mb-3 mt-2">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-1">🆘 Emergency Helplines</p>
            <a href="tel:18005990019" className="flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white" style={{minHeight:"48px",background:"#FF6B00"}}>
              📞 Call Kiran Mental Health — Free 24/7
            </a>
            <a href="tel:1098" className="flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white" style={{minHeight:"48px",background:"#FF6B00"}}>
              📞 Call Childline — 1098 (Children)
            </a>
            <a href="tel:14416" className="flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white" style={{minHeight:"48px",background:"#FF6B00"}}>
              📞 Call Tele-MANAS — 14416 (Govt India)
            </a>
            <p className="text-[10px] text-neutral-500 text-center mt-1">AGNI is AI companion, not professional doctor. For emergency, call helplines above. — AGNI Safe India</p>
          </div>
          {/* 24/7 Free Mental Health Crisis Helplines Panel */}
          {showHelplines && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-800 dark:bg-amber-950/30 text-left text-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 mb-2">
                <LifeBuoy className="h-4 w-4 text-amber-600" />
                <span>24/7 Free &amp; Confidential Mental Health Support</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mb-2.5 leading-relaxed">
                If you or someone you know is going through severe distress or thoughts of self-harm, please reach out immediately. Compassionate professionals are ready to help you:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-white/80 dark:bg-neutral-900/80 p-2.5 border border-amber-200 dark:border-amber-900">
                  <span className="font-bold text-amber-900 dark:text-amber-200">🇮🇳 Tele-MANAS (Govt of India):</span>
                  <a href="tel:14416" className="block text-amber-700 dark:text-amber-400 font-mono font-semibold hover:underline">📞 14416 / 1800-891-4416</a>
                  <span className="text-[10px] text-neutral-500">Free, 24/7, All Indian Languages</span>
                </div>
                <div className="rounded-xl bg-white/80 dark:bg-neutral-900/80 p-2.5 border border-amber-200 dark:border-amber-900">
                  <span className="font-bold text-amber-900 dark:text-amber-200">🇮🇳 KIRAN Mental Health Helpline:</span>
                  <a href="tel:18005990019" className="block text-amber-700 dark:text-amber-400 font-mono font-semibold hover:underline">📞 1800-599-0019</a>
                  <span className="text-[10px] text-neutral-500">24/7 National Psychological Support</span>
                </div>
                <div className="rounded-xl bg-white/80 dark:bg-neutral-900/80 p-2.5 border border-amber-200 dark:border-amber-900">
                  <span className="font-bold text-amber-900 dark:text-amber-200">🇮🇳 Childline (Children):</span>
                  <a href="tel:1098" className="block text-amber-700 dark:text-amber-400 font-mono font-semibold hover:underline">📞 1098</a>
                  <span className="text-[10px] text-neutral-500">Free, 24/7, Child Helpline India</span>
                </div>
                <div className="rounded-xl bg-white/80 dark:bg-neutral-900/80 p-2.5 border border-amber-200 dark:border-amber-900">
                  <span className="font-bold text-amber-900 dark:text-amber-200">🇮🇳 AASRA (Suicide Prevention):</span>
                  <a href="tel:+919820466726" className="block text-amber-700 dark:text-amber-400 font-mono font-semibold hover:underline">📞 +91 9820466726</a>
                  <span className="text-[10px] text-neutral-500">Confidential Crisis Intervention</span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2 italic">⚠️ AGNI is an AI companion, not a mental health professional. In emergencies, please call the helplines above.</p>
            </div>
          )}

          {/* If no messages yet, show comforting starters */}
          {messages.length === 0 && (
            <div className="py-6 text-center space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-xl shadow-rose-500/25">
                  <Heart className="h-9 w-9 fill-current animate-pulse" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Whatever you are holding inside, you don&apos;t have to carry it alone.
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
                  Not just heartbreak — talk about frustrating inconveniences, life problems, and tough questions. When you feel down or guilty, AGNI is here to answer you honestly, convince you of your worth, and lift your heart.
                </p>
              </div>

              {/* Quick Mood Chips */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl mx-auto">
                {QUICK_MOODS.map((mood, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(`I am experiencing ${mood}. Can you talk to me, answer my concerns, and help me through this?`);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-rose-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-neutral-700 shadow-2xs hover:border-rose-400 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-neutral-900/80 dark:text-neutral-200 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    {mood}
                  </button>
                ))}
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {[
                  { id: 'all', label: '🌟 All Topics' },
                  { id: 'convince', label: '🩹 Convince Me When Down' },
                  { id: 'questions', label: '❓ Questions & Advice' },
                  { id: 'problems', label: '😤 Inconveniences & Hassles' },
                  { id: 'heartbreak', label: '💔 Heartbreak & Loneliness' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-rose-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Empathetic Starters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left pt-1">
                {HEART_CARE_STARTERS.filter(
                  (item) => activeCategory === 'all' || item.category === activeCategory
                ).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendMessage(item.prompt)}
                    className="flex flex-col justify-between rounded-2xl border border-rose-200/70 bg-white/90 p-4 shadow-xs hover:border-rose-400 hover:shadow-md dark:border-rose-900/40 dark:bg-neutral-900/90 transition group cursor-pointer"
                  >
                    <div>
                      <div className="text-xl mb-1.5">{item.icon}</div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <span>Talk &amp; get answers</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message History */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-left ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-sm mt-0.5">
                    <Heart className="h-4 w-4 fill-current" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-xs transition-all ${
                    isUser
                      ? 'bg-gradient-to-br from-rose-600 to-rose-700 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-neutral-900 border border-rose-200/60 dark:border-rose-900/30 text-neutral-800 dark:text-neutral-100 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isUser ? 'text-rose-200' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isUser ? (authUser?.name || 'You') : 'AGNI Heart Companion 💖'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] ${
                          isUser ? 'text-rose-200/80' : 'text-neutral-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                      {onDeleteMessage && isUser && (
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(msg.id)}
                          className="opacity-70 hover:opacity-100 text-rose-200 hover:text-white p-0.5 rounded transition cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`prose prose-sm max-w-none break-words leading-relaxed ${isUser ? 'text-white' : ''}`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <MarkdownView content={msg.text} />
                    )}
                  </div>

                  {/* Actions for assistant replies */}
                  {!isUser && (
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-rose-100 dark:border-rose-900/20 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSpeakMessage(msg)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 transition cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40 ${
                            currentlySpeakingId === msg.id && isAiSpeaking
                              ? 'text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40'
                              : ''
                          }`}
                          title="Listen to gentle voice reading"
                        >
                          {currentlySpeakingId === msg.id && isAiSpeaking ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
                              <span>Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5 text-rose-500" />
                              <span>Listen in Gentle Voice</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 transition cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Copy comforting message"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {onDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(msg.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 transition cursor-pointer text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="text-[10px]">Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-sm mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-sm animate-pulse">
                <Heart className="h-4 w-4 fill-current" />
              </div>
              <div className="rounded-3xl bg-white p-4 dark:bg-neutral-900 border border-rose-200/60 dark:border-rose-900/30 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <Sparkles className="h-4 w-4 animate-spin text-amber-500" />
                  <span>AGNI is holding space and crafting a caring response...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <footer className="border-t border-rose-200/60 bg-white/95 p-3.5 backdrop-blur-md dark:border-rose-900/30 dark:bg-neutral-900/95 z-10 shrink-0">
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <div className="relative flex-1 rounded-2xl border border-rose-200 bg-neutral-50/80 focus-within:border-rose-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/20 dark:border-rose-900/50 dark:bg-neutral-800/80 dark:focus-within:bg-neutral-800 transition shadow-inner">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Share a feeling, life problem, inconvenience, or question... AGNI will listen, answer, and convince you of hope (Enter to send)"
                className="w-full resize-none bg-transparent px-4 py-3 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 outline-none dark:text-neutral-100 max-h-32"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white shadow-md shadow-rose-500/25 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
              title="Send to AGNI Heart Care"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-rose-500" />
              <span>Independent Heart Care session • Completely separate from general chat</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="footer-delete-chat-btn"
                onClick={() => handleDeleteChatRequest(activeSessionId)}
                className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                title="Delete this Heart Care conversation"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete Chat</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Delete Chat Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900 border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Trash2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Delete this Heart Care chat?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                This conversation and its messages will be permanently removed from your Heart Care history.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSessionTargetToDelete(null);
                }}
                className="flex-1 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-heart-chat-btn"
                onClick={handleConfirmDeleteChat}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:from-rose-700 hover:to-red-700 transition cursor-pointer"
              >
                Yes, Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
