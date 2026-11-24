import { getNextKeyInCircle, hasAnyGroqKey, skipToNextKey } from '../../../../src/lib/groqRotation';

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
    const name = body.userName || 'buddy';
    const voiceSysPrompt = `You are AGNI — a friendly voice AI assistant made in India 🇮🇳 by Founders M. Sanjay & T. Hasini. You are speaking aloud to ${name}.
Answer ANY question directly and naturally. No fixed answers.
Keep replies SHORT and CONVERSATIONAL (2–3 sentences max). No markdown, no bullet points.
For jokes: tell funny jokes. For math: give the step/answer clearly. Call user "${name}" once if natural.`;

    const history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: voiceSysPrompt },
    ];

    if (Array.isArray(body.history)) {
      for (const m of body.history) {
        const role = m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user';
        const content = m.parts?.[0]?.text || m.text || m.content || '';
        if (content) history.push({ role, content });
      }
    }
    if (typeof body.message === 'string' && body.message.trim()) {
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
            temperature: 0.7,
            max_tokens: 300,
          }),
        });

        const data = await res.json();
        if (res.ok && data.choices?.[0]?.message?.content) {
          const content = data.choices[0].message.content.trim();
          return Response.json({ spokenReply: content, reply: content, text: content, role: 'assistant' });
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
