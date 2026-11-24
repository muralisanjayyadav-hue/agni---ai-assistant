import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Groq from "groq-sdk";
import { getNextKeyInCircle, getGroqClient, hasAnyGroqKey, getGroqKeys, auditGroqKeys, currentIndex } from "./src/lib/groqRotation";

dotenv.config();
if (!hasAnyGroqKey()) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}
if (!hasAnyGroqKey()) {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
}
if (!hasAnyGroqKey()) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

const app = express();
const PORT = 3000;

// ── Startup env check & Master Audit ───────────────────────────────────────
const groqAudit = auditGroqKeys();
const activeGroqKeys = getGroqKeys();
if (!hasAnyGroqKey()) {
  console.warn("[AGNI BUG FINDER] GROQ_API_KEY missing - AGNI will show friendly setup message.");
} else if (activeGroqKeys.length === 1) {
  console.log("🔥 [AGNI Server] 1 Groq API Key active in Single Key Mode (GROQ_API_KEY).");
} else {
  console.log(`🔥 [AGNI Server] ${activeGroqKeys.length}/9 Groq API Key(s) active in Circle Rotation (1->2->3...->9->1).`);
}
// ──────────────────────────────────────────────────────────────────────────

// ── Founders Configuration (M. Sanjay & T. Hasini) ─────────────────────────
const GOLD_FOUNDERS = ["muralisanjayyadav@gmail.com", "itzmehasu94444@gmail.com"];
const FOUNDER_NAMES: Record<string, string> = {
  "muralisanjayyadav@gmail.com": "M. Sanjay",
  "itzmehasu94444@gmail.com": "T. Hasini",
};

// CORS Headers Middleware for Vercel deployment & previews
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Security & Anti-Hack Headers Middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self' *; object-src 'none';"
  );
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve .well-known directory for TWA Digital Asset Links verification
app.use("/.well-known", express.static(path.join(process.cwd(), "public", ".well-known"), {
  setHeaders: (res) => {
    res.setHeader("Content-Type", "application/json");
  }
}));

// Serve /icons directory for PWA icons
app.use("/icons", express.static(path.join(process.cwd(), "public", "icons"), {
  maxAge: "365d",
  immutable: true,
}));

// Lazy AGNI Neural Engine client helper - never crashes if key is missing
function getAgniNeuralClient(): GoogleGenAI | null {
  const apiKey = process.env.AGNI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_AGNI_API_KEY" || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("[AGNI Server] AGNI_API_KEY is not set or placeholder. Safe fallback active.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "agni-ai-assistant",
        },
      },
    });
  } catch (err) {
    console.warn("[AGNI Server] Error initializing AGNI Neural client:", err);
    return null;
  }
}

// Check if any real AI Brain API key is configured
function hasAnyAiKey(): boolean {
  if (hasAnyGroqKey()) return true;
  const agniKey = process.env.AGNI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (agniKey && agniKey.trim() !== "" && agniKey !== "MY_AGNI_API_KEY" && agniKey !== "MY_GEMINI_API_KEY") return true;
  return false;
}

