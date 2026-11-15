/**
 * ExamPredictorModal — NEET/JEE/TNPSC Score Predictor (Feature 14)
 * Reads weak areas from localStorage agni_memories, predicts score,
 * suggests 5 daily practice questions via Groq API.
 * Founder: M. Sanjay (muralisanjayyadav@gmail.com)
 */

import React, { useState, useEffect } from 'react';
import { Target, Brain, TrendingUp, Loader2, X, Zap, BookOpen } from 'lucide-react';

interface ExamPredictorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PredictionResult {
  exam: string;
  predictedScore: string;
  strengths: string[];
  weakAreas: string[];
  dailyQuestions: string[];
  tips: string[];
}

const EXAMS = [
  { id: 'neet', name: 'NEET (Medical)', fullMarks: 720 },
  { id: 'jee_main', name: 'JEE Main (Engineering)', fullMarks: 300 },
  { id: 'jee_adv', name: 'JEE Advanced', fullMarks: 360 },
  { id: 'tnpsc', name: 'TNPSC Group 1/2', fullMarks: 300 },
  { id: 'upsc', name: 'UPSC Prelims', fullMarks: 200 },
];

export function ExamPredictorModal({ isOpen, onClose }: ExamPredictorModalProps) {
  const [selectedExam, setSelectedExam] = useState(EXAMS[0]);
  const [selfRating, setSelfRating] = useState<Record<string, number>>({});
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const subjectsByExam: Record<string, string[]> = {
    neet: ['Physics', 'Chemistry', 'Biology (Botany)', 'Biology (Zoology)'],
    jee_main: ['Physics', 'Chemistry', 'Mathematics'],
    jee_adv: ['Physics', 'Chemistry', 'Mathematics'],
    tnpsc: ['Tamil', 'English', 'General Knowledge', 'Aptitude', 'Indian Polity', 'History', 'Geography'],
    upsc: ['History', 'Geography', 'Polity', 'Economy', 'Science', 'Environment', 'Current Affairs'],
  };

  const subjects = subjectsByExam[selectedExam.id] || [];

  useEffect(() => {
    // Reset ratings when exam changes
    const defaults: Record<string, number> = {};
    subjects.forEach((s) => { defaults[s] = 5; });
    setSelfRating(defaults);
    setPrediction(null);
  }, [selectedExam.id]);

  const getMemories = (): string => {
    try {
      const raw = localStorage.getItem('agni_memories');
      if (!raw) return 'No study data found.';
      const memories = JSON.parse(raw);
      if (!Array.isArray(memories)) return 'No study data found.';
      const studyMems = memories
        .filter((m: any) => m.category === 'study' || m.category === 'goal')
        .map((m: any) => m.content)
        .join('; ');
      return studyMems || 'No specific study memories found.';
    } catch {
      return 'No study data found.';
    }
  };

  const predict = async () => {
    setIsLoading(true);
    setError('');
    setPrediction(null);

    const ratingSummary = Object.entries(selfRating)
      .map(([subj, rating]) => `${subj}: ${rating}/10`)
      .join(', ');
    const memories = getMemories();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are AGNI Exam Predictor. Based on the following student self-ratings and study history, predict their ${selectedExam.name} exam score (out of ${selectedExam.fullMarks}).

Self-ratings by subject: ${ratingSummary}
Study history from memory: ${memories}

Respond in this EXACT JSON format (no markdown, no code blocks, just pure JSON):
{
  "predictedScore": "XXX/${selectedExam.fullMarks}",
  "strengths": ["strength1", "strength2"],
  "weakAreas": ["weak1", "weak2"],
  "dailyQuestions": ["question1", "question2", "question3", "question4", "question5"],
  "tips": ["tip1", "tip2", "tip3"]
}

Make the predicted score realistic based on the ratings. Daily questions should be actual exam-level practice MCQs or short-answer questions for their weak areas.`,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.text || '';

      // Parse JSON from reply
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setPrediction({
            exam: selectedExam.name,
            predictedScore: parsed.predictedScore || `?/${selectedExam.fullMarks}`,
            strengths: parsed.strengths || [],
            weakAreas: parsed.weakAreas || [],
            dailyQuestions: parsed.dailyQuestions || [],
            tips: parsed.tips || [],
          });
        } else {
          // Non-JSON response, show as tips
          setPrediction({
            exam: selectedExam.name,
            predictedScore: `~${Math.round(selectedExam.fullMarks * (Object.values(selfRating).reduce((a, b) => a + b, 0) / (subjects.length * 10)))}/${selectedExam.fullMarks}`,
            strengths: Object.entries(selfRating).filter(([, v]) => v >= 7).map(([k]) => k),
            weakAreas: Object.entries(selfRating).filter(([, v]) => v < 5).map(([k]) => k),
            dailyQuestions: ['Practice your weak areas daily', 'Solve previous year papers', 'Revise formulas every morning'],
            tips: [reply.slice(0, 200)],
          });
        }
      } catch {
        setError('Could not parse prediction. Try again.');
      }
    } catch {
      setError('⚠️ Could not reach AI service. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-[#FF6B00]" />
            <div>
              <h2 className="text-lg font-bold text-[#FF6B00]">Exam Predictor 🎯</h2>
              <p className="text-xs text-neutral-400">AI-powered score prediction</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Exam selector */}
          <div>
            <label className="text-xs text-neutral-400 mb-2 block">Select Exam</label>
            <div className="flex flex-wrap gap-2">
              {EXAMS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedExam(e)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    selectedExam.id === e.id
                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:border-[#FF6B00]/50'
                  }`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subject self-rating */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Brain className="h-4 w-4 text-[#FF6B00]" />
              Rate Yourself (1–10)
            </h3>
            {subjects.map((subj) => (
              <div key={subj} className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-28 truncate">{subj}</span>
                <input
                  type="range" min={1} max={10} step={1}
                  value={selfRating[subj] || 5}
                  onChange={(e) => setSelfRating((prev) => ({ ...prev, [subj]: parseInt(e.target.value) }))}
                  className="flex-1 accent-[#FF6B00]"
                />
                <span className="text-xs font-bold text-[#FF6B00] w-6 text-right">{selfRating[subj] || 5}</span>
              </div>
            ))}
          </div>

          {/* Predict button */}
          <button
            onClick={predict}
            disabled={isLoading}
            className="w-full bg-[#FF6B00] hover:bg-orange-600 rounded-xl py-3.5 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Predicting…</> : <><Zap className="h-4 w-4" /> Predict My Score</>}
          </button>

          {error && <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">{error}</div>}

          {/* Results */}
          {prediction && (
            <div className="space-y-4 animate-in fade-in">
              {/* Score */}
              <div className="bg-gradient-to-br from-[#FF6B00]/20 to-orange-900/20 rounded-2xl p-5 border border-[#FF6B00]/30 text-center">
                <p className="text-xs text-neutral-400 mb-1">Predicted Score — {prediction.exam}</p>
                <p className="text-4xl font-black text-[#FF6B00]">{prediction.predictedScore}</p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-900/20 rounded-xl p-3 border border-green-700/30">
                  <h4 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Strengths</h4>
                  {prediction.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-green-300 py-0.5">✅ {s}</p>
                  ))}
                  {prediction.strengths.length === 0 && <p className="text-xs text-neutral-500">Keep studying!</p>}
                </div>
                <div className="bg-red-900/20 rounded-xl p-3 border border-red-700/30">
                  <h4 className="text-xs font-bold text-red-400 mb-2">⚠️ Weak Areas</h4>
                  {prediction.weakAreas.map((w, i) => (
                    <p key={i} className="text-xs text-red-300 py-0.5">📌 {w}</p>
                  ))}
                  {prediction.weakAreas.length === 0 && <p className="text-xs text-neutral-500">Great balance!</p>}
                </div>
              </div>

              {/* Daily Questions */}
              {prediction.dailyQuestions.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-sm font-bold text-[#FF6B00] mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Today's 5 Practice Questions
                  </h4>
                  {prediction.dailyQuestions.map((q, i) => (
                    <div key={i} className="text-xs text-neutral-300 py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-[#FF6B00] font-bold">Q{i + 1}.</span> {q}
                    </div>
                  ))}
                </div>
              )}

              {/* Tips */}
              {prediction.tips.length > 0 && (
                <div className="bg-blue-900/20 rounded-xl p-3 border border-blue-700/30">
                  <h4 className="text-xs font-bold text-blue-400 mb-2">💡 Study Tips</h4>
                  {prediction.tips.map((t, i) => (
                    <p key={i} className="text-xs text-blue-300 py-0.5">• {t}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
