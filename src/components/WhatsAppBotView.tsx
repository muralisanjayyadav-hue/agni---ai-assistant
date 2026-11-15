import React, { useState } from 'react';
import {
  Send,
  Mic,
  Camera,
  MessageCircle,
  Volume2,
  CheckCheck,
  Smartphone,
  ExternalLink,
  Code2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Bot,
  Globe,
  Radio,
  Share2,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { speakText, stopSpeaking } from '../utils/speech';

const SAMPLE_BOT_PROBLEMS = [
  {
    label: 'Textbook Physics Problem (Mechanics)',
    type: 'image',
    prompt: 'A car accelerates uniformly from 15 m/s to 35 m/s over 200 meters. Calculate the acceleration and time taken.',
    imageMock: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Voice Note: Newton 3rd Law in Tunglish',
    type: 'voice',
    prompt: 'Bro, explain Newton third law in simple Tunglish with a real world cricket example please.',
  },
  {
    label: 'Voice Note: Organic Chemistry Reaction in Hinglish',
    type: 'voice',
    prompt: 'Bhai, Aldol condensation ka basic mechanism and reaction product kya hota hai? Short me bata do.',
  },
];

interface BotMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  image?: string;
  isVoice?: boolean;
  spokenScript?: string;
  time: string;
}