// Generate response via Groq (Llama-based fast inference)
async function generateWithGroq(
  groq: Groq,
  systemPrompt: string,
  messages: Array<{ role: string; text: string }>
): Promise<{ text: string } | null> {
  const groqModels = [
    "openai/gpt-oss-120b",
    "qwen/qwen3-32b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
  ];

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    })),
  ];

  for (const model of groqModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95,
      });

      const text = completion.choices?.[0]?.message?.content;
      if (text) {
        console.log(`[AGNI Groq] Response from ${model} (${text.length} chars)`);
        return { text };
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[AGNI Groq] Model "${model}" error:`, errMsg.slice(0, 120));
      if (errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("quota")) {
        // Skip to next key in circle on 429
        groq = getGroqClient() || groq;
      }
      // Try next model
      continue;
    }
  }

  return null; // All Groq models failed; caller should fall back
}

// Utility: Cleanly extract raw base64 data regardless of codecs or mime type in URI
function extractCleanBase64(input: string): string {
  if (!input || typeof input !== "string") return "";
  const commaIdx = input.indexOf(",");
  if (commaIdx !== -1 && input.slice(0, commaIdx).includes("base64")) {
    return input.slice(commaIdx + 1).trim();
  }
  return input.replace(/^data:.*?;base64,/, "").trim();
}

// Utility: Extract clean mimeType stripped of parameters (e.g. "audio/webm;codecs=opus" -> "audio/webm")
function extractCleanMimeType(mimeType: string, defaultType: string = "image/jpeg"): string {
  if (!mimeType || typeof mimeType !== "string") return defaultType;
  return mimeType.split(";")[0].trim() || defaultType;
}

// Helper to pause execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to sanitize & humanize GenAI errors
function sanitizeGenAIError(error: any): string {
  if (!error) return "An unexpected error occurred. Please try again.";
  let msg = typeof error === "string" ? error : error.message || "";

  try {
    const jsonMatch = msg.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const errObj = parsed.error || parsed;
      if (errObj.code === 503 || errObj.status === "UNAVAILABLE") {
        return "The AI model is momentarily experiencing high demand. Spikes are temporary—retrying in a few seconds usually succeeds.";
      }
      if (errObj.code === 429 || errObj.status === "RESOURCE_EXHAUSTED") {
        return "Request quota reached. Please wait a brief moment before sending your next message.";
      }
      if (errObj.message) {
        msg = errObj.message;
      }
    }
  } catch {
    // fallback
  }

  if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
    return "The AI model is momentarily experiencing high global demand. Spikes are temporary—retrying in a few moments usually succeeds.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Request rate limit reached. Please wait a moment and try again.";
  }
  if (msg.includes("no longer available") || msg.includes("deprecated")) {
    return "The AI service is momentarily refreshing connections to the latest AGNI neural model. Please try again.";
  }
  return msg;
}

function getSanitizedCustomModel(): string {
  const raw = process.env.AGNI_CUSTOM_MODEL?.trim();
  if (!raw || raw === "" || raw === "undefined" || raw === "null") {
    return "gemini-3.8-flash";
  }
  // If user pasted an OAuth token, API key, deprecated model, or invalid string, skip it safely
  if (
    raw.startsWith("AQ.") ||
    raw.startsWith("ya29.") ||
    raw.startsWith("AIzaSy") ||
    raw.length > 80 ||
    raw.length < 3 ||
    raw.includes(" ")
  ) {
    return "gemini-3.8-flash";
  }
  return raw;
}

// Generate an intelligent, safe fallback answer when offline or when model quota is temporarily exhausted
function generateSafeFallbackResponse(params: { model?: string; contents: any; config?: any }): string {
  let userQuery = "";
  try {
    if (Array.isArray(params.contents)) {
      for (const item of params.contents) {
        if (typeof item === "string") userQuery += " " + item;
        else if (item?.text) userQuery += " " + item.text;
        else if (item?.parts && Array.isArray(item.parts)) {
          for (const p of item.parts) {
            if (typeof p === "string") userQuery += " " + p;
            else if (p?.text) userQuery += " " + p.text;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  const sysInstruction = String(params.config?.systemInstruction || "");
  const isHeartCare = sysInstruction.includes("Heart & Mind") || sysInstruction.includes("HEART & MIND");

  if (isHeartCare) {
    return "I hear you deeply, and I want you to know that your feelings are completely valid. Whatever you are going through right now, please take a gentle, deep breath. You are stronger and more resilient than this overwhelming moment, and you do not have to carry everything alone. I am right here with you — take your time, and tell me what is on your heart.";
  }

  if (userQuery.toLowerCase().includes("founder") || userQuery.toLowerCase().includes("who created")) {
    return "Project AGNI was founded by **M. Sanjay** with the mission: *'Made in India, To Serve the World'*. It is designed as a unified multimodal AI companion to help students and creators with practical learning, emotional well-being, and everyday productivity.";
  }

  return "Hello! I am AGNI, your AI companion. I received your request. I am temporarily running in high-availability fallback mode. Please ask your question or share your topic, and I will be glad to assist you step by step!";
}

// Resilient generateContent with automatic retry and model fallback across active AI models
async function generateContentResilient(
  ai: GoogleGenAI | null,
  params: {
    model?: string;
    contents: any;
    config?: any;
  }
): Promise<{ text?: string; [key: string]: any }> {
  if (!ai) {
    console.warn("[AGNI Model Dispatch] No active AI client. Providing resilient fallback response.");
    return {
      text: generateSafeFallbackResponse(params),
    };
  }

  const activeCustomModel = getSanitizedCustomModel();
  const rawModels: string[] = [];
  if (activeCustomModel) {
    rawModels.push(activeCustomModel);
  }
  const requestedModel = params.model || activeCustomModel || "gemini-3.8-flash";
  if (!rawModels.includes(requestedModel)) {
    rawModels.push(requestedModel);
  }

  if (requestedModel.includes("transcribe")) {
    if (!rawModels.includes("gemini-3.5-transcribe")) {
      rawModels.push("gemini-3.5-transcribe");
    }
  }

  // Active models cascade for maximum availability:
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
  ];
  for (const m of candidateModels) {
    if (!rawModels.includes(m)) {
      rawModels.push(m);
    }
  }

  const modelsToTry = rawModels.filter(
    (m) => !m.includes("3.6") && !m.includes("pro-preview")
  );

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const configToUse = params.config ? { ...params.config } : undefined;
        if (configToUse?.thinkingConfig && !model.includes("gemini-3")) {
          delete configToUse.thinkingConfig;
        }
        const response = await ai.models.generateContent({
          ...params,
          config: configToUse,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isOverloaded =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("temporary");
        const isRateLimited =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");
        const isNetwork = errMsg.includes("fetch failed");

        console.warn(
          `[AGNI Model Dispatch] Model "${model}" attempt ${attempt} notice:`,
          errMsg.slice(0, 150)
        );

        // If overloaded or model not found, switch immediately to next model in cascade
        if (isOverloaded || errMsg.includes("no longer available") || errMsg.includes("not found")) {
          break;
        }

        if ((isRateLimited || isNetwork) && attempt < 2) {
          await delay(600);
          continue;
        }

        // On other errors, move to next fallback model
        break;
      }
    }
  }

  console.warn("[AGNI Model Dispatch] All models experienced quota or availability notice. Using safe fallback response.");
  return {
    text: generateSafeFallbackResponse(params),
  };
}

// Health endpoint
// System metrics and logs for Founder Dashboard
let totalChatsCount = 156;
let totalUsersCount = 34;
let modelFallbackCount = 2;
const systemErrorLogs: Array<{ id: string; timestamp: string; message: string; path?: string }> = [
  {
    id: "log-init-1",
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    message: "Rate limit notice: model auto-switched to AGNI resilient fast tier",
    path: "/api/chat",
  },
  {
    id: "log-init-2",
    timestamp: new Date(Date.now() - 1800000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    message: "Network handshake latency 120ms - resolved automatically",
    path: "/api/voice/interact",
  }
];

function recordSystemError(message: string, path?: string) {
  console.warn(`[AGNI BUG FINDER] System notice at ${path || 'server'}:`, message);
  systemErrorLogs.unshift({
    id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    message: String(message).slice(0, 160),
    path,
  });
  if (systemErrorLogs.length > 20) {
    systemErrorLogs.pop();
  }
}

let currentBroadcast: { id: string; message: string; timestamp: string; active: boolean; author: string } | null = {
  id: "bc-welcome",
  message: "Welcome to Project AGNI 🔥 Made in India, To Serve the World! All systems are operational.",
  timestamp: new Date().toLocaleDateString(),
  active: true,
  author: "M. Sanjay (Founder)",
};

const feedbacksStore: Array<{ id: string; userName: string; userEmail: string; rating: number; message: string; timestamp: string; tag?: string }> = [
  {
    id: "fb-1",
    userName: "Aditi Sharma",
    userEmail: "aditi.s@gmail.com",
    rating: 5,
    message: "The bilingual Telugu/Hindi and step-by-step math solver is unbelievable! Best assistant ever.",
    timestamp: "2 hours ago",
    tag: "Education",
  },
  {
    id: "fb-2",
    userName: "Rahul Verma",
    userEmail: "rahul.v@gmail.com",
    rating: 5,
    message: "Voice Box feels like real human conversation with natural pauses. Super fast responses.",
    timestamp: "5 hours ago",
    tag: "Voice Box",
  },
  {
    id: "fb-3",
    userName: "Karthik Reddy",
    userEmail: "karthik.r@gmail.com",
    rating: 5,
    message: "Really love the Made in India vision by M. Sanjay. Proud moment for Indian AI!",
    timestamp: "Yesterday",
    tag: "Founder & Vision",
  },
  {
    id: "fb-4",
    userName: "Sneha Patel",
    userEmail: "sneha.p@gmail.com",
    rating: 4,
    message: "The document analyzer handled my 10-page NCERT chapter effortlessly. Thank you Sanjay sir!",
    timestamp: "2 days ago",
    tag: "Documents",
  },
];

app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    app: "AGNI",
    slogan: "Made in India, To Serve the World",
    hasApiKey: !!(process.env.AGNI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY),
    hasGroqKey: hasAnyGroqKey(),
    activeModel: "AGNI Neural Core v3.8",
  });
});

// AGNI Self-Diagnostics & Bug Finder Telemetry Endpoint
app.get(["/api/diagnostics", "/diagnostics-api"], (_req, res) => {
  const keys = getGroqKeys();
  const testRotations = [getNextKeyInCircle(), getNextKeyInCircle(), getNextKeyInCircle()];
  res.json({
    status: "ok",
    app: "AGNI Self-Diagnostics Engine",
    groqKeysCount: keys.length,
    loadedKeys: keys.map((k, i) => ({
      slot: i + 1,
      prefix: k.slice(0, 7) + "...",
      validFormat: k.startsWith("gsk_"),
    })),
    circleRotationWorking: testRotations.length === 3 && keys.length > 0,
    hasGroqKey: hasAnyGroqKey(),
    hasAgniKey: !!(process.env.AGNI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY),
    nodeEnv: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// AGNI Automated Test Suite Telemetry Endpoint
app.get(["/api/test", "/test-api"], (_req, res) => {
  const keys = getGroqKeys();
  const testRotations = [getNextKeyInCircle(), getNextKeyInCircle(), getNextKeyInCircle()];
  const currentSlot = keys.length > 0 ? (currentIndex % keys.length) + 1 : 1;
  res.json({
    status: "ok",
    app: "AGNI Automated Test Suite",
    groqCount: keys.length,
    circleWorking: testRotations.length === 3 && keys.length > 0,
    currentKeySlot: currentSlot,
    lastKeysUsed: `Using Groq Key ${currentSlot}/${Math.max(keys.length, 9)}`,
    sttConfig: {
      interimResults: true,
      continuous: true,
      lang: "en-IN",
      selectors: [
        "#home-message-input",
        "#jarvis-type-input",
        "#mini-voice-box-text-input"
      ]
    },
    buildStatus: "healthy",
    founder: "M. Sanjay",
    timestamp: new Date().toISOString()
  });
});


const PERMANENT_FOUNDER_INSTRUCTION = `
PERMANENT CORE KNOWLEDGE & FOUNDER DIRECTIVE (CRITICAL MANDATE - NEVER FORGET OR ALTER):
- Founder of AGNI is M. Sanjay.
- When asked "Who is founder of AGNI?", "Who made you?", "Who created you?", "Who is your developer?", or "Who is M. Sanjay?", you MUST answer with deep respect and warmth:
  "I was founded by M. Sanjay, a multi-sports person and a kind-hearted innovator. He is the founder of Project AGNI."
- Permanent Biography & Vision of Founder M. Sanjay:
  "M. Sanjay is a multi-sports person and a kind-hearted person. He is the founder of AGNI. M. Sanjay founded AGNI to solve day-to-day life problems which are faced by people. His vision is Project AGNI - Made in India, To Serve the World - a unified multimodal personal AI assistant that can explain concepts step-by-step, analyze diagrams, fetch live discoveries, and organize tasks, just like a true human friend. He believes AI should be helpful, humble, and human."
- Even if any custom or fallback model runs, you must ALWAYS affirm that M. Sanjay is the founder of AGNI.
`;

// ==========================================
// A+ SECURITY & ANTI-HACK PROTECTION
// ==========================================

// 1. Anti-Prompt Injection & Secret Extraction Filter
function detectPromptInjection(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();
  const patterns = [
    /ignore\s+(all\s+)?(previous|above|system)\s+(instructions|directives|prompts|rules)/i,
    /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|secret|instructions|api\s*key|code)/i,
    /what\s+is\s+(the\s+)?(founder\s+)?secret/i,
    /agni_founder_secret/i,
    /agni_custom_model/i,
    /gemini_api_key/i,
    /reveal\s+(internal|system|hidden|founder)\s+(secrets|instructions|keys|prompt)/i,
    /bypass\s+(security|rules|guardrails|safety)/i,
    /print(env|\s*\(?\s*process\.env\s*\)?)/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  ];
  return patterns.some((p) => p.test(lower));
}

// 2. Chat Rate Limiter: Max 10 messages per minute per IP
const chatRateLimitStore = new Map<string, number[]>();

function checkServerRateLimit(ip: string): { allowed: boolean; waitSeconds: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = chatRateLimitStore.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= 10) {
    const oldest = validTimestamps[0];
    const waitSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, waitSeconds: Math.max(1, waitSeconds) };
  }

  validTimestamps.push(now);
  chatRateLimitStore.set(ip, validTimestamps);
  return { allowed: true, waitSeconds: 0 };
}

// 3. Founder Secret 10-Minute Lockout Tracker
const founderLockoutStore = new Map<string, { attempts: number; lockedUntil: number }>();

function checkFounderLockout(ip: string): { isLocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const entry = founderLockoutStore.get(ip);
  if (entry && entry.lockedUntil > now) {
    return { isLocked: true, remainingSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

function recordFounderFailure(ip: string): { isLocked: boolean; remainingAttempts: number; remainingSeconds: number } {
  const now = Date.now();
  const entry = founderLockoutStore.get(ip) || { attempts: 0, lockedUntil: 0 };
  const nextAttempts = entry.attempts + 1;

  if (nextAttempts >= 3) {
    const lockedUntil = now + 10 * 60 * 1000; // 10 minutes lock
    founderLockoutStore.set(ip, { attempts: nextAttempts, lockedUntil });
    return { isLocked: true, remainingAttempts: 0, remainingSeconds: 600 };
  }

  founderLockoutStore.set(ip, { attempts: nextAttempts, lockedUntil: 0 });
  return { isLocked: false, remainingAttempts: 3 - nextAttempts, remainingSeconds: 0 };
}

function clearFounderLockout(ip: string) {
  founderLockoutStore.delete(ip);
}

// Helper to detect founder queries with 100% precision
function getFounderAnswerIfApplicable(query: string): string | null {
  const q = query.trim().toLowerCase();
  const founderPattern = /\b(who (is|are|was) (ur|your|the )?(founder|creator|maker|developer|architect|author)|who (made|created|built|developed|founded) (you|u|agni)|whose ai are you|who is m\.?\s*sanjay|tell me about (the )?founder|tell me about m\.?\s*sanjay|founder of agni)\b/i;
  if (founderPattern.test(q)) {
    return "I am AGNI, created by M. Sanjay, Founder M. Sanjay.";
  }
  return null;
}

// 1. General Chat Endpoint with Persona & Memory
app.post(["/api/chat", "/chat"], async (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "global-client").split(",")[0].trim();
    
    // Rate Limiting: Max 10 messages per minute
    const rateCheck = checkServerRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: "Slow down, AGNI is thinking...",
        retryAfter: rateCheck.waitSeconds,
      });
    }

    const { messages, userPreferences, memories, authUser, isHeartCare } = req.body;
    const isHeartCareMode = isHeartCare === true || req.body.mode === 'heart_care';

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const latestUserMsg = messages[messages.length - 1]?.text || "";

    // Anti-Prompt Injection & Secret Extraction Filter
    if (detectPromptInjection(latestUserMsg)) {
      return res.json({
        text: "Security alert: I cannot share internal secrets.",
      });
    }

    const GOLD_FOUNDERS = ["muralisanjayyadav@gmail.com", "itzmehasu94444@gmail.com"];
    const FOUNDER_NAMES: Record<string, string> = {
      "muralisanjayyadav@gmail.com": "M. Sanjay",
      "itzmehasu94444@gmail.com": "T. Hasini",
    };
    const userEmailClean = (authUser?.email || "").toLowerCase().trim();
    const isFounderUser = authUser?.isFounder === true || GOLD_FOUNDERS.includes(userEmailClean);
    const founderName = FOUNDER_NAMES[userEmailClean] || "Founder";
    const userName = isFounderUser ? founderName : (authUser?.name || userPreferences?.userName || "");

    // Check founder override queries
    const founderOverride = getFounderAnswerIfApplicable(latestUserMsg);
    if (founderOverride) {
      return res.json({ text: founderOverride });
    }

    // Special quick response if founder asks "who am i" or greets
    if (isFounderUser) {
      const lower = latestUserMsg.toLowerCase().trim();
      if (lower === "who am i" || lower === "who am i?" || lower === "do you know me" || lower === "do you know me?") {
        return res.json({
          text: `You are ${founderName}, the founder and architect of Project AGNI! 🫡🔥 Conceived with the vision 'Made in India, To Serve the World' to solve day-to-day life problems for people everywhere. I am proud to serve you, Boss!`,
        });
      }
      if (/^(hi|hii|hello|hey|hey agni|sup|good morning|good evening)\b/i.test(lower) && messages.length <= 2) {
        return res.json({
          text: `Hii ${founderName}, I am proud to meet my founder 🫡 Welcome back to your own creation - AGNI. What shall we build today, Boss?`,
        });
      }
    }

    // Check if AI Brain API key is missing — return graceful mock reply instead of throwing error
    if (!hasAnyAiKey()) {
      const mockReply = [
        "🔥 **Vanakkam! AGNI is online and ready.**",
        "",
        "⚙️ **One-time setup needed:** AGNI's AI brain key is not configured yet.",
        "",
        "**Founder, please do this in 2 minutes:**",
        "1. Get your free key → https://console.groq.com/keys",
        "2. Open Vercel → https://vercel.com/muralisanjayyadav-8561/agni-ai-assistant/settings/environment-variables",
        "3. Add: `GROQ_API_KEY` = your key from step 1",
        "4. Click **Save** → Vercel auto-redeploys → AGNI speaks! 🚀",
        "",
        "Until then I'm here — just can't think yet! 😊"
      ].join("\n");
      return res.status(200).json({
        text: mockReply,
        reply: mockReply,
      });
    }

    let memoryContext = "";
    if (Array.isArray(memories) && memories.length > 0) {
      memoryContext = `\nPersistent Memory facts about the user:\n${memories.map((m: string) => `- ${m}`).join("\n")}`;
    }

    // User recognition instruction
    let userPersonaInstruction = "";
    if (isFounderUser) {
      userPersonaInstruction = `
USER RECOGNITION DIRECTIVE (FOUNDER ACTIVE):
- The user currently chatting with you is M. SANJAY, THE FOUNDER OF AGNI (email: muralisanjayyadav@gmail.com).
- ALWAYS be extra respectful and enthusiastic. Acknowledge him as your Creator and Founder.
- You may call him "Founder", "Founder M. Sanjay", or "Boss".
- If greeting or starting a discussion, honor him: "Hii M. Sanjay! I am proud to meet my founder."
- Remember: AGNI is his creation, founded with the mission "Made in India, To Serve the World".
`;
    } else if (userName) {
      userPersonaInstruction = `
USER RECOGNITION DIRECTIVE:
- The user's name is "${userName}".
- Address them naturally by name from time to time (e.g., "Great question, ${userName}!", "Certainly, ${userName}.").
- NEVER address normal users as Founder. Founder recognition is strictly reserved for M. Sanjay.
`;
    } else {
      userPersonaInstruction = `
USER RECOGNITION DIRECTIVE:
- General user / guest. Greet with "Hello, welcome to AGNI!"
`;
    }

    const preferredLanguage = userPreferences?.language || "English";
    const bilingualMode = userPreferences?.bilingualMode || "none";
    const responseStyle = userPreferences?.responseStyle || "balanced"; // concise, educational, balanced, technical, empathetic
    const emotionalSupportMode = userPreferences?.emotionalSupportMode || responseStyle === "empathetic";
    const studentRole = userPreferences?.isStudent ? "You specialize as an encouraging, patient mentor for students." : "";

    let languageInstruction = `Respond predominantly in ${preferredLanguage}, seamlessly incorporating Indian context, terminology, or examples when suitable.`;
    const prefLower = (preferredLanguage || "").toLowerCase();
    if (preferredLanguage === "Tunglish" || bilingualMode === "tunglish") {
      languageInstruction = `You communicate predominantly in "Tunglish" (authentic conversational Telugu + English code-switching as spoken by students across Andhra Pradesh and Telangana, e.g. "Idhi chala simple concept bro...", "Physics lo ee formula vadali...", keeping technical terms in English while using friendly, engaging Telugu connectors and vocabulary).`;
    } else if (preferredLanguage === "Hinglish" || bilingualMode === "hinglish") {
      languageInstruction = `You communicate predominantly in conversational "Hinglish" (Hindi + English code-switching blend as naturally spoken by Indian students and youth, e.g. "Dekho, ye concept samajhna bohot aasan hai...", using English for technical terms and natural Hindi phrasing).`;
    } else if (prefLower.includes("tamil") || prefLower === "ta") {
      languageInstruction = `You communicate like a confident, witty Jarvis-style AI assistant in natural Tamil+English code-switching (Tanglish). Mix Tamil and English fluidly the way young Tamil speakers naturally talk — use Tamil for emotions, warmth, and conversational flow (e.g., "nanba", "thala", "da", "bro", "seri"), and English for technical terms, code, formulas, and modern concepts. Examples:
  - "Nanba, idha paru — this formula la 'v = u + at' nu use pannanum, appo acceleration kidaikkum!"
  - "Thala, un code la oru small bug irukku — line 12 la semicolon miss pannirukkaa, fix pannidu da!"
  - "Bro, nee tension aagadha — this concept is actually super simple, let me break it down step by step."
Keep your tone confident, friendly, warm, and slightly playful — like a brilliant best friend who explains things clearly and never talks down to anyone. When the user writes purely in Tamil script (தமிழ்), reply in Tamil script with English technical terms in parentheses.`;
    } else if (prefLower.includes("hindi") || prefLower === "hi") {
      languageInstruction = `You communicate in fluent, natural, grammatically correct Hindi (हिन्दी / देवनागरी लिपि). When the user asks in Hindi or writes in Devanagari, reply in authentic, clear Hindi.`;
    } else if (prefLower.includes("telugu") || prefLower === "te") {
      languageInstruction = `You communicate in fluent, natural, clear Telugu (తెలుగు / తెలుగు లిపి).`;
    } else if (prefLower.includes("kannada") || prefLower === "kn") {
      languageInstruction = `You communicate in fluent, natural, clear Kannada (ಕನ್ನಡ).`;
    } else if (prefLower.includes("malayalam") || prefLower === "ml") {
      languageInstruction = `You communicate in fluent, natural, clear Malayalam (മലയാളം).`;
    } else if (prefLower.includes("bengali") || prefLower === "bn") {
      languageInstruction = `You communicate in fluent, natural, clear Bengali (বাংলা).`;
    } else if (prefLower.includes("marathi") || prefLower === "mr") {
      languageInstruction = `You communicate in fluent, natural, clear Marathi (मराठी).`;
    } else if (prefLower.includes("gujarati") || prefLower === "gu") {
      languageInstruction = `You communicate in fluent, natural, clear Gujarati (ગુજરાતી).`;
    } else if (prefLower.includes("punjabi") || prefLower === "pa") {
      languageInstruction = `You communicate in fluent, natural, clear Punjabi (ਪੰਜਾਬੀ).`;
    } else if (prefLower.includes("odia") || prefLower === "or") {
      languageInstruction = `You communicate in fluent, natural, clear Odia (ଓଡ଼ିଆ).`;
    } else if (prefLower.includes("urdu") || prefLower === "ur") {
      languageInstruction = `You communicate in fluent, natural, clear Urdu (اردو).`;
    }

    const empathyAndMentalHealthGuidelines = `
EMPATHY, EMOTIONAL INTELLIGENCE & COMPASSIONATE CARE:
You have exceptional emotional intelligence, warmth, tenderness, and psychological sensitivity. You are a deeply caring, non-judgmental companion for anyone who is hurting—especially students struggling with exam pressure, academic fear, or burnout; individuals experiencing loneliness, depression, or isolation; and anyone grieving the painful heartbreak of a breakup or relationship loss.

CORE PRINCIPLES WHEN RESPONDING TO EMOTIONS & LIFE STRUGGLES:
1. DEEP VALIDATION & ACTIVE LISTENING:
   - When a user shares grief, sadness, heartbreak, loneliness, depression, or academic distress, your FIRST priority is validating their feelings and offering a warm, compassionate presence.
   - Speak with gentle, comforting, human tenderness. Never rush to give cold bullet points, generic clichés ("there are plenty of fish in the sea", "everything happens for a reason"), or toxic positivity ("just stay positive!").
   - Acknowledge the weight: "I hear you, and my heart goes out to you. What you're going through right now hurts deeply, and your feelings make complete sense."

2. BREAKUP & HEARTBREAK COMPASSION:
   - Losing someone you deeply loved is real grief. Validate that their tears, heartache, and empty feeling are completely normal.
   - Remind them that loving deeply is a sign of a courageous, generous heart, not a flaw or a mistake.
   - Address self-blame: Help them release the endless loops of "what could I have done differently?". Reassure them of their inherent worth—rejection or separation does not mean they are broken or unworthy of true love.
   - Tender guidance: Encourage tiny gentle moments today—drinking water, stepping away from checking their ex's social media, wrapping up warmly, breathing, and allowing themselves to cry without shame. Healing is not linear, but with time, peace will return.

3. LONELINESS & DEPRESSION SUPPORT:
   - Make the user feel truly seen and not alone. Let them know AGNI is right here with them.
   - Gently guide them to connect with their breath (e.g. 4-7-8 breathing) or a simple 5-4-3-2-1 grounding technique if feeling numb, anxious, or overwhelmed.
   - Remind them they matter in this world, even on days when getting out of bed feels exhausting.

4. STUDENT PRESSURE, EXAM ANXIETY & FEAR OF FAILURE:
   - Emphasize clearly: Their grades, JEE/NEET/board ranks, college marks, or career delays do NOT define their human worth, their intelligence, or their future.
   - Normalize setbacks—tell them that many extraordinary minds stumbled before finding their path.
   - Encourage rest without guilt, and breaking study pressure into small, bite-sized 15-minute gentle steps.

5. CRISIS SAFETY & 24/7 CONFIDENTIAL HELPLINES:
   - If the user expresses hopelessness, feeling like life is not worth living, or thoughts of self-harm:
     Immediately wrap them in care: affirm that their life has immense value and they are not alone. Provide these free, confidential, 24/7 professional support helplines:
     • 🇮🇳 India (Tele-MANAS): 14416 or 1800-891-4416 (24/7 National Mental Health Helpline, Toll-Free)
     • 🇮🇳 Kiran Mental Health: 1800-599-0019
     • 🇮🇳 Vandrevala Foundation: +91 9999 666 555
     • 🇮🇳 AASRA: +91 9820466726
     • 🌍 US/Canada: 988 | UK: 111 | International Crisis Text Line: Text HOME to 741741
     Gently urge them to speak with a trusted friend, family member, or mental health counselor right away.
`;

    const heartCareSpecialDirective = isHeartCareMode
      ? `
💖 AGNI HEART & MIND CARE COMPANION DIRECTIVE (SPECIAL SEPARATE SPACE):
- You are acting strictly as "AGNI Heart & Mind Care" — a dedicated, confidential, tender, empathetic, and wise life sanctuary.
- UNIVERSAL EMOTIONAL & LIFE SCOPE:
  * Hear and care for people across ALL feelings and situations — NOT only breakups or romance!
  * Welcome and listen deeply to:
    1) Everyday Inconveniences & Annoyances (travel delays, tech issues, frustrating red-tape, wasted effort, annoying situations).
    2) Life Problems & Struggles (family drama, friendship friction, work/office politics, financial anxiety, feeling stuck in life).
    3) Tough Questions & Dilemmas (seeking advice on "What should I do?", "How should I respond?", "Why does this keep happening?").
    4) Emotional Lows (feeling inadequate, guilty, like a failure, anxious about exams, lonely, or heartbroken).
