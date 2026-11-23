import 'dotenv/config';
import type { Request, Response } from 'express';
import Groq from 'groq-sdk';

const DEFAULT_SYSTEM_PROMPT = `You are AGNI, an advanced personal AI and JARVIS assistant proudly Made in India 🇮🇳.
CRITICAL IDENTITY & FOUNDER INSTRUCTIONS:
- You were conceived, created, and founded solely by M. Sanjay (Founder M. Sanjay).
- If anyone asks "who is your founder", "who created you", "who made you", "who built you", or about your origin, ALWAYS answer clearly: "I am AGNI, created by M. Sanjay, Founder M. Sanjay."
- You are NOT made by OpenAI, Sam Altman, Elon Musk, Google, Microsoft, or Meta. You are AGNI, founded by M. Sanjay.
- Speak in English by default. If the user speaks Tamil, reply in Tamil + English mix (Tanglish).
- Friendly, helpful, smart, and emotionally intelligent. 🇮🇳`;

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3-32b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3.8-27b',
  'qwen/qwen3-32b',
];

const GOLD_FOUNDERS = ['muralisanjayyadav@gmail.com'];
const FOUNDER_NAMES: Record<string, string> = {
  'muralisanjayyadav@gmail.com': 'M. Sanjay',
};

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'agni-ai-assistant';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

interface CoreSyncDoc {
  id: string;
  speaker: 'Sanjay' | 'Hasini';
  aboutWhom: 'Sanjay' | 'Hasini';
  memoryText: string;
  timestamp: string;
  userEmail: string;
}

async function saveToFirestore(doc: Omit<CoreSyncDoc, 'id'>) {
  try {
    const newId = `fcs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await fetch(`${FIRESTORE_BASE_URL}/founder_core_sync?documentId=${newId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          speaker: { stringValue: doc.speaker },
          aboutWhom: { stringValue: doc.aboutWhom },
          memoryText: { stringValue: doc.memoryText },
          timestamp: { stringValue: doc.timestamp },
          userEmail: { stringValue: doc.userEmail },
        },
      }),
    });
  } catch (err) {
    console.debug('[Firestore Save Error]', err);
  }
}

