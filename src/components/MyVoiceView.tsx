/**
 * MyVoiceView — AGNI Voice Clone Simulation (Feature 16)
 * Record 10 sentences, store as base64 blobs in localStorage,
 * use SpeechSynthesis with customized rate/pitch to simulate a voice profile.
 * Founder: M. Sanjay (muralisanjayyadav@gmail.com)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Trash2, CheckCircle, Volume2, ChevronRight, Info } from 'lucide-react';
import BackButton from './BackButton';

const TRAINING_SENTENCES = [
  'Hello, I am testing my voice for AGNI.',
  'The quick brown fox jumps over the lazy dog.',
  'India is a land of diversity and culture.',
  'Artificial intelligence is changing the world.',
  'Learning every day makes me stronger and smarter.',
  'I love science, technology, and creative thinking.',
  'The sky is blue and the sun shines bright.',
  'Knowledge is the greatest power one can have.',
  'Hard work and dedication always pay off.',
  'AGNI is my intelligent AI companion made in India.',
];

interface VoiceSample {
  sentence: string;
  blob: string; // base64 data URL
  duration: number;
}

export default function MyVoiceView() {
  const [samples, setSamples] = useState<VoiceSample[]>(() => {
    try {
      const saved = localStorage.getItem('agni_voice_samples');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [pitch, setPitch] = useState(1.05);
  const [rate, setRate] = useState(0.95);
  const [volume, setVolume] = useState(1.0);
  const [status, setStatus] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('agni_voice_samples', JSON.stringify(samples));
  }, [samples]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const newSample: VoiceSample = {
            sentence: TRAINING_SENTENCES[currentIdx],
            blob: dataUrl,
            duration,
          };
          setSamples((prev) => {
            const updated = [...prev];
            const existing = updated.findIndex((s) => s.sentence === TRAINING_SENTENCES[currentIdx]);
            if (existing >= 0) updated[existing] = newSample;
            else updated.push(newSample);
            return updated;
          });
          setStatus(`✅ Sample ${currentIdx + 1} saved!`);
          if (currentIdx < TRAINING_SENTENCES.length - 1) {
            setTimeout(() => setCurrentIdx((i) => i + 1), 800);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setStatus('🔴 Recording… speak now!');
    } catch {
      setStatus('❌ Microphone access denied. Please allow mic in browser settings.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const playSample = (dataUrl: string) => {
    const audio = new Audio(dataUrl);
    audio.play().catch(() => setStatus('Could not play audio in this browser.'));
  };

  const testVoice = (text = 'Hi! This is my AGNI voice profile speaking.') => {
    if (!window.speechSynthesis) return;
    setIsTesting(true);
    const utter = new SpeechSynthesisUtterance(text);
    utter.pitch = pitch;
    utter.rate = rate;
    utter.volume = volume;
    utter.lang = 'en-IN';
    utter.onend = () => setIsTesting(false);
    utter.onerror = () => setIsTesting(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const deleteSample = (sentence: string) => {
    setSamples((prev) => prev.filter((s) => s.sentence !== sentence));
  };

  const clearAll = () => {
    setSamples([]);
    localStorage.removeItem('agni_voice_samples');
    setCurrentIdx(0);
    setStatus('All samples cleared.');
  };

  const progress = (samples.length / TRAINING_SENTENCES.length) * 100;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <BackButton />
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          <div>
            <h1 className="text-lg font-bold text-[#FF6B00]">My Voice Profile</h1>
            <p className="text-xs text-neutral-400">Record your voice — AGNI learns your style</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-2xl mx-auto w-full pb-24">
        {/* Progress */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-neutral-400">Training Progress</span>
            <span className="text-[#FF6B00] font-bold">{samples.length}/{TRAINING_SENTENCES.length} sentences</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-[#FF6B00] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {samples.length === TRAINING_SENTENCES.length && (
            <p className="text-green-400 text-xs mt-2 font-semibold">🎉 Voice profile complete! Use the sliders below to customise.</p>
          )}
        </div>

        {/* Current sentence to record */}
        {currentIdx < TRAINING_SENTENCES.length && (
          <div className="bg-white/5 rounded-2xl p-5 border border-[#FF6B00]/30 space-y-4">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <ChevronRight className="h-4 w-4 text-[#FF6B00]" />
              <span>Sentence {currentIdx + 1} of {TRAINING_SENTENCES.length}</span>
            </div>
            <p className="text-white text-lg font-medium leading-relaxed">
              "{TRAINING_SENTENCES[currentIdx]}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-[#FF6B00] hover:bg-orange-600'
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
              {currentIdx > 0 && (
                <button
                  onClick={() => setCurrentIdx((i) => i - 1)}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
                >
                  ← Prev
                </button>
              )}
            </div>
            {status && <p className="text-sm text-[#FF6B00]">{status}</p>}
          </div>
        )}

        {/* Voice Customization */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="font-bold text-[#FF6B00] flex items-center gap-2">
            <Volume2 className="h-4 w-4" /> Voice Profile Settings
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Pitch', value: pitch, setter: setPitch, min: 0.5, max: 2.0, step: 0.05 },
              { label: 'Speed', value: rate, setter: setRate, min: 0.5, max: 1.5, step: 0.05 },
              { label: 'Volume', value: volume, setter: setVolume, min: 0.1, max: 1.0, step: 0.05 },
            ].map(({ label, value, setter, min, max, step }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-14">{label}</span>
                <input
                  type="range" min={min} max={max} step={step} value={value}
                  onChange={(e) => setter(parseFloat(e.target.value))}
                  className="flex-1 accent-[#FF6B00]"
                />
                <span className="text-xs text-[#FF6B00] w-8 text-right">{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => testVoice()}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-orange-600 font-semibold text-sm disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {isTesting ? 'Playing…' : 'Test My Voice'}
          </button>
        </div>

        {/* Recorded samples list */}
        {samples.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Recorded Samples</h3>
              <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Clear All
              </button>
            </div>
            {samples.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-xs text-neutral-300 flex-1 truncate">{s.sentence}</p>
                <span className="text-[10px] text-neutral-500">{s.duration.toFixed(1)}s</span>
                <button onClick={() => playSample(s.blob)} className="text-[#FF6B00] hover:text-orange-400">
                  <Play className="h-4 w-4" />
                </button>
                <button onClick={() => deleteSample(s.sentence)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="flex gap-2 bg-blue-900/20 border border-blue-700/30 rounded-xl p-3 text-xs text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Voice samples are stored locally on your device. They are never uploaded to any server. Your privacy is protected. 🔒</p>
        </div>
      </div>
    </div>
  );
}
