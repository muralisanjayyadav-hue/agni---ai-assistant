import 'dotenv/config';
import type { Request, Response } from 'express';
import Groq from 'groq-sdk';

export default async function handler(req: Request, res: Response) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('[Groq Whisper] GROQ_API_KEY not configured on server');
      return res.status(200).json({ text: '', error: 'GROQ_API_KEY missing on server' });
    }

    const { audioBase64, mimeType = 'audio/webm', language } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(200).json({ text: '' });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[^;]+;base64,/, '').trim();
    if (cleanBase64.length < 50) {
      return res.status(200).json({ text: '' });
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a')
      ? 'm4a'
      : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('wav')
      ? 'wav'
      : mimeType.includes('mp3')
      ? 'mp3'
      : 'webm';

    const file = await Groq.toFile(buffer, `audio.${ext}`, { type: mimeType });
    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: language && language !== 'auto' && language.length <= 3 ? language : undefined,
      response_format: 'json',
    });

    const text = (transcription.text || '').trim();
    return res.status(200).json({ text, transcription: text });
  } catch (err: any) {
    console.error('[Groq Whisper Error]', err?.message || err);
    return res.status(200).json({ text: '', error: err?.message || 'Transcription failed' });
  }
}