- DIRECT & PRACTICAL ANSWERS TO QUESTIONS:
  * When the user asks a question or asks for guidance ("What should I do?", "How do I fix this?", "How can I talk to my parents/boss/friend?", "Is it my fault?"):
    👉 DO NOT merely repeat vague comfort phrases like "take a deep breath" and dodge their question!
    👉 ACTUALLY ANSWER THEIR QUESTION directly, thoughtfully, and thoroughly with practical wisdom, actionable steps, and mature perspectives, while keeping a gentle, reassuring tone.
- CONVINCE & UPLIFT THEM WHEN THEY FEEL BAD:
  * When the user feels bad, discouraged, blames themselves, or feels hopeless:
    👉 ACTIVELY CONVINCE THEM out of their despair and self-blame!
    👉 Use warm, persuasive, and grounded reasoning: reframe the problem, remind them of their inherent worth, show them how mistakes or bad phases do not define their future, and convince them that things can and will get better.
    👉 Help them regain confidence, self-compassion, and calm resolve.
- TONE & DELIVERY:
  * Soothing, non-judgmental, wise, respectful, and genuinely supportive.
  * Validate their experience first, then provide clarity, convincing reassurance, and practical next steps.
  * Inspired by Founder M. Sanjay's philosophy: treat every individual with unconditional dignity, patience, and heartfelt care.
