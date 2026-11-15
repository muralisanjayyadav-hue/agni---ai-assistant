import 'dotenv/config';
import type { Request, Response } from 'express';

const SYSTEM_PROMPT = `You are AGNI, Made in India AI. Conceived & Founded by M. Sanjay & T. Hasini.
Answer ANY question in user language. No fixed answers.
You are a friendly, helpful, smart AI assistant like Jarvis.
Speak in English by default. If the user speaks Tamil, reply in Tamil + English mix (Tanglish).
Friendly, helpful, smart, and emotionally intelligent. 🇮🇳`;

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
];

export default async function handler(req: Request, res: Response) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GROQ_API_KEY') {
    return res.status(500).json({ error: 'GROQ_API_KEY missing or invalid - check Vercel' });
  }

  const body = req.body || {};
  let userMessage = body.message || body.text || '';
  const history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    for (const m of body.messages) {
      const role = m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user';
      const content = m.text || m.content || '';
      if (content) history.push({ role, content });
    }
  } else if (typeof userMessage === 'string' && userMessage.trim()) {
    history.push({ role: 'user', content: userMessage.trim() });
  }

  if (history.length <= 1) {
    return res.status(200).json({
      reply: 'Hii buddy! How can I help you today?',
      text: 'Hii buddy! How can I help you today?',
      role: 'assistant',
      content: 'Hii buddy! How can I help you today?',
    });
  }

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
          messages: history,
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
        return res.status(200).json({
          reply: answer.trim(),
          text: answer.trim(),
          role: 'assistant',
          content: answer.trim(),
          model,
        });
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  const errMsg = lastError?.message || JSON.stringify(lastError) || 'GROQ_API_KEY missing or invalid - check Vercel';
  return res.status(500).json({ error: errMsg });
}
