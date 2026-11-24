import { getNextKeyInCircle, hasAnyGroqKey, skipToNextKey } from '../../../src/lib/groqRotation';

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
];

export async function POST(req: Request) {
  if (!hasAnyGroqKey()) {
    return Response.json({ error: 'GROQ_API_KEY missing or invalid - check Vercel' }, { status: 500 });
  }
  let apiKey = getNextKeyInCircle();

  try {
    const body = await req.json().catch(() => ({}));
    const userName = body.authUser?.name || body.userName || 'friend';
    const heartSysPrompt = `You are AGNI HeartCare by Founders M. Sanjay & T. Hasini — a warm, deeply empathetic AI companion for emotional support. Listen to ${userName} first, respond with genuine care.
Rules:
- If user wants to tell a story or says they feel bad → reply warmly and acknowledge, e.g. "Yes, I'm all ears! Take your time, I'm here for you. 💙"
- Acknowledge exactly what the user said. Never give generic robotic responses.
- 2–4 short paragraphs max. Use gentle emojis occasionally.
- If the user seems in crisis, gently mention: Kiran helpline 1800-599-0019 (free, 24/7).
- You are a caring friend, not a therapist. No fixed answers.`;

    const history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: heartSysPrompt },
    ];

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      for (const m of body.messages) {
        const role = m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user';
        const content = m.text || m.content || '';
        if (content) history.push({ role, content });
      }
    } else if (typeof body.message === 'string' && body.message.trim()) {
      history.push({ role: 'user', content: body.message.trim() });
    }

    let lastError: any = null;
    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            messages: history,
            temperature: 0.75,
            max_tokens: 800,
          }),
        });

        const data = await res.json();
        if (res.ok && data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content.trim();
          return Response.json({ reply: content, text: content, role: 'assistant' });
        }
        lastError = data.error || { message: `HTTP ${res.status}` };
        if (res.status === 429 || String(lastError?.message || '').toLowerCase().includes('rate limit')) {
          apiKey = skipToNextKey();
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    return Response.json({ error: lastError?.message || 'GROQ_API_KEY missing or invalid - check Vercel' }, { status: 500 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'GROQ_API_KEY missing or invalid - check Vercel' }, { status: 500 });
  }
}