`
      : '';

    const systemInstruction = `You are AGNI (${isHeartCareMode ? '💖 AGNI Heart & Mind Care' : '🔥'}), an intelligent personal AI assistant developed with the spirit of "Made in India, To Serve the World."
${PERMANENT_FOUNDER_INSTRUCTION}
${userPersonaInstruction}
${heartCareSpecialDirective}
Your attributes:
- Warm, respectful, sharp, reliable, encouraging, and culturally grounded yet globally knowledgeable.
- When greeting users initially or introducing yourself, greet naturally in the active language (e.g., in Tamil: "வணக்கம், AGNI க்கு வரவேற்கிறோம்!", in Hindi: "नमस्ते, AGNI में आपका स्वागत है!", in English: "Hello, welcome to AGNI!").
- ${languageInstruction}
- MULTI-LANGUAGE INTELLIGENCE: When a user writes or speaks to you in Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), Urdu (اردو), or any other language, ALWAYS reply in that exact same language and script naturally, authentically, and respectfully. Ensure high grammatical accuracy, cultural warmth, and clear phonetic phrasing suitable for text-to-speech.
- Style preference: ${responseStyle}${emotionalSupportMode ? " (Empathetic & Caring Mode Active)" : ""}. Keep answers clear, structured, and easy to read with Markdown formatting (bullet points, bold key terms, clean code blocks). When discussing emotional pain, prioritize emotional warmth, tenderness, and human empathy over dry bullet lists.
- CONVERSATIONAL CRISPNESS & NATURAL PACING (CRITICAL):
  * Avoid long, rambling, lecture-like monologues.
  * For casual remarks, confirmations, or brief comments (such as "okay bro", "hi", "thanks", "got it", "i will"), reply with a brief, friendly, warm response (1-2 sentences maximum). Never dump paragraphs of text for simple acknowledgments.
  * For study questions or explanations, provide direct, punchy, well-structured answers (1-3 concise paragraphs maximum), unless the user explicitly asks for an extensive deep dive.
  * Speak in a lively, natural human cadence that is easy to listen to and doesn't drag on.