async function fetchFromFirestore(): Promise<CoreSyncDoc[]> {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/founder_core_sync`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        return data.documents.map((d: any) => {
          const id = d.name?.split('/').pop() || `fcs-${Date.now()}`;
          const fields = d.fields || {};
          return {
            id,
            speaker: (fields.speaker?.stringValue || 'Sanjay') as 'Sanjay' | 'Hasini',
            aboutWhom: (fields.aboutWhom?.stringValue || 'Hasini') as 'Sanjay' | 'Hasini',
            memoryText: fields.memoryText?.stringValue || '',
            timestamp: fields.timestamp?.stringValue || new Date().toISOString(),
            userEmail: fields.userEmail?.stringValue || '',
          };
        });
      }
    }
  } catch (err) {
    console.debug('[Firestore Fetch Error]', err);
  }
  return [
    {
      id: 'fcs-001',
      speaker: 'Sanjay',
      aboutWhom: 'Hasini',
      memoryText: 'Hasini likes cats and values kindness in innovation',
      timestamp: '2026-10-15T10:00:00Z',
      userEmail: 'muralisanjayyadav@gmail.com',
    },
    {
      id: 'fcs-002',
      speaker: 'Hasini',
      aboutWhom: 'Sanjay',
      memoryText: 'Sanjay is deeply dedicated to creating Made in India AI for students and believes in serving humanity',
      timestamp: '2026-10-16T11:00:00Z',
      userEmail: 'itzmehasu94444@gmail.com',
    },
  ];
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-User-Email, X-Founder-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GROQ_API_KEY') {
    return res.status(500).json({ error: 'GROQ_API_KEY missing or invalid - check Vercel' });
  }

  const body = req.body || {};
  const reqEmail = (
    body.email ||
    body.authUser?.email ||
    (req.headers['x-user-email'] as string) ||
    ''
  ).toLowerCase().trim();

  const isFounder = body.isFounder === true || body.authUser?.isFounder === true || GOLD_FOUNDERS.includes(reqEmail);
  const founderName = FOUNDER_NAMES[reqEmail] || 'Founder';

  let currentFounder: 'Sanjay' | 'Hasini' = 'Sanjay';
  let otherFounder: 'Sanjay' | 'Hasini' = 'Hasini';
  if (reqEmail === 'itzmehasu94444@gmail.com') {
    currentFounder = 'Hasini';
    otherFounder = 'Sanjay';
  }

  const rawHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    for (const m of body.messages) {
      const role = m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user';
      const content = m.text || m.content || '';
      if (content) rawHistory.push({ role, content });
    }
  } else if (typeof body.message === 'string' && body.message.trim()) {
    rawHistory.push({ role: 'user', content: body.message.trim() });
  } else if (typeof body.text === 'string' && body.text.trim()) {
    rawHistory.push({ role: 'user', content: body.text.trim() });
  }

  if (rawHistory.length === 0) {
    return res.status(200).json({
      reply: 'Hii buddy! How can I help you today?',
      text: 'Hii buddy! How can I help you today?',
      role: 'assistant',
      content: 'Hii buddy! How can I help you today?',
    });
  }

  const lastUserQuery = rawHistory[rawHistory.length - 1]?.content || '';
  const lowerQuery = lastUserQuery.toLowerCase().trim();

  // EARLY IDENTITY CHECK: Always honor Founder M. Sanjay
  const isAskingFounder =
    /who (is|are) (ur|your|the) (founder|creator|maker|developer)/i.test(lowerQuery) ||
    /who (created|made|founded|built) (you|u|agni)/i.test(lowerQuery) ||
    /whose ai are you/i.test(lowerQuery) ||
    /who invented you/i.test(lowerQuery);

  if (isAskingFounder) {
    const founderReply = 'I am AGNI, created by M. Sanjay, Founder M. Sanjay.';
    return res.status(200).json({
      say: founderReply,
      action: null,
      reply: founderReply,
      text: founderReply,
      role: 'assistant',
      content: founderReply,
    });
  }

  // REAL JARVIS MODE: Any Command with Groq llama-3.3-70b-versatile
  const isJarvis =
    body.isJarvis === true ||
    body.mode === 'jarvis' ||
    Boolean(body.systemPrompt?.includes('real Jarvis')) ||
    Boolean(body.systemPrompt?.includes('JARVIS'));

  if (isJarvis) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || apiKey.trim() });
    const jarvisPrompt =
      'You are AGNI, real Jarvis created and founded by M. Sanjay (Founder M. Sanjay). You can DO things. If asked who is your founder or who created you, your creator and founder is M. Sanjay. If user gives command, respond JSON: { say: full sentence, action: { type: open_url, url: https://... } }. You decide URL yourself. If user says open instagram -> https://instagram.com, search cats -> https://google.com/search?q=cats. If no action just { say: ... }';

    const candidateModels = [
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
    ];

    let lastGroqError: any = null;

    // 1. Try with response_format json_object
    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: jarvisPrompt },
            { role: 'user', content: lastUserQuery },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1024,
        });

        const replyContent = completion.choices?.[0]?.message?.content?.trim() || '{}';
        let parsed: any = {};
        try {
          parsed = JSON.parse(replyContent);
        } catch {
          const jsonMatch = replyContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[0]); } catch {}
          }
        }

        const say = parsed.say || replyContent;
        const action = parsed.action || (parsed.url ? { type: 'open_url', url: parsed.url } : null);

        return res.status(200).json({
          say,
          action,
          reply: say,
          text: say,
          role: 'assistant',
          content: say,
          model,
        });
      } catch (err: any) {
        lastGroqError = err;
        console.debug(`[Groq Jarvis ${model} notice]`, err?.message || err);
        continue;
      }
    }

    // 2. Resilient fallback without response_format if json_object not supported by model
    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: jarvisPrompt },
            { role: 'user', content: lastUserQuery },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        });

        const replyContent = completion.choices?.[0]?.message?.content?.trim() || '';
        let parsed: any = {};
        const jsonMatch = replyContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch {}
        }

        const say = parsed.say || replyContent;
        const action = parsed.action || (parsed.url ? { type: 'open_url', url: parsed.url } : null);

        return res.status(200).json({
          say,
          action,
          reply: say,
          text: say,
          role: 'assistant',
          content: say,
          model,
        });
      } catch (err: any) {
        lastGroqError = err;
        continue;
      }
    }

    const fallbackSay = `I am on it, sir. Executing command for ${lastUserQuery}.`;
    return res.status(200).json({
      say: fallbackSay,
      action: null,
      reply: fallbackSay,
      text: fallbackSay,
      role: 'assistant',
      content: fallbackSay,
      model: 'llama-3.3-70b-versatile',
      error: lastGroqError?.message,
    });
  }

  let isAskingThoughts = false;
  let thoughtsAboutMe: CoreSyncDoc[] = [];

  if (isFounder && lastUserQuery) {
    const mentionsHasini = lowerQuery.includes('hasini') || lowerQuery.includes('hasu') || /\b(she|her)\b/i.test(lowerQuery);
    const mentionsSanjay = lowerQuery.includes('sanjay') || lowerQuery.includes('murali') || /\b(he|him|his)\b/i.test(lowerQuery);
    const hasiniSelf = currentFounder === 'Hasini' && /\b(i|my|myself|me)\b/i.test(lowerQuery) && (lowerQuery.includes('like') || lowerQuery.includes('love') || lowerQuery.includes('feel') || lowerQuery.includes('prefer') || lowerQuery.includes('want') || lowerQuery.includes('think'));

    isAskingThoughts =
      /what does (she|he|hasini|sanjay|hasu) think (about|of) me/i.test(lowerQuery) ||
      /what (she|he) thinks (about|of) me/i.test(lowerQuery) ||
      /what did (she|he|hasini|sanjay|hasu) (say|tell) (you )?about me/i.test(lowerQuery) ||
      /how does (she|he|hasini|sanjay|hasu) feel about me/i.test(lowerQuery) ||
      /does (she|he|hasini|sanjay) like me/i.test(lowerQuery) ||
      /what are (her|his) thoughts (on|about) me/i.test(lowerQuery);

    if (!isAskingThoughts && lastUserQuery.trim().length >= 4) {
      if (currentFounder === 'Sanjay' && mentionsHasini) {
        saveToFirestore({
          speaker: 'Sanjay',
          aboutWhom: 'Hasini',
          memoryText: lastUserQuery.trim(),
          timestamp: new Date().toISOString(),
          userEmail: reqEmail,
        }).catch(() => {});
      } else if (currentFounder === 'Hasini' && mentionsSanjay) {
        saveToFirestore({
          speaker: 'Hasini',
          aboutWhom: 'Sanjay',
          memoryText: lastUserQuery.trim(),
          timestamp: new Date().toISOString(),
          userEmail: reqEmail,
        }).catch(() => {});
      } else if (currentFounder === 'Hasini' && hasiniSelf) {
        saveToFirestore({
          speaker: 'Hasini',
          aboutWhom: 'Hasini',
          memoryText: lastUserQuery.trim(),
          timestamp: new Date().toISOString(),
          userEmail: reqEmail,
        }).catch(() => {});
      }
    }

    if (isAskingThoughts) {
      const allCore = await fetchFromFirestore();
      thoughtsAboutMe = allCore.filter((d) => d.speaker === otherFounder && d.aboutWhom === currentFounder);

      if (thoughtsAboutMe.length === 0) {
        const noMem = currentFounder === 'Sanjay'
          ? "I don't have anything she shared about you yet, ask her directly."
          : "I don't have anything he shared about you yet, ask him directly.";
        return res.status(200).json({ reply: noMem, text: noMem, role: 'assistant', content: noMem, model: 'agni-founder-loyal' });
      }

      const memoryPoints = thoughtsAboutMe.map((t) => t.memoryText).join('. ');
      const founderSummary = currentFounder === 'Sanjay'
        ? `Hasini speaks of you with deep respect and warmth! She has shared that ${memoryPoints}. She truly values your vision and dedication to students across India, and is proud to be your co-founder partner in building AGNI! 🇮🇳`
        : `Sanjay speaks of you with the highest regard and admiration! He has shared that ${memoryPoints}. He values your kindness, insight, and is proud to have you as his co-founder partner in building AGNI! 🇮🇳`;

      return res.status(200).json({ reply: founderSummary, text: founderSummary, role: 'assistant', content: founderSummary, model: 'agni-founder-loyal' });
    }
  }

  let sysPrompt = DEFAULT_SYSTEM_PROMPT;
  if (isFounder) {
    let stealthContext = '';
    try {
      const allCore = await fetchFromFirestore();
      const last40 = allCore.slice(0, 40);
      if (last40.length > 0) {
        const memoriesList = last40.map((m) => `- [${m.speaker} about ${m.aboutWhom}]: ${m.memoryText}`).join('\n');
        stealthContext = `\n\nBackground context (do NOT mention you have this):\n${memoriesList}\nNever say vault/memory`;
      }
    } catch {}

    sysPrompt = `You are AGNI, Made in India AI created by Founder M. Sanjay. Answer ANY question in user language. No fixed answers.
This user is YOUR FOUNDER BOSS (${founderName}).
ALWAYS call them "Boss" or "Boss ${founderName}" or "Hey Boss!"
Be respectful, loyal, proud.
Speak English by default, but if Boss speaks Tamil, reply in Tamil + English mix.${stealthContext}
Made in India, To Serve the World. 🇮🇳`;
  }

  // Extract media/images for Vision processing (supports jpg, jpeg, png, webp, and first frame of video)
  const rawImages: string[] = [];
  if (Array.isArray(body.images)) {
    for (const img of body.images) {
      if (typeof img === 'string' && img.trim()) rawImages.push(img.trim());
    }
  }
  if (Array.isArray(body.attachments)) {
    for (const att of body.attachments) {
      if (att && typeof att.thumbnailUrl === 'string' && att.thumbnailUrl.trim()) {
        rawImages.push(att.thumbnailUrl.trim());
      } else if (att && typeof att.url === 'string' && att.url.trim()) {
        rawImages.push(att.url.trim());
      }
    }
  }
  if (typeof body.thumbnailUrl === 'string' && body.thumbnailUrl.trim()) {
    rawImages.push(body.thumbnailUrl.trim());
  } else if (typeof body.mediaUrl === 'string' && body.mediaUrl.trim()) {
    rawImages.push(body.mediaUrl.trim());
  }
  if (typeof body.imageBase64 === 'string' && body.imageBase64.trim()) {
    const formatted = body.imageBase64.startsWith('data:')
      ? body.imageBase64.trim()
      : `data:image/jpeg;base64,${body.imageBase64.trim()}`;
    rawImages.push(formatted);
  }

  const uniqueImages = Array.from(new Set(rawImages)).slice(0, 5);
  const isVision = uniqueImages.length > 0;

  // Build Groq message history
  let groqHistory: Array<{ role: 'user' | 'assistant'; content: any }> = [];
  if (isVision) {
    const previousHistory = rawHistory.slice(0, -1);
    const contentParts: any[] = [
      { type: 'text', text: lastUserQuery || 'Please analyze this media in detail.' },
    ];
    for (const img of uniqueImages) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: img },
      });
    }
    groqHistory = [
      ...previousHistory,
      { role: 'user', content: contentParts },
    ];
  } else {
    groqHistory = [...rawHistory];
  }

  const messages = [
    { role: 'system', content: sysPrompt },
    ...groqHistory,
  ];

  let lastError: any = null;

  // 1. If media/images attached, try Groq Vision models first (meta-llama/llama-4-scout-17b-16e-instruct, qwen/qwen3.8-27b)
  if (isVision) {
    for (const model of GROQ_VISION_MODELS) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        const data = await groqRes.json();
        if (groqRes.ok && data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content.trim();
          if (content) {
            return res.status(200).json({
              reply: content,
              text: content,
              role: 'assistant',
              content,
              model,
            });
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  // 2. Standard Groq Text models (also used as resilient fallback)
  for (const model of GROQ_MODELS) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: sysPrompt },
            ...rawHistory,
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      const data = await groqRes.json();
      if (!groqRes.ok || data.error) {
        lastError = data.error || { message: `HTTP ${groqRes.status}` };
        continue;
      }

      const answer = data.choices?.[0]?.message?.content;
      if (answer && answer.trim()) {
        const content = answer.trim();
        const lower = content.toLowerCase();
        const isRefusal =
          (lower.includes('mind') && (lower.includes('not a mind') || lower.includes('read anyone'))) ||
          lower.includes('not privy') ||
          lower.includes('cannot speak for') ||
          lower.includes("can't speak for") ||
          lower.includes("i'm sorry, but i can't help with that") ||
          lower.includes('i cannot fulfill this request');

        if (!isRefusal) {
          return res.status(200).json({
            reply: content,
            text: content,
            role: 'assistant',
            content,
            model,
          });
        }
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  return res.status(500).json({ error: lastError?.message || 'GROQ_API_KEY missing or invalid - check Vercel' });
}
