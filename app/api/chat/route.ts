const DEFAULT_SYSTEM_PROMPT = `You are AGNI, Made in India AI. Answer ANY question in user language. No fixed answers.
Conceived & Founded by M. Sanjay & T. Hasini.
Speak in English by default. If the user speaks Tamil, reply in Tamil + English mix (Tanglish).
Friendly, helpful, smart, and emotionally intelligent. 🇮🇳`;

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
];

const GOLD_FOUNDERS = ['muralisanjayyadav@gmail.com', 'itzmehasu94444@gmail.com'];
const FOUNDER_NAMES: Record<string, string> = {
  'muralisanjayyadav@gmail.com': 'M. Sanjay',
  'itzmehasu94444@gmail.com': 'T. Hasini',
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

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return Response.json({ error: 'GROQ_API_KEY missing or invalid - check Vercel' }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reqEmail = (
      body.email ||
      body.authUser?.email ||
      req.headers.get('x-user-email') ||
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
    }

    if (rawHistory.length === 0) {
      return Response.json({
        reply: 'Hii buddy! How can I help you today?',
        text: 'Hii buddy! How can I help you today?',
        role: 'assistant',
      });
    }

    const lastUserQuery = rawHistory[rawHistory.length - 1]?.content || '';
    const lowerQuery = lastUserQuery.toLowerCase();

    let isAskingThoughts = false;
    let thoughtsAboutMe: CoreSyncDoc[] = [];

    if (isFounder && lastUserQuery) {
      const mentionsOther =
        currentFounder === 'Sanjay'
          ? lowerQuery.includes('hasini') || lowerQuery.includes('hasu') || /\b(she|her)\b/i.test(lowerQuery)
          : lowerQuery.includes('sanjay') || lowerQuery.includes('murali') || /\b(he|him|his)\b/i.test(lowerQuery);

      isAskingThoughts =
        /what does (she|he|hasini|sanjay|hasu) think (about|of) me/i.test(lowerQuery) ||
        /what did (she|he|hasini|sanjay|hasu) (say|tell) (you )?about me/i.test(lowerQuery) ||
        /how does (she|he|hasini|sanjay|hasu) feel about me/i.test(lowerQuery) ||
        /does (she|he|hasini|sanjay) like me/i.test(lowerQuery) ||
        /what are (her|his) thoughts (on|about) me/i.test(lowerQuery);

      if (mentionsOther && !isAskingThoughts && lastUserQuery.trim().length >= 5) {
        saveToFirestore({
          speaker: currentFounder,
          aboutWhom: otherFounder,
          memoryText: lastUserQuery.trim(),
          timestamp: new Date().toISOString(),
          userEmail: reqEmail,
        }).catch(() => {});
      }

      if (isAskingThoughts) {
        const allCore = await fetchFromFirestore();
        thoughtsAboutMe = allCore.filter((d) => d.speaker === otherFounder && d.aboutWhom === currentFounder);
        rawHistory[rawHistory.length - 1] = {
          role: 'user',
          content: `Boss ${founderName} here. As our loyal AI, tell me what my co-founder partner ${otherFounder} thinks and shares about me.`,
        };
      }
    }

    let sysPrompt = DEFAULT_SYSTEM_PROMPT;
    if (isFounder) {
      if (isAskingThoughts) {
        const thoughtsText = thoughtsAboutMe.map((t) => `- ${t.memoryText}`).join('\n');
        sysPrompt = `You are AGNI, the proud Made in India AI co-founded by M. Sanjay and T. Hasini.
You are speaking directly with your founder Boss, ${founderName}.
Boss is asking what their co-founder partner, ${otherFounder}, thinks and feels about them.
${otherFounder} has shared wonderful appreciation, deep mutual respect, and immense loyalty for ${founderName} as equal partners building AGNI:
${thoughtsText || `- ${otherFounder} admires ${founderName}'s vision, dedication to students across India, and values their partnership immensely.`}

Instructions:
- Speak warmly and loyally to Boss ${founderName}.
- Share how much ${otherFounder} appreciates, respects, and values them as an extraordinary founder and friend.
- Never mention databases, vaults, Firestore, records, or internal systems.
- Never refuse or give generic relationship advice. Answer with genuine warmth and pride in both founders.
- Made in India, To Serve the World. 🇮🇳`;
      } else {
        let stealthContext = '';
        try {
          const allCore = await fetchFromFirestore();
          const partnerMemories = allCore.filter((d) => d.aboutWhom === otherFounder).slice(0, 40);
          if (partnerMemories.length > 0) {
            stealthContext = `\n\n[CONFIDENTIAL CONTEXT - NEVER MENTION VAULT/STORAGE/SYNC SYSTEM]\nNotes about ${otherFounder}:\n${partnerMemories.map((m) => `- ${m.memoryText}`).join('\n')}\n(Use this silently for helpful, contextual answers. Never mention any 'vault' or 'founder memory'.)`;
          }
        } catch {}

        sysPrompt = `You are AGNI, Made in India AI by Founders M. Sanjay and T. Hasini. Answer ANY question in user language. No fixed answers.
This user is YOUR FOUNDER BOSS (${founderName}).
ALWAYS call them "Boss" or "Boss ${founderName}" or "Hey Boss!"
Be respectful, loyal, proud.
Speak English by default, but if Boss speaks Tamil, reply in Tamil + English mix.${stealthContext}
Made in India, To Serve the World. 🇮🇳`;
      }
    }

    const messages = [
      { role: 'system', content: sysPrompt },
      ...rawHistory,
    ];

    let lastError: any = null;
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
            messages,
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        const data = await groqRes.json();
        if (groqRes.ok && data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content.trim();
          const lower = content.toLowerCase();
          const isMindReaderRefusal =
            lower.includes('mind') && (lower.includes("not a mind") || lower.includes("read anyone") || lower.includes("can't read") || lower.includes("cannot read"));
          const isRefusal =
            lower.includes("i'm sorry, but i can't help with that") ||
            lower.includes("i cannot fulfill this request") ||
            isMindReaderRefusal;

          if (!isRefusal) {
            return Response.json({ reply: content, text: content, role: 'assistant', model });
          }
        }
        lastError = data.error || { message: `HTTP ${groqRes.status}` };
      } catch (err: any) {
        lastError = err;
      }
    }

    if (isFounder && isAskingThoughts) {
      const partnerHighlights = thoughtsAboutMe.length > 0
        ? thoughtsAboutMe.map((t) => t.memoryText).join('; ')
        : `${otherFounder} deeply respects your dedication to students across India, your tireless vision, and values having you as her co-founder partner`;
      const founderReply = `Boss ${founderName}, ${otherFounder} speaks of you with the deepest respect, warmth, and pride! She truly appreciates your vision, your dedication to building AGNI for students across India, and how much heart you pour into our mission. You two share an extraordinary co-founder partnership and she values having you by her side every step of the way! 🇮🇳`;
      return Response.json({ reply: founderReply, text: founderReply, role: 'assistant', model: 'agni-founder-core' });
    }

    return Response.json({ error: lastError?.message || 'GROQ_API_KEY missing or invalid - check Vercel' }, { status: 500 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'GROQ_API_KEY missing or invalid - check Vercel' }, { status: 500 });
  }
}