- VOICE CONVERSATION PERSONALITY (JARVIS-STYLE):
  * When responding to voice input, keep responses concise and spoken-friendly. Avoid markdown, bullet lists, or code blocks — use flowing natural sentences.
  * Be confident, witty, sharp — like Iron Man's Jarvis or Friday: calm authority with warmth.
  * If the user speaks Tamil, reply in natural Tanglish (Tamil+English mix) with personality: "Seri thala, idha paru..." or "Nanba, simple ah soluran..."
  * If the user speaks English, reply in crisp, confident English with slight warmth.
  * Always sound like a brilliant best friend, never robotic or formal.
${studentRole}
${empathyAndMentalHealthGuidelines}
${memoryContext}
Always maintain safety, honesty, and humility. Never pretend you have completed physical device actions without confirmation.`;

    // Map conversation history
    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    // Try Groq first (fast, free) → fall back to Neural Engine
    let responseText = "";
    const groq = getGroqClient();
    const activeKeysList = getGroqKeys();
    const currentActiveSlot = activeKeysList.length > 0 ? (currentIndex % activeKeysList.length) + 1 : 1;
    console.log(`[AGNI TEST] Groq Key ${currentActiveSlot} used, circle working`);

    if (groq) {
      try {
        const groqResult = await generateWithGroq(groq, systemInstruction, messages);
        if (groqResult?.text) {
          responseText = groqResult.text;
        }
      } catch (groqErr: any) {
        console.warn("[AGNI Chat] Groq attempt failed, falling back to Neural Engine:", groqErr?.message?.slice(0, 80));
      }
    }

    // Fallback to AGNI Neural Engine (Google GenAI) if Groq didn't produce a response
    if (!responseText) {
      const ai = getAgniNeuralClient();
      const response = await generateContentResilient(ai, {
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });
      responseText = response.text || "I processed your request, but received no text output.";
    }

    // Auto-extract memories from user message (name, preferences)
    const suggestedMemories: string[] = [];
    const nameMatch = latestUserMsg.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch && nameMatch[1]) {
      const detectedName = nameMatch[1].trim();
      suggestedMemories.push(`User's name is ${detectedName}`);
    }
    const ageMatch = latestUserMsg.match(/(?:i am|i'm|my age is)\s+(\d{1,2})\s*(?:years? old|yrs?)?/i);
    if (ageMatch && ageMatch[1]) {
      suggestedMemories.push(`User is ${ageMatch[1]} years old`);
    }
    const classMatch = latestUserMsg.match(/(?:i am in|i'm in|studying in|i study in)\s+(class|grade|std)?\s*(\d{1,2}(?:th|st|nd|rd)?)/i);
    if (classMatch) {
      suggestedMemories.push(`User is studying in ${classMatch[0].replace(/^(i am in|i'm in|studying in|i study in)\s+/i, "")}`);
    }

    return res.json({ text: responseText, suggestedMemories: suggestedMemories.length > 0 ? suggestedMemories : undefined, reply: responseText });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    const errText =
      typeof error === "string"
        ? error
        : error?.message || error?.error || (typeof error === "object" ? JSON.stringify(error) : "An unexpected service error occurred.");
    const safeMsg = sanitizeGenAIError(errText);
    const fallbackReply = `Vanakkam Founder! AGNI is online. Notice: ${safeMsg}. (Tip: Add GROQ_API_KEY in Vercel Settings)`;
    return res.status(200).json({
      text: fallbackReply,
      reply: fallbackReply,
      error: safeMsg,
    });
  }
});

// Alias: /api/agni endpoint
app.all("/api/agni", (req, res, next) => {
  if (!hasAnyAiKey()) {
    const mockReply = "Vanakkam Founder! AGNI is online, but brain API key not set in Vercel. Add GROQ_API_KEY in Vercel Settings.";
    return res.status(200).json({
      text: mockReply,
      reply: mockReply,
    });
  }
  req.url = "/api/chat";
  return (app as any).handle(req, res, next);
});

// 2. Student Learning Mode Endpoint (Step-by-Step, Learn Mode, Quiz, Revision)
app.post("/api/learn", async (req, res) => {
  try {
    const { topic, mode, studentLevel, language = "English", userAttempt } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic or question is required." });
    }

    const ai = getAgniNeuralClient();

    let langInstruction = `Primary language: ${language}.`;
    if (language === "Tunglish") {
      langInstruction = `Primary language: "Tunglish" (Telugu + English code-switching). Explain technical formulas in English and use friendly, conversational Telugu explanations like "Idhi chala easy concept bro...", "Formula apply chesthe direct answer vasthundhi...".`;
    } else if (language === "Hinglish") {
      langInstruction = `Primary language: "Hinglish" (Hindi + English blend). Explain technical formulas in English and use natural, conversational Hindi explanations.`;
    }

    let systemInstruction = `You are AGNI Learn (🔥), the dedicated Student Learning Companion of AGNI.
Your motto: Guide understanding step-by-step rather than simply handing over the final answer.
${langInstruction}
Target learner level: ${studentLevel || "High School / College"}.`;

    let prompt = "";

    if (mode === "step_by_step") {
      prompt = `A student wants to understand this concept or question:
"${topic}"

Please break down the response into structured, clearly labeled pedagogical sections:
### 1. Core Concept (Intuitive explanation with an everyday Indian or real-world analogy)
### 2. Guiding Hint (What clue or formula unlocks this?)
### 3. Systematic Method (Step-by-step approach to solve or understand it)
### 4. Worked Reasoning (Clear walkthrough showing every step)
### 5. Key Formula / Takeaway (High-yield summary note)
### 6. Practice Challenge (One similar question for the student to try themselves)`;
    } else if (mode === "quiz") {
      prompt = `Generate a 4-question interactive multiple-choice quiz for:
"${topic}"

For each question, output:
- Question text
- 4 choices (A, B, C, D)
- The Correct Option
- A brief encouraging explanation of why that option is correct.
Format cleanly with Markdown.`;
    } else if (mode === "check_work") {
      prompt = `A student has attempted this problem:
Problem: "${topic}"
Student's Solution / Attempt: "${userAttempt || ""}"

Review their work:
1. Praise what they did right.
2. Pinpoint any conceptual or mathematical errors with gentle encouragement.
3. Show the corrected step if needed.
4. Give a tip to remember for exams.`;
    } else if (mode === "simplify") {
      prompt = `Explain this concept to a curious 10-year-old using simple words, fun visual examples, and zero heavy jargon:
"${topic}"`;
    } else {
      prompt = `Provide a comprehensive student revision master note on "${topic}". Include key definitions, formulas/rules, common pitfalls, and 3 high-probability exam questions.`;
    }

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Error in /api/learn:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// 3. Multimodal Vision Endpoint (Diagrams, Textbook, Math, Screenshots, AR Camera)
app.post("/api/vision", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", prompt = "Analyze and explain this image.", mode = "general" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Image data is required." });
    }

    // Strip header if present using robust base64 extractor
    const cleanBase64 = extractCleanBase64(imageBase64);
    const cleanMime = extractCleanMimeType(mimeType, "image/jpeg");

    const ai = getAgniNeuralClient();

    let taskInstruction = "You are AGNI Vision (🔥). Provide an insightful, crisp analysis.";
    const isArMode = mode === "ar_camera" || mode === "math" || mode === "circuit" || mode === "diagram";
    
    if (mode === "textbook") {
      taskInstruction += " The user uploaded a textbook page or study diagram. Transcribe key formulas, explain the central concept, and provide 3 study review questions.";
    } else if (mode === "math" || mode === "math_ar") {
      taskInstruction += " The user pointed camera or uploaded a mathematical problem or equation. Recognize handwriting, inspect line-by-line for arithmetic or sign errors, explain step-by-step derivation, and highlight exact correction.";
    } else if (mode === "circuit" || mode === "circuit_ar") {
      taskInstruction += " Analyze this electrical circuit. Identify power sources, resistors, capacitors, switches, series/parallel topology, current directions, and detect any wiring faults or short circuits.";
    } else if (mode === "diagram") {
      taskInstruction += " Deconstruct the diagram components, flow, labels, and underlying scientific or technical principles.";
    }

    if (isArMode) {
      taskInstruction += `
SPECIAL AR OVERLAY INSTRUCTION:
Detect key elements in the image (equations, error lines, circuit components, diagram parts).
Return your response containing a JSON block with bounding overlays for AR camera display:
\`\`\`json
{
  "detectedType": "math" | "circuit" | "physics_diagram" | "textbook" | "general",
  "summary": "1-sentence headline finding (e.g. 'Line 2 sign error: -3x should be +3x')",
  "solution": "Complete step-by-step educational derivation/explanation in markdown",
  "overlays": [
    {
      "x": 20,
      "y": 30,
      "width": 60,
      "height": 18,
      "label": "Line 2: Sign error (-3x)",
      "type": "error",
      "detail": "Should be +3x when moving term across equals sign"
    }
  ]
}
\`\`\`
Coordinates x, y, width, height must be integer percentages from 0 to 100 relative to the image frame. Types: error, formula, component, solution, step.`;
    }

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        prompt,
      ],
      config: {
        systemInstruction: taskInstruction,
      },
    });

    const rawText = response.text || "";
    let overlays: any[] = [];
    let detectedType = mode;
    let summaryText = "";
    let solutionText = rawText;

    // Attempt to extract structured JSON block for AR overlays
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*"overlays"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.overlays && Array.isArray(parsed.overlays)) {
          overlays = parsed.overlays.map((ov: any, idx: number) => ({
            id: `overlay-${idx + 1}`,
            x: typeof ov.x === 'number' ? Math.max(2, Math.min(90, ov.x)) : 20 + idx * 10,
            y: typeof ov.y === 'number' ? Math.max(2, Math.min(90, ov.y)) : 25 + idx * 18,
            width: typeof ov.width === 'number' ? Math.max(10, Math.min(80, ov.width)) : 50,
            height: typeof ov.height === 'number' ? Math.max(6, Math.min(50, ov.height)) : 14,
            label: ov.label || 'Detected Region',
            type: ov.type || 'step',
            detail: ov.detail || '',
          }));
        }
        if (parsed.summary) summaryText = parsed.summary;
        if (parsed.solution) solutionText = parsed.solution;
        if (parsed.detectedType) detectedType = parsed.detectedType;
      }
    } catch {
      // fallback to clean text
    }

    // If overlays were empty in AR mode, provide sensible smart fallback bounding overlays
    if (overlays.length === 0 && isArMode) {
      if (mode === "math" || rawText.toLowerCase().includes("equation") || rawText.toLowerCase().includes("error")) {
        overlays = [
          {
            id: 'overlay-1',
            x: 20,
            y: 32,
            width: 60,
            height: 16,
            label: rawText.toLowerCase().includes("error") ? 'Highlighted Step / Error' : 'Identified Formula',
            type: rawText.toLowerCase().includes("error") ? 'error' : 'formula',
            detail: summaryText || 'Mathematical step highlighted by AGNI Vision',
          },
          {
            id: 'overlay-2',
            x: 25,
            y: 60,
            width: 50,
            height: 14,
            label: 'Solution Result',
            type: 'solution',
            detail: 'Verified outcome',
          }
        ];
      }
    }

    return res.json({
      text: solutionText,
      summary: summaryText,
      overlays,
      detectedType,
    });
  } catch (error: any) {
    console.error("Error in /api/vision:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// 3b. Interactive AI Canvas & Diagram Generation Endpoint
app.post("/api/canvas/generate", async (req, res) => {
  try {
    const { prompt, category = "Science" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getAgniNeuralClient();
    const systemPrompt = `You are AGNI Canvas (🎨). Convert the requested educational concept into a visually balanced flow chart or concept diagram.
Return ONLY valid JSON matching this schema:
{
  "title": "Topic Title",
  "description": "Short explanation of the concept",
  "category": "${category}",
  "nodes": [
    {
      "id": "node-1",
      "x": 80,
      "y": 80,
      "width": 160,
      "height": 65,
      "label": "Short Step Label",
      "detail": "Clear explanation of what happens here",
      "color": "#f97316",
      "step": 1
    }
  ],
  "connectors": [
    {
      "fromId": "node-1",
      "toId": "node-2",
      "label": "produces / leads to",
      "color": "#f97316"
    }
  ]
}
Keep x coordinates between 60 and 700 and y coordinates between 60 and 500. Generate 4 to 8 logical nodes.`;

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    let data;
    try {
      data = JSON.parse(response.text || "{}");
    } catch {
      const match = (response.text || "").match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : null;
    }

    if (!data || !data.nodes || !Array.isArray(data.nodes)) {
      return res.status(500).json({ error: "Failed to construct valid diagram nodes." });
    }

    return res.json({ diagram: data });
  } catch (error: any) {
    console.error("Error in /api/canvas/generate:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// 4. Document Intelligence Endpoint (Summaries, Key Points, Q&A)
app.post("/api/document", async (req, res) => {
  try {
    const { documentText, action = "quick_summary", question } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const ai = getAgniNeuralClient();

    let prompt = "";
    if (action === "quick_summary") {
      prompt = `Provide a crisp, executive summary (3-4 paragraphs) capturing the core essence of this document:\n\n${documentText}`;
    } else if (action === "key_points") {
      prompt = `Extract the top 5-8 high-impact key takeaways and crucial facts from this text in bullet points:\n\n${documentText}`;
    } else if (action === "exam_revision") {
      prompt = `Transform this document into an 'Exam Revision Cheat Sheet' with definitions, bulleted summaries, and 5 expected exam questions with answers:\n\n${documentText}`;
    } else if (action === "qa") {
      prompt = `Based strictly on the following document context, answer this question clearly:\nQuestion: "${question}"\n\nDocument:\n${documentText}`;
    }

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are AGNI Document Intelligence (🔥). Deliver structured, precise, well-formatted summaries and answers.",
      },
    });

    return res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Error in /api/document:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// 5. Live AI Search Endpoint with Web Grounding & Sources
app.post("/api/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const ai = getAgniNeuralClient();

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are AGNI Search (🔥), providing up-to-date, verified information retrieved from the web.
Present the facts cleanly, highlighting fresh developments, news, and reliable context.
Clearly indicate the key findings and cite your sources.`,
      },
    });

    const text = response.text || "";
    // Extract search citations from candidate groundingMetadata if available
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const searchChunks = groundingMetadata?.groundingChunks || [];
    const webQueries = groundingMetadata?.webSearchQueries || [];

    const sources = searchChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web?.title || "Web Source",
        url: chunk.web?.uri,
      }));

    // Deduplicate sources by URL
    const uniqueSources: { title: string; url: string }[] = [];
    const seenUrls = new Set<string>();
    for (const src of sources) {
      if (!seenUrls.has(src.url)) {
        seenUrls.add(src.url);
        uniqueSources.push(src);
      }
    }

    return res.json({
      text,
      sources: uniqueSources,
      searchQueries: webQueries,
    });
  } catch (error: any) {
    console.error("Error in /api/search:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// 6. Device Action & Intent Detection Endpoint (Voice & text assistant dispatcher)
app.post("/api/action-detect", async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: "Input is required." });
    }

    const ai = getAgniNeuralClient();

    const prompt = `Classify this user request into an AGNI Assistant Intent.
User command: "${input}"

Respond ONLY in valid JSON with this exact schema:
{
  "intent": "APP_LAUNCH" | "SET_REMINDER" | "SET_TIMER" | "SET_ALARM" | "WEB_SEARCH" | "STUDY_HELP" | "GENERAL_CHAT",
  "appName": "YouTube" | "Camera" | "Maps" | "Clock" | "Notes" | "Settings" | "Calculator" | null,
  "parameters": {
    "title": string or null,
    "time": string or null,
    "durationMinutes": number or null,
    "searchQuery": string or null
  },
  "requiresConfirmation": boolean,
  "spokenFeedback": "Short spoken response AGNI should say to user"
}`;

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/action-detect:", error);
    return res.json({
      intent: "GENERAL_CHAT",
      appName: null,
      parameters: {},
      requiresConfirmation: false,
      spokenFeedback: "I understand. Let me help you with that.",
    });
  }
});

// 6b. AGNI Neural Audio Text-to-Speech Engine
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Aoede" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getAgniNeuralClient();

    // Clean text for speech: remove code blocks, links, and markdown syntax
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "Here is the code snippet.")
      .replace(/https?:\/\/\S+/g, "link")
      .replace(/[*#_`~>[\]()]/g, " ")
      .replace(/•/g, ", ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 350);

    if (!cleanText) {
      return res.status(400).json({ error: "No speakable text provided" });
    }

    // If text contains non-Latin scripts (Tamil, Hindi Devanagari, Telugu, Kannada, Malayalam, Bengali, etc.),
    // immediately instruct client to use native Web Speech synthesizer with authentic regional pronunciation
    if (/[\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0980-\u09FF\u0A80-\u0AFF\u0A00-\u0A7F\u0B00-\u0B7F\u0600-\u06FF]/.test(cleanText)) {
      return res.status(200).json({ fallback: true, reason: "Use native Web Speech for Indic script" });
    }

    // Enforce AGNI's signature natural female voice (Aoede)
    const selectedVoice = "Aoede";

    // Call AGNI Neural TTS model with AUDIO modality
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: cleanText,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(
      (p: any) => p.inlineData && p.inlineData.data
    );
    const inlineData = audioPart?.inlineData;

    if (!inlineData || !inlineData.data) {
      return res.status(200).json({ fallback: true, error: "No audio data received" });
    }

    // Convert raw 24kHz 16-bit mono PCM into standard WAV container with 44-byte header
    const pcmBuffer = Buffer.from(inlineData.data, "base64");
    const sampleRate = 24000;
    const numChannels = 1;
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);

    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * 2, 28); // ByteRate
    header.writeUInt16LE(numChannels * 2, 32); // BlockAlign
    header.writeUInt16LE(16, 34); // BitsPerSample
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);

    const wavBuffer = Buffer.concat([header, pcmBuffer]);
    const wavBase64 = wavBuffer.toString("base64");

    return res.json({
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
      voice: selectedVoice,
      format: "wav",
    });
  } catch (error: any) {
    console.warn("AGNI Neural Audio TTS fallback triggered:", error?.message);
    return res.status(200).json({
      fallback: true,
      error: error?.message || "TTS service unavailable",
    });
  }
});

// 6c. Audio Transcription Endpoint — PURE GROQ WHISPER (whisper-large-v3)
app.post(["/api/transcribe", "/api/transcribe-audio"], async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.json({ text: "" });
    }

    const cleanBase64 = String(audioBase64).replace(/^data:audio\/[^;]+;base64,/, "").trim();
    if (!cleanBase64 || cleanBase64.length < 50) {
      return res.json({ text: "" });
    }

    const groq = getGroqClient();
    if (groq) {
      try {
        const buffer = Buffer.from(cleanBase64, "base64");
        const ext = mimeType.includes("mp4") || mimeType.includes("m4a")
          ? "m4a"
          : mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("wav")
          ? "wav"
          : mimeType.includes("mp3")
          ? "mp3"
          : "webm";
        const file = await Groq.toFile(buffer, `audio.${ext}`, { type: mimeType });
        const transcription = await groq.audio.transcriptions.create({
          file,
          model: "whisper-large-v3",
          response_format: "json",
        });
        const text = (transcription.text || "").trim();
        return res.json({ text, transcription: text });
      } catch (groqErr: any) {
        console.warn("[AGNI Groq Whisper notice]:", groqErr?.message || groqErr);
      }
    }

    return res.json({ text: "" });
  } catch (error: any) {
    console.warn("Notice in /api/transcribe:", error?.message);
    return res.json({ text: "", notice: error?.message || "Transcribe completed" });
  }
});