export const WhatsAppBotView: React.FC = () => {
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'integration'>('simulator');
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: `*Hello, welcome to AGNI WhatsApp & Telegram Assistant!* 🔥\n\nI am your 24/7 AI tutor and productivity partner on chat.\n\n✨ *What you can do here:*\n• Forward textbook photos or homework screenshots\n• Send voice notes in *English, Hinglish, or Tunglish*\n• Receive instant step-by-step solutions with audio playback!\n\n_Try sending a question or tap a sample below!_`,
      spokenScript: 'Hello, welcome to AGNI WhatsApp and Telegram Assistant! Forward any textbook photo or voice note, and I will help you with instant step-by-step solutions.',
      time: '10:00 AM',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [language, setLanguage] = useState<'English' | 'Tunglish' | 'Hinglish'>('Tunglish');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleSend = async (customText?: string, customImage?: string, isVoiceNote = false) => {
    const textToSend = customText !== undefined ? customText : inputQuery.trim();
    if (!textToSend && !customImage) return;

    const userMsg: BotMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      image: customImage,
      isVoice: isVoiceNote,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === undefined) setInputQuery('');
    setIsLoading(true);

    try {
      const data = await apiFetch<{
        replyText: string;
        spokenScript: string;
        timestamp: string;
      }>('/api/bot/simulate', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          messageType: isVoiceNote ? 'voice' : customImage ? 'image' : 'text',
          text: textToSend,
          imageBase64: customImage,
          language,
        }),
      });

      const botMsg: BotMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: data.replyText,
        spokenScript: data.spokenScript,
        time: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically speak voice response if user sent a voice note
      if (isVoiceNote && data.spokenScript) {
        setSpeakingMsgId(botMsg.id);
        speakText(data.spokenScript, {
          rate: 0.95,
          pitch: 1.05,
          volume: 1.0,
          profile: 'natural-warm',
          onEnd: () => setSpeakingMsgId(null),
          onError: () => setSpeakingMsgId(null),
        });
      }
    } catch (err: any) {
      console.error('Bot simulation error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ *Error connecting to AGNI Cloud Bot*: ${err.message || 'Please try again.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayVoice = (msg: BotMessage) => {
    if (speakingMsgId === msg.id) {
      stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      stopSpeaking();
      setSpeakingMsgId(msg.id);
      const text = msg.spokenScript || msg.text.replace(/[*_#`]/g, '');
      speakText(text, {
        rate: 0.95,
        pitch: 1.05,
        volume: 1.0,
        profile: 'natural-warm',
        onEnd: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null),
      });
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/bot/whatsapp/webhook`
    : 'https://your-domain.com/api/bot/whatsapp/webhook';

  const telegramWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/bot/telegram/webhook`
    : 'https://your-domain.com/api/bot/telegram/webhook';

  const handleTestPing = async () => {
    setTestStatus('Testing webhook connection...');
    try {
      const res = await fetch(`/api/bot/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=agni_whatsapp_secret_token&hub.challenge=test_challenge_12345`);
      const text = await res.text();
      if (text === 'test_challenge_12345') {
        setTestStatus('✅ Webhook verification verified! Ready for Meta Cloud API.');
      } else {
        setTestStatus(`Response: ${text}`);
      }
    } catch (e: any) {
      setTestStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      {/* Banner */}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-5 dark:border-emerald-900/40 dark:bg-neutral-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  AGNI WhatsApp &amp; Telegram Voice Bot
                </h1>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Cloud API
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Forward voice notes and textbook photos to AGNI on WhatsApp to get instant spoken solutions and study help.
              </p>
            </div>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex rounded-xl bg-neutral-200/80 p-1 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('simulator')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'simulator'
                  ? 'bg-white text-neutral-900 shadow dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              Interactive Simulator
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('integration')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'integration'
                  ? 'bg-white text-neutral-900 shadow dark:bg-neutral-700 dark:text-white'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
              }`}
            >
              Cloud Webhook Setup
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'simulator' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Bot Simulator Screen */}
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-3xl border border-neutral-300 bg-neutral-100 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
              {/* WhatsApp / Telegram Top Bar */}
              <div
                className={`flex items-center justify-between px-4 py-3 text-white transition-colors ${
                  platform === 'whatsapp' ? 'bg-[#075E54] dark:bg-[#0b3c36]' : 'bg-[#229ED9]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-extrabold text-sm">
                    🔥
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold tracking-wide">AGNI AI Assistant</h2>
                      <span className="rounded-full bg-emerald-400/30 px-1.5 text-[9px] font-bold">
                        Online
                      </span>
                    </div>
                    <p className="text-[10px] opacity-90">
                      Tutor &bull; Founders M. Sanjay &amp; T. Hasini &bull; Voice Enabled
                    </p>
                  </div>
                </div>

                {/* Platform toggle & Language toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-black/20 p-0.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPlatform('whatsapp')}
                      className={`px-2 py-0.5 rounded ${platform === 'whatsapp' ? 'bg-white text-emerald-900' : 'text-white/80'}`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatform('telegram')}
                      className={`px-2 py-0.5 rounded ${platform === 'telegram' ? 'bg-white text-sky-900' : 'text-white/80'}`}
                    >
                      Telegram
                    </button>
                  </div>

                  <select
                    aria-label="Bot Response Language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-semibold text-white outline-none cursor-pointer"
                  >
                    <option value="Tunglish" className="text-black">Tunglish</option>
                    <option value="Hinglish" className="text-black">Hinglish</option>
                    <option value="English" className="text-black">English</option>
                  </select>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                className={`h-[420px] overflow-y-auto p-4 space-y-3 ${
                  platform === 'whatsapp'
                    ? 'bg-[#E5DDD5] dark:bg-[#0c1317]'
                    : 'bg-[#99BA92]/10 dark:bg-[#182533]'
                }`}
              >
                {messages.map((m) => {
                  const isBot = m.sender === 'bot';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`relative max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                          isBot
                            ? 'bg-white text-neutral-900 dark:bg-[#202c33] dark:text-neutral-100 rounded-tl-sm'
                            : 'bg-[#DCF8C6] text-neutral-900 dark:bg-[#005c4b] dark:text-neutral-100 rounded-tr-sm'
                        }`}
                      >
                        {/* Voice Note indicator */}
                        {m.isVoice && (
                          <div className="flex items-center gap-1.5 mb-1 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                            <Mic className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                            <span>Voice Note Transcribed:</span>
                          </div>
                        )}

                        {m.image && (
                          <img
                            src={m.image}
                            alt="Textbook doubt"
                            className="mb-2 max-h-40 w-full rounded-xl object-cover"
                          />
                        )}

                        <div className="whitespace-pre-wrap">
                          {m.text}
                        </div>

                        {/* Bot Voice Playback Button */}
                        {isBot && (
                          <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-700">
                            <button
                              type="button"
                              onClick={() => handlePlayVoice(m)}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-pointer"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              <span>{speakingMsgId === m.id ? 'Pause Voice' : 'Listen Voice Reply'}</span>
                            </button>

                            <span className="text-[9px] text-neutral-400">{m.time}</span>
                          </div>
                        )}

                        {!isBot && (
                          <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-neutral-500 dark:text-neutral-400">
                            <span>{m.time}</span>
                            <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-neutral-600 shadow-sm dark:bg-[#202c33] dark:text-neutral-300 w-fit">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    <span>AGNI Bot is solving problem...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="flex items-center gap-2 border-t border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-[#202c33]">
                <button
                  type="button"
                  title="Simulate textbook photo problem"
                  onClick={() =>
                    handleSend(
                      SAMPLE_BOT_PROBLEMS[0].prompt,
                      SAMPLE_BOT_PROBLEMS[0].imageMock
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder={`Ask anything in ${language} (e.g. Physics formula, NEET doubt, Code bug)...`}
                  className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />

                <button
                  type="button"
                  onClick={() => handleSend(undefined, undefined, false)}
                  disabled={!inputQuery.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Quick Starters & Direct Actions */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Instant Test Scenarios
                </h3>
              </div>

              <div className="space-y-2">
                {SAMPLE_BOT_PROBLEMS.map((prob, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      handleSend(
                        prob.prompt,
                        prob.imageMock,
                        prob.type === 'voice'
                      )
                    }
                    className="w-full text-left rounded-xl border border-neutral-200 p-2.5 transition hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-neutral-800 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      <span>{prob.label}</span>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 uppercase">
                        {prob.type}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2">
                      "{prob.prompt}"
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Real WhatsApp Click-to-Chat trigger */}
            <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-sm dark:border-emerald-900/50 dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900">
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 font-display">
                Share Bot with Study Groups
              </h4>
              <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Connect your WhatsApp group or study partner to AGNI for 24/7 collaborative learning.
              </p>
              <button
                type="button"
                onClick={() => {
                  const rawMsg = 'Hey! Check out AGNI - Made in India AI Tutor with voice notes, Tunglish/Hinglish explanations & textbook problem solving: ' + window.location.href;
                  try {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(rawMsg);
                    }
                  } catch {}
                  const msg = encodeURIComponent(rawMsg);
                  try {
                    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                  } catch {}
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Invite Friends on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Cloud Webhook Setup Instructions */
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Meta WhatsApp Cloud API Webhook Integration
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
              Connect AGNI's backend to your official Meta developer app to enable incoming voice messages and textbook photos from any user's real WhatsApp.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <span className="text-[11px] font-bold text-neutral-500 uppercase">
                  Callback URL (Webhook)
                </span>
                <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                  <span className="truncate">{webhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="shrink-0 rounded-lg p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <span className="text-[11px] font-bold text-neutral-500 uppercase">
                  Verify Token
                </span>
                <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                  <span>agni_whatsapp_secret_token</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('agni_whatsapp_secret_token');
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="shrink-0 rounded-lg p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestPing}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Test Webhook Ping</span>
              </button>
              {testStatus && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {testStatus}
                </span>
              )}
            </div>
          </div>

          {/* Telegram Webhook Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Telegram Bot Webhook Endpoint
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
              Register this webhook with Telegram BotFather using:
            </p>
            <div className="rounded-xl bg-neutral-950 p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
              curl -F "url={telegramWebhookUrl}" https://api.telegram.org/bot&lt;YOUR_BOT_TOKEN&gt;/setWebhook
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
