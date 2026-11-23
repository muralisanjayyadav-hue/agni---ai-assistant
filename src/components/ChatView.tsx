import BackButton from './BackButton';
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Flame,
  Bot,
  User,
  AlertCircle,
  RefreshCw,
  Clock,
  Plus,
  History,
  Share2,
  Bookmark,
  Square,
  Heart,
  HeartHandshake,
  ShieldCheck,
  LifeBuoy,
  X,
  Maximize2,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { ChatMessage, UserPreferences, StoredMemory, ChatSession, AuthUser, MediaAttachment } from '../types';
import { MarkdownView } from './MarkdownView';
import { ChatHistoryDrawer } from './ChatHistoryDrawer';
import { makePDF, makePPT } from '../utils/agniFileMaker';
import { ShareAudioSnippetModal } from './ShareAudioSnippetModal';
import { MediaUploadModal } from './MediaUploadModal';
import { ProcessedMediaFile, uploadToFirebaseStorage } from '../utils/firebaseStorage';
import { checkChatRateLimit, sanitizePlainInput } from '../utils/security';
import { getLanguageOption } from '../data/languages';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  speakText,
  stopSpeaking,
  subscribeSpeechState,
  getSpokenSnippet,
} from '../utils/speech';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments?: MediaAttachment[]) => Promise<void>;
  onRetryLastMessage?: () => Promise<void>;
  onClearMessages: () => void;
  isLoading: boolean;
  userPreferences: UserPreferences;
  memories: StoredMemory[];
  initialInput?: string;
  onClearInitialInput?: () => void;
  sessions?: ChatSession[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onCreateNewSession?: () => void;
  onDeleteSession?: (id: string) => void;
  onClearAllSessions?: () => void;
  authUser?: AuthUser | null;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  onRetryLastMessage,
  onClearMessages,
  isLoading,
  userPreferences,
  memories,
  initialInput,
  onClearInitialInput,
  sessions = [],
  activeSessionId = '',
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onClearAllSessions,
  authUser,
}) => {
  const [inputText, setInputText] = useState(initialInput || '');
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [snippetToShare, setSnippetToShare] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<ProcessedMediaFile[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [zoomMediaUrl, setZoomMediaUrl] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('agni_bookmarked_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleToggleBookmark = (msgId: string, text: string) => {
    setBookmarkedIds((prev) => {
      const exists = prev.includes(msgId);
      const updated = exists ? prev.filter((id) => id !== msgId) : [...prev, msgId];
      try {
        localStorage.setItem('agni_bookmarked_ids', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save bookmarks', e);
      }
      return updated;
    });
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (initialInput) {
      setInputText(initialInput);
      onClearInitialInput?.();
    }
  }, [initialInput, onClearInitialInput]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Synchronize global speech state
  useEffect(() => {
    const unsub = subscribeSpeechState((speaking) => {
      if (!speaking) {
        setCurrentlySpeakingId(null);
      }
    });
    return () => unsub();
  }, []);

  // Clean up speech synthesis and listening immediately on ChatView unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Handle Speech Recognition
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceNotice('Microphone speech recognition is not supported in your browser. You can type your question.');
      setTimeout(() => setVoiceNotice(null), 5000);
      return;
    }

    try {
      const langOption = getLanguageOption(userPreferences.language);
      const targetSpeechCode = langOption.speechCode || 'en-IN';
      const recognition = createSpeechRecognition(targetSpeechCode);
      if (!recognition) {
        setVoiceNotice('Speech recognition could not be initialized. Please verify microphone permissions.');
        setTimeout(() => setVoiceNotice(null), 5000);
        return;
      }

      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(`Listening in ${langOption.nativeName || langOption.label}... Speak now, typing down your words live.`);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        const text = finalTranscript || interimTranscript;
        console.log("Transcript:", text);
        // UPDATE BOTH STATES - THIS IS THE FIX:
        if (setInputText) setInputText(text);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event);
        setIsListening(false);
        setVoiceNotice(`Speech recognition error: ${event.error || 'Check microphone'}`);
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice(null);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && stagedAttachments.length === 0) || isLoading || isUploadingMedia) return;

    // Rate Limiter: Max 10 messages per minute
    const rateCheck = checkChatRateLimit();
    if (!rateCheck.allowed) {
      setVoiceNotice(`Slow down, AGNI is thinking... (Please wait ${rateCheck.waitSeconds}s)`);
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    const textToSend = inputText.trim() ? sanitizePlainInput(inputText.trim()) : '';
    const attachmentsToUpload = [...stagedAttachments];
    setStagedAttachments([]);
    setInputText('');

    let uploadedAttachments: MediaAttachment[] | undefined = undefined;

    if (attachmentsToUpload.length > 0) {
      setIsUploadingMedia(true);
      try {
        uploadedAttachments = [];
        for (const item of attachmentsToUpload) {
          // Upload to Firebase Storage agni_vision_uploads/{email}/{time}.jpg
          const cloudUrl = await uploadToFirebaseStorage(
            item.thumbnailUrl || item.dataUrl,
            authUser?.email
          );
          uploadedAttachments.push({
            id: item.id,
            url: cloudUrl || item.dataUrl,
            type: item.type,
            mimeType: item.mimeType,
            name: item.name,
            size: item.size,
            thumbnailUrl: item.thumbnailUrl,
          });
        }
      } catch (err) {
        console.warn('Error uploading media to storage, proceeding with local URLs', err);
      } finally {
        setIsUploadingMedia(false);
      }
    }

    try {
      localStorage.setItem('lastUserMessage', textToSend || (uploadedAttachments?.length ? 'Uploaded media attachment' : ''));
    } catch {}

    await onSendMessage(textToSend, uploadedAttachments);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, id: string) => {
    if (currentlySpeakingId === id) {
      stopSpeaking();
      setCurrentlySpeakingId(null);
      return;
    }

    stopSpeaking();
    setCurrentlySpeakingId(id);
    // For long responses, speak the concise spoken summary so voice is brisk and doesn't drag on
    const textToSpeak = text.length > 350 ? getSpokenSnippet(text, 3, 320) : text;
    const spoken = speakText(textToSpeak, {
      rate: userPreferences.voiceSpeed || 1.02,
      pitch: userPreferences.voicePitch || 1.05,
      volume: 1.0,
      profile: userPreferences.voiceProfile || 'natural-warm',
      lang: userPreferences.language,
      onEnd: () => setCurrentlySpeakingId(null),
      onError: () => setCurrentlySpeakingId(null),
    });

    if (!spoken) {
      setVoiceNotice('Text-to-speech is unavailable in this environment.');
      setCurrentlySpeakingId(null);
      setTimeout(() => setVoiceNotice(null), 3000);
    }
  };

  const suggestions = [
    'How does photosynthesis work? Explain simply',
    'Write a concise leave application for college exams',
    'Explain the difference between Speed and Velocity with formulas',
    'What are the 5 key principles of clean code architecture?',
  ];

  const emotionalSuggestions = [
    {
      emoji: '💔',
      title: 'Coping with a painful breakup & heartbreak',
      prompt: 'I recently went through a painful breakup and I feel completely broken, lonely, and heartbroken. Can you talk to me and help me through this pain?',
    },
    {
      emoji: '🫂',
      title: 'Feeling lonely, isolated, or depressed',
      prompt: 'I am feeling very lonely and depressed today, like nobody understands what I am going through. Can you be here with me?',
    },
    {
      emoji: '📚',
      title: 'Student exam stress & fear of failing',
      prompt: 'I am a student and I am drowning in stress and anxiety about my exams and future. Can you help me calm down and feel grounded?',
    },
    {
      emoji: '🌿',
      title: 'Calming breathing & grounding exercise',
      prompt: 'Can you guide me through a gentle, soothing breathing and grounding exercise right now? My mind is racing.',
    },
  ];

  return (
    <div className="mx-auto flex flex-1 w-full max-w-5xl flex-col px-3 py-3 sm:px-6 h-[calc(100vh-135px)] min-h-[480px]">
      <div className="mb-2 flex items-center">
        <BackButton label="Back to Home" onClick={() => window.location.href = '/'} />
      </div>
      {/* Top Session Management & History Bar */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-neutral-200/80 pb-2 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          {/* History Drawer Toggle Button */}
          <button
            type="button"
            id="chat-history-drawer-btn"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-750 transition cursor-pointer"
          >
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>Chat History</span>
            {sessions.length > 0 && (
              <span className="rounded-full bg-orange-100 px-1.5 py-0.2 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                {sessions.length}
              </span>
            )}
          </button>

          {/* New Chat Button */}
          {onCreateNewSession && (
            <button
              type="button"
              id="chat-new-session-btn"
              onClick={onCreateNewSession}
              className="flex items-center gap-1 rounded-xl bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/50 transition cursor-pointer border border-orange-200 dark:border-orange-900"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>

        {/* Active Session Title Pill */}
        <div className="flex items-center gap-2 truncate text-xs text-neutral-500 dark:text-neutral-400">
          <span className="hidden md:inline text-[11px] font-medium">Session:</span>
          <span className="truncate font-semibold text-neutral-800 dark:text-neutral-200 max-w-[180px] sm:max-w-xs">
            {activeSession?.title || 'Current Conversation'}
          </span>
          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] dark:bg-neutral-800">
            {messages.length} msgs
          </span>
        </div>
      </div>

      {/* Voice notice / status banner */}
      {voiceNotice && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-orange-100/90 px-3 py-2 text-xs font-medium text-orange-900 dark:bg-orange-950/80 dark:text-orange-200 border border-orange-200 dark:border-orange-900 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Chat History Drawer */}
      <ChatHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          stopSpeaking();
          onSelectSession?.(id);
          setIsHistoryDrawerOpen(false);
        }}
        onCreateNewSession={() => {
          stopSpeaking();
          onCreateNewSession?.();
          setIsHistoryDrawerOpen(false);
        }}
        onDeleteSession={(id) => {
          stopSpeaking();
          onDeleteSession?.(id);
        }}
        onClearAllSessions={() => {
          stopSpeaking();
          onClearAllSessions?.();
        }}
      />

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.length === 0 ? (
          isLoading ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black border border-orange-500/40 text-white shadow-lg shadow-orange-500/20 mb-4 animate-pulse overflow-hidden">
                <img src="/logo.png" alt="AGNI" className="h-10 w-10 object-contain" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">AGNI is thinking...</span>
              </div>
            </div>
          ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg mb-3 overflow-hidden ${
              authUser?.isFounder
                ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-amber-500/30 text-2xl font-black text-amber-950 border-2 border-amber-300'
                : 'bg-black border border-orange-500/40 shadow-orange-500/20'
            }`}>
              {authUser?.isFounder ? '👑' : <img src="/logo.png" alt="AGNI" className="h-12 w-12 object-contain drop-shadow" />}
            </div>
            <h2 className="font-display text-xl font-bold text-neutral-800 dark:text-neutral-100">
              {authUser ? (
                authUser.isFounder ? (
                  <span className="text-orange-600 dark:text-orange-400">
                    Hii {authUser.name || 'Founder'}! I am proud to meet my founder.
                  </span>
                ) : (
                  <span>Hello {authUser.name}! Welcome to AGNI</span>
                )
              ) : (
                <span>AGNI Chat &amp; Companion</span>
              )}
            </h2>
            <p className="mt-1 max-w-md text-xs text-neutral-500 dark:text-neutral-400">
              {authUser?.isFounder ? (
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Welcome back to your own creation - AGNI. What shall we build today, Boss?
                </span>
              ) : (
                <span>Ask academic questions, explore concepts, or talk openly when you need an understanding, compassionate companion.</span>
              )}
            </p>

            {memories.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>{memories.length} personalized memory facts active</span>
              </div>
            )}

            {/* Quick Starters */}
            <div className="mt-5 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  id={`chat-suggestion-${idx}`}
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem('lastUserMessage', s); } catch {}
                    onSendMessage(s);
                  }}
                  className="rounded-xl border border-neutral-200 bg-white p-2.5 text-left text-xs font-medium text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50/50 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:border-orange-900 cursor-pointer"
                >
                  "{s}"
                </button>
              ))}
            </div>

            {/* Heart & Mind Care / Emotional Support Section */}
            <div className="mt-4 w-full max-w-lg rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 via-amber-50/30 to-orange-50/40 p-3.5 text-left dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 animate-pulse" />
                  <span>Feeling Lonely, Depressed, or Brokenhearted?</span>
                </div>
                <span className="text-[9px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
                  Safe &amp; Caring
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mb-2.5">
                Whether you're grieving a painful breakup, feeling isolated, or overwhelmed by exam pressure, AGNI understands your feelings and is right here with you.
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {emotionalSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem('lastUserMessage', item.prompt); } catch {}
                      onSendMessage(item.prompt);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-white/90 dark:bg-neutral-900/90 border border-rose-200/70 dark:border-rose-900/40 p-2 text-xs text-neutral-800 dark:text-neutral-200 hover:border-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/50 transition cursor-pointer text-left group shadow-2xs"
                  >
                    <span className="text-sm shrink-0">{item.emoji}</span>
                    <span className="flex-1 font-medium text-[11px] sm:text-xs group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          )
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeakingThis = currentlySpeakingId === msg.id;

            return (
              <div
                key={msg.id}
                id={`chat-message-${msg.id}`}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-sm mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  style={isUser ? { backgroundColor: '#080808' } : undefined}
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#080808] text-white dark:bg-[#080808] dark:text-white rounded-tr-sm shadow-sm'
                      : 'border border-neutral-200 bg-white text-neutral-800 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 rounded-tl-sm'
                  }`}
                >
                  {/* Uploaded Media Bubble (Images & Videos) */}
                  {msg.attachments && msg.attachments.length > 0 ? (
                    <div className="mb-2.5 grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="relative group overflow-hidden rounded-xl border border-neutral-700/60 bg-black/40"
                        >
                          {att.type === 'video' ? (
                            <video
                              src={att.url}
                              poster={att.thumbnailUrl}
                              controls
                              playsInline
                              className="w-full max-h-64 rounded-xl object-contain bg-black"
                            />
                          ) : (
                            <div
                              className="relative cursor-pointer overflow-hidden"
                              onClick={() => setZoomMediaUrl(att.url)}
                            >
                              <img
                                src={att.url}
                                alt={att.name || 'Uploaded attachment'}
                                className="w-full max-h-64 rounded-xl object-cover hover:scale-[1.02] transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white flex items-center gap-1 font-semibold">
                                  <Maximize2 className="h-3 w-3" /> Zoom
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : msg.mediaUrl ? (
                    <div className="mb-2.5 overflow-hidden rounded-xl border border-neutral-700/60 bg-black/40">
                      {msg.mediaType === 'video' ? (
                        <video
                          src={msg.mediaUrl}
                          poster={msg.thumbnailUrl}
                          controls
                          playsInline
                          className="w-full max-h-64 rounded-xl object-contain bg-black"
                        />
                      ) : (
                        <div
                          className="relative cursor-pointer overflow-hidden group"
                          onClick={() => setZoomMediaUrl(msg.mediaUrl!)}
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Uploaded attachment"
                            className="w-full max-h-64 rounded-xl object-cover hover:scale-[1.02] transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white flex items-center gap-1 font-semibold">
                              <Maximize2 className="h-3 w-3" /> Zoom
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <>
                      <MarkdownView content={msg.text} />
                      {(() => {
                        const lastQuery = (localStorage.getItem('lastUserMessage') || '').toLowerCase();
                        const wantsDoc = ["essay","pdf","ppt","document","assignment","project","report","presentation","write","draft","download pdf","download ppt","make pdf","make ppt"].some(k => lastQuery.includes(k));
                        const isLong = (msg.text || '').length > 400;

                        if (!wantsDoc || !isLong) return null;

                        return (
                          <div style={{display:'flex', gap:'8px', marginTop:12}} className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                              type="button"
                              onClick={() => makePDF("AGNI_Report", msg.text)}
                              style={{padding:'8px 16px', background:'#ff6b00', border:'none', borderRadius:20, color:'#fff', fontFamily:'Inter', fontSize:13, fontWeight:600}}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#e65f00] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer font-sans"
                            >
                              <span>📄 Download PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const slides = msg.text
                                  .split('\n\n')
                                  .slice(0, 8)
                                  .map((p, i) => ({ title: `Slide ${i + 1}`, content: p }));
                                makePPT("AGNI_Presentation", slides);
                              }}
                              style={{padding:'8px 16px', background:'#1a1a1a', border:'1px solid #ff6b00', borderRadius:20, color:'#ff6b00', fontFamily:'Inter', fontSize:13, fontWeight:600}}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-900 border border-[#FF6A00] text-[#FF6A00] text-xs font-semibold transition-all cursor-pointer font-sans"
                            >
                              <span>📊 Download PPT</span>
                            </button>
                          </div>
                        );
                      })()}
                      {(msg.text.startsWith('⚠️') || msg.text.includes('Service Notice')) && onRetryLastMessage && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => onRetryLastMessage ? onRetryLastMessage() : window.location.reload()}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-700 transition disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>Retry Request</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Message Footer / Controls */}
                  <div className="mt-2 flex items-center justify-between border-t border-neutral-200/50 pt-1.5 text-[10px] text-neutral-400 dark:border-neutral-800/80">
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <div className="flex items-center gap-1.5 opacity-90 transition-opacity">
                        <button
                          type="button"
                          title="Copy text"
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>

                        {isSpeakingThis ? (
                          <button
                            type="button"
                            id={`stop-speak-btn-${msg.id}`}
                            title="Stop speaking this answer"
                            onClick={() => {
                              stopSpeaking();
                              setCurrentlySpeakingId(null);
                            }}
                            className="flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-500 active:scale-95 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs transition cursor-pointer animate-pulse"
                          >
                            <Square className="h-2.5 w-2.5 fill-current" />
                            <span>Stop Voice</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Read aloud"
                            onClick={() => handleSpeak(msg.text, msg.id)}
                            className="flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                          >
                            <Volume2 className="h-3 w-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          title={bookmarkedIds.includes(msg.id) ? 'Bookmarked' : 'Bookmark voice note'}
                          onClick={() => handleToggleBookmark(msg.id, msg.text)}
                          className={`flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer ${
                            bookmarkedIds.includes(msg.id)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-neutral-500 hover:text-amber-500'
                          }`}
                        >
                          <Bookmark className={`h-3 w-3 ${bookmarkedIds.includes(msg.id) ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          title="Share Audio Snippet to WhatsApp / Telegram"
                          onClick={() => setSnippetToShare(msg.text)}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-emerald-500 cursor-pointer"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black border border-orange-500/40 text-white shadow-sm overflow-hidden">
              <img src="/logo.png" alt="AGNI" className="h-5 w-5 object-contain animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="ml-2 text-xs font-medium text-neutral-500">AGNI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="mt-3 border-t border-neutral-200/80 pt-3 dark:border-neutral-800">
        {/* Active Speaking Interruption Banner */}
        {currentlySpeakingId && (
          <div
            id="chat-active-speaking-banner"
            className="mb-2.5 flex items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs text-red-700 dark:text-red-300 backdrop-blur-sm shadow-xs animate-in fade-in"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="font-semibold truncate">AGNI is currently reading aloud</span>
            </div>
            <button
              id="chat-stop-reading-banner-btn"
              type="button"
              onClick={() => {
                stopSpeaking();
                setCurrentlySpeakingId(null);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white px-3 py-1 text-xs font-bold shadow-xs transition cursor-pointer shrink-0 animate-pulse"
              title="Stop speech output"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop Speaking</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span>Context: <strong>{userPreferences.language}</strong></span>
            <span>•</span>
            <span>Style: <strong>{userPreferences.responseStyle}</strong></span>
          </div>

          {messages.length > 0 && (
            <button
              id="clear-chat-btn"
              type="button"
              onClick={onClearMessages}
              className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>

        {/* Live Voice Typing Notification Strip */}
        {isListening && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-orange-50 border border-orange-500/30 px-3 py-1.5 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping inline-block shrink-0" />
              <span className="font-bold text-[11px] uppercase tracking-wider text-orange-600 dark:text-orange-400 shrink-0">Live Typing:</span>
              <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                {inputText ? `"${inputText}"` : 'Listening... Speak now and words will type down live'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer shrink-0 ml-2"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Staged Media Preview Tray */}
        {stagedAttachments.length > 0 && (
          <div className="mb-2 flex items-center gap-2 overflow-x-auto p-2 rounded-2xl bg-neutral-100/90 border border-neutral-200 dark:bg-neutral-800/90 dark:border-neutral-700 animate-in fade-in">
            {stagedAttachments.map((item, idx) => {
              const thumb = item.thumbnailUrl || item.dataUrl;
              return (
                <div
                  key={item.id}
                  className="relative group h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-600 bg-neutral-900 shadow-sm"
                >
                  {thumb ? (
                    <img src={thumb} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-neutral-400">
                      {item.type === 'video' ? <Film className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                    </div>
                  )}
                  {item.type === 'video' && (
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8px] font-bold text-white">
                      VID
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 shadow-sm transition cursor-pointer"
                    title="Remove file"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setIsMediaModalOpen(true)}
              disabled={stagedAttachments.length >= 5}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-300 hover:border-orange-500 hover:bg-orange-500/10 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 transition cursor-pointer"
              title="Add more files"
            >
              <Plus className="h-5 w-5" />
            </button>
            <div className="ml-1 text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0 font-medium">
              <span>{stagedAttachments.length}/5 files</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-center">
          {/* Plus Button for Media Upload (Meta AI / ChatGPT style) */}
          <button
            id="chat-add-media-btn"
            type="button"
            onClick={() => setIsMediaModalOpen(true)}
            title="Add media and files - Upload whatever you want"
            className="absolute left-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-orange-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-orange-400 transition cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
          </button>

          <input
            id="chat-input-field"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Listening to your voice... typing down your words live...'
                : stagedAttachments.length > 0
                ? 'Add a message or question about your media...'
                : 'Ask AGNI anything, or tap orb to speak...'
            }
            disabled={isLoading || isUploadingMedia}
            className={`w-full rounded-2xl border py-3.5 pl-13 sm:pl-14 pr-24 text-xs sm:text-sm transition-all outline-none ${
              isListening
                ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/30 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100'
                : 'border-neutral-300 bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
            }`}
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Mic Dictation Orb Button */}
            <button
              id="chat-mic-button"
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Stop Listening (words typed down)' : 'Tap Orb to Speak • Types down words live'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 text-white animate-pulse shadow-md shadow-orange-500/30 ring-2 ring-orange-400'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Send Button */}
            <button
              id="chat-send-button"
              type="submit"
              disabled={(!inputText.trim() && stagedAttachments.length === 0) || isLoading || isUploadingMedia}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm transition hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Meta AI / ChatGPT Media Upload Modal */}
      <MediaUploadModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectFiles={(newFiles) => {
          setStagedAttachments((prev) => {
            const combined = [...prev, ...newFiles];
            return combined.slice(0, 5);
          });
        }}
        maxFiles={5}
        currentStagedCount={stagedAttachments.length}
      />

      {/* Click-to-Zoom Media Lightbox Modal */}
      {zoomMediaUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setZoomMediaUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomMediaUrl(null)}
              className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-neutral-700 transition cursor-pointer"
              title="Close Zoom"
            >
              <X className="h-5 w-5" />
            </button>
            {zoomMediaUrl.endsWith('.mp4') || zoomMediaUrl.endsWith('.mov') ? (
              <video src={zoomMediaUrl} controls autoPlay className="max-h-[85vh] max-w-[85vw] rounded-2xl shadow-2xl" />
            ) : (
              <img
                src={zoomMediaUrl}
                alt="Zoomed media"
                className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

      {/* Share Audio Snippet Modal */}
      <ShareAudioSnippetModal
        isOpen={Boolean(snippetToShare)}
        onClose={() => setSnippetToShare(null)}
        snippetText={snippetToShare || ''}
        topic="AGNI Voice Note"
        speaker="agni"
      />
    </div>
  );
};