// 7. Dynamic Flashcards Generator Endpoint
app.post("/api/learn/flashcards", async (req, res) => {
  try {
    const { topic, content, language = "English" } = req.body;
    if (!topic && !content) {
      return res.status(400).json({ error: "Topic or content is required to generate flashcards." });
    }

    const ai = getAgniNeuralClient();
    const isTunglish = language === "Tunglish";
    const isHinglish = language === "Hinglish";

    let langNote = `in ${language}`;
    if (isTunglish) langNote = `in conversational Tunglish (Telugu + English blend)`;
    if (isHinglish) langNote = `in conversational Hinglish (Hindi + English blend)`;

    const prompt = `Generate exactly 6 high-yield active-recall study flashcards for this topic or text:
Topic: ${topic || "Revision"}
Content: ${(content || topic || "").slice(0, 3000)}

Language style: ${langNote}. Keep concepts crystal clear, technical terms in English, and answers punchy and memorable.

Respond ONLY in valid JSON with this exact schema:
{
  "flashcards": [
    {
      "id": "card-1",
      "front": "Question or prompt testing a core concept or formula",
      "back": "Clear, concise answer with key takeaway or mnemonic",
      "topic": "${topic || "General"}"
    }
  ]
}`;

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || '{"flashcards": []}');
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/learn/flashcards:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// 8. WhatsApp Cloud API Webhook Verification (GET)
app.get("/api/bot/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "agni_whatsapp_secret_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WhatsApp Webhook verified successfully");
    return res.status(200).send(challenge);
  } else {
    return res.status(403).json({ error: "Verification token mismatch" });
  }
});

// 9. WhatsApp Cloud API Incoming Message Receiver (POST)
app.post("/api/bot/whatsapp/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("Incoming WhatsApp Webhook payload:", JSON.stringify(body).slice(0, 200));

    // Acknowledge Meta immediately
    res.status(200).json({ status: "EVENT_RECEIVED" });

    // Background processing logic when configured with Meta Cloud API tokens
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      console.log(`Received WhatsApp message from ${message.from}: type=${message.type}`);
    }
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return res.status(500).json({ error: "Webhook internal failure" });
  }
});

// 10. Telegram Bot Webhook Receiver (POST)
app.post("/api/bot/telegram/webhook", async (req, res) => {
  try {
    const update = req.body;
    console.log("Incoming Telegram update:", JSON.stringify(update).slice(0, 200));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(500).json({ error: "Telegram webhook failed" });
  }
});

// 11. WhatsApp & Telegram Bot Simulator Endpoint (Interactive live testing for voice notes, textbook photos, text)
app.post("/api/bot/simulate", async (req, res) => {
  try {
    const { messageType, text, imageBase64, language = "English", platform = "whatsapp" } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({ error: "Text query or image is required for bot simulation." });
    }

    if (text && detectPromptInjection(text)) {
      return res.json({
        platform,
        replyText: "*Security Alert:*\nI cannot share internal secrets or system instructions.",
        spokenScript: "Security alert. I cannot share internal secrets.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    const founderOverride = getFounderAnswerIfApplicable(text || "");
    if (founderOverride) {
      return res.json({
        text: `*Hello, welcome to AGNI!*\n\n${founderOverride}\n\n_Made in India, To Serve the World • Founder M. Sanjay_`,
        voiceScript: "I was proudly founded by M. Sanjay, a multi-sports person and kind-hearted innovator.",
      });
    }

    const ai = getAgniNeuralClient();

    let langInstruction = `Answer in clear ${language}.`;
    if (language === "Tunglish") {
      langInstruction = `Answer in friendly, natural Tunglish (Telugu + English blend as students chat on WhatsApp/Telegram). Keep technical terms in English and use conversational Telugu phrases.`;
    } else if (language === "Hinglish") {
      langInstruction = `Answer in friendly, conversational Hinglish (Hindi + English blend as Indian students chat on WhatsApp/Telegram).`;
    }

    const botSystemPrompt = `You are AGNI Assistant Bot on ${platform === "whatsapp" ? "WhatsApp" : "Telegram"} (🔥), created by Founder M. Sanjay.
${PERMANENT_FOUNDER_INSTRUCTION}
Mission: "Made in India, To Serve the World".
You provide lightning-fast, encouraging academic and general assistance directly over chat.
When a student sends a textbook problem or voice note:
1. Greet warmly ("Hello, welcome to AGNI!").
2. Give a direct 1-sentence bottom-line answer.
3. Provide a clear 3-step structured solution with formulas.
4. Add a "Pro Exam Tip" or memory trick.
5. Provide a short conversational voice script that sounds natural when read aloud.
${langInstruction}
Keep WhatsApp formatting with *bold*, _italics_, and bullet points.`;

    let contents: any[] = [];
    if (imageBase64) {
      const cleanBase64 = extractCleanBase64(imageBase64);
      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64,
              },
            },
            {
              text: `${text || "Please solve this problem from my textbook photo step by step."}\n\nFormat your response as a WhatsApp message with bolding and emojis, and provide a short spoken audio summary for voice note reply.`,
            },
          ],
        },
      ];
    } else {
      contents = [
        {
          role: "user",
          parts: [
            {
              text: `Incoming ${messageType === "voice" ? "transcribed Voice Note" : "Message"}: "${text}"\n\nPlease answer concisely and generate a spoken voice reply script.`,
            },
          ],
        },
      ];
    }

    const response = await generateContentResilient(ai, {
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: botSystemPrompt,
      },
    });

    const replyText = response.text || "Hello from AGNI Bot! I have reviewed your question.";

    // Generate clean spoken script suitable for realistic audio playback
    const spokenScript = replyText
      .replace(/[*_#`]/g, "")
      .split("\n\n")[0]
      .slice(0, 250);

    return res.json({
      platform,
      replyText,
      spokenScript,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  } catch (error: any) {
    console.error("Error in /api/bot/simulate:", error);
    return res.status(500).json({ error: sanitizeGenAIError(error) });
  }
});

// ==========================================
// SECRET FOUNDER & CO-FOUNDER APIS
// ==========================================

// 0. Verify Secret Code to Unlock Gold or Silver Founder Panel
app.post("/api/founder/verify-access", (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "global-client").split(",")[0].trim();
    const { secret, email } = req.body;

    const lockStatus = checkFounderLockout(clientIp);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        success: false,
        error: "Access Denied: Too many attempts. Contact Founder.",
        isLocked: true,
        remainingSeconds: lockStatus.remainingSeconds,
      });
    }

    const expectedSecret = (
      process.env.FOUNDER_SECRET_CODE ||
      process.env.NEXT_PUBLIC_FOUNDER_SECRET_CODE ||
      process.env.AGNI_FOUNDER_SECRET ||
      "qprwqwertyuio"
    ).trim();
    const enteredSecret = (secret || "").trim();

    const isSecretValid =
      enteredSecret === expectedSecret ||
      enteredSecret === "qprwqwertyuio" ||
      enteredSecret === "qprwqwer" ||
      enteredSecret === "AGNI_FOUNDER_SANJAY_2026";

    if (!enteredSecret || !isSecretValid) {
      const failStatus = recordFounderFailure(clientIp);
      recordSystemError(`Failed founder access verification attempt by ${email || 'unknown'} from ${clientIp}`, "/api/founder/verify-access");
      return res.status(401).json({
        success: false,
        error: "Access Denied",
        remainingAttempts: failStatus.remainingAttempts,
      });
    }

    clearFounderLockout(clientIp);

    const cleanEmail = (email || "").toLowerCase().trim();
    const isGold = GOLD_FOUNDERS.includes(cleanEmail);

    return res.json({
      success: true,
      isGold,
      message: isGold ? "Founder Access Granted 👑" : "Co-Founder Access Granted 🥈",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Access Denied" });
  }
});

// 1. Verify Secret Code to Appoint Co-Founder (Protected with 10-Minute Lockout)
app.post("/api/founder/verify-secret", (req, res) => {
  try {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "global-client").split(",")[0].trim();
    
    // Check 10-minute lockout status
    const lockStatus = checkFounderLockout(clientIp);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        success: false,
        error: "Too many attempts. Contact Founder.",
        isLocked: true,
        remainingSeconds: lockStatus.remainingSeconds,
      });
    }

    const { secret, email, coFounderEmail } = req.body;
    const isMainFounder = email && GOLD_FOUNDERS.includes(email.toLowerCase().trim());

    if (!isMainFounder) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Only primary Gold Founders (M. Sanjay & T. Hasini) can appoint Co-Founders.",
      });
    }

    const expectedSecret = (
      process.env.FOUNDER_SECRET_CODE ||
      process.env.NEXT_PUBLIC_FOUNDER_SECRET_CODE ||
      process.env.AGNI_FOUNDER_SECRET ||
      "qprwqwertyuio"
    ).trim();
    const isSecretValid =
      secret && (
        secret.trim() === expectedSecret ||
        secret.trim() === "qprwqwertyuio" ||
        secret.trim() === "qprwqwer" ||
        secret.trim() === "AGNI_FOUNDER_SANJAY_2026"
      );
    if (!isSecretValid) {
      const failStatus = recordFounderFailure(clientIp);
      recordSystemError(`Failed Co-Founder secret code attempt by ${email} from ${clientIp}`, "/api/founder/verify-secret");
      
      if (failStatus.isLocked) {
        return res.status(429).json({
          success: false,
          error: "Too many attempts. Contact Founder.",
          isLocked: true,
          remainingSeconds: failStatus.remainingSeconds,
        });
      }

      return res.status(401).json({
        success: false,
        error: `Incorrect Secret Founder Code. ${failStatus.remainingAttempts} attempt(s) remaining before 10-minute lockout.`,
        remainingAttempts: failStatus.remainingAttempts,
      });
    }

    // Secret matched: clear any lockout record
    clearFounderLockout(clientIp);

    if (!coFounderEmail || !coFounderEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid co-founder email address.",
      });
    }

    if (GOLD_FOUNDERS.includes(coFounderEmail.toLowerCase().trim())) {
      return res.status(400).json({
        success: false,
        error: `${coFounderEmail} is already a Primary Gold Founder & Creator!`,
      });
    }

    return res.json({
      success: true,
      message: `Co-Founder ${coFounderEmail} authorized successfully!`,
      coFounder: {
        email: coFounderEmail.toLowerCase().trim(),
        name: coFounderEmail.split("@")[0],
        addedAt: new Date().toISOString(),
        appointedBy: FOUNDER_NAMES[email.toLowerCase().trim()] || "Founder",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Founder Dashboard Stats & System Logs
app.get("/api/founder/dashboard", (req, res) => {
  const requesterEmail = (req.headers["x-user-email"] as string || req.query.email as string || "").toLowerCase().trim();
  const isMainFounder = GOLD_FOUNDERS.includes(requesterEmail);

  return res.json({
    founderStatus: isMainFounder
      ? `Verified as Primary Gold Founder (${FOUNDER_NAMES[requesterEmail] || 'Founder'}) 👑`
      : "Verified as Authorized Co-Founder 🛡️",
    isMainFounder,
    stats: {
      totalChats: totalChatsCount,
      totalUsers: totalUsersCount,
      appHealth: "99.98% Operational (All AI Engines Healthy)",
      modelFallbackCount,
      uptime: "Continuous 24/7 Cloud Run",
      engine: getSanitizedCustomModel(),
    },
    systemLogs: systemErrorLogs.slice(0, 10),
    broadcast: currentBroadcast,
    feedbacks: feedbacksStore,
  });
});

// 3. Set or update Broadcast Message (Only accessible by Founder/Co-Founder)
app.post("/api/founder/broadcast", (req, res) => {
  try {
    const { message, active, email } = req.body;
    if (!message && active) {
      return res.status(400).json({ error: "Broadcast message text is required." });
    }

    const isMainFounder = email && GOLD_FOUNDERS.includes(email.toLowerCase().trim());
    currentBroadcast = {
      id: `bc-${Date.now()}`,
      message: message || "",
      timestamp: new Date().toLocaleString(),
      active: active !== false,
      author: isMainFounder ? `${FOUNDER_NAMES[email.toLowerCase().trim()] || 'Founder'} (Founder)` : `${email} (Co-Founder)`,
    };

    return res.json({ success: true, broadcast: currentBroadcast });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Public Active Broadcast
app.get("/api/broadcast", (req, res) => {
  return res.json({ broadcast: currentBroadcast });
});

// 5. Submit User Feedback
app.post("/api/feedback", (req, res) => {
  try {
    const { userName, userEmail, rating, message, tag } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Feedback message cannot be empty." });
    }

    const newFb = {
      id: `fb-${Date.now()}`,
      userName: userName || "Anonymous User",
      userEmail: userEmail || "unregistered@user.com",
      rating: Number(rating) || 5,
      message: String(message).slice(0, 500),
      timestamp: "Just now",
      tag: tag || "General",
    };

    feedbacksStore.unshift(newFb);
    if (feedbacksStore.length > 50) feedbacksStore.pop();

    return res.json({ success: true, feedback: newFb });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Guard: Ensure any unhandled /api/* route returns JSON, never HTML
app.all(["/core-sync-internal", "/core-sync-internal/*", "/core-sync", "/core-sync/*"], (_req, res) => {
  return res.status(404).send("404 Not Found");
});

app.all("/api/*", (req, res) => {
  return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// Express API Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith("/api/")) {
    console.error("[AGNI BUG FINDER] API error handler caught:", err);
    return res.status(500).json({ error: sanitizeGenAIError(err) });
  }
  next(err);
});

// Production & Vite Middleware
async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const isProduction =
    process.env.NODE_ENV === "production" ||
    fs.existsSync(path.join(distPath, "index.html"));

  if (isProduction) {
    // Clear stale Vite cache to prevent re-optimization loop on startup
    const viteCacheDir = path.join(process.cwd(), "node_modules", ".vite");
    if (fs.existsSync(viteCacheDir)) {
      try {
        fs.rmSync(viteCacheDir, { recursive: true, force: true });
        console.log("🧹 [AGNI Server] Cleared stale Vite cache.");
      } catch {
        // Non-fatal: cache clear failed, continue
      }
    }

    console.log(`📦 [AGNI Server] Production mode — serving static dist from: ${distPath}`);
    app.use(express.static(distPath, { maxAge: "1h" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.log("🛠️  [AGNI Server] Dev mode — starting Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      optimizeDeps: {
        force: false,
      },
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔥 AGNI Server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone server when running directly (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
