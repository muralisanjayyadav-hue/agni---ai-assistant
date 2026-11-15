import BackButton from './BackButton';
import React, { useState } from 'react';
import {
  GraduationCap,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  Smile,
  FileCheck,
  Send,
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Printer,
  Layers,
  Globe,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { UserPreferences, FlashcardItem } from '../types';
import { apiFetch } from '../utils/api';
import { FlashcardDeckModal } from './FlashcardDeckModal';
import { StudySheetPrintModal } from './StudySheetPrintModal';

interface LearnViewProps {
  userPreferences: UserPreferences;
  initialTopic?: string;
  onClearInitialTopic?: () => void;
}

type LearnModeType = 'step_by_step' | 'quiz' | 'check_work' | 'simplify' | 'revision';

const PRESET_TOPICS = [
  {
    title: "Newton's 2nd Law (F = ma)",
    subject: 'Physics',
    desc: 'Force, mass, acceleration derivation and everyday examples.',
  },
  {
    title: 'Photosynthesis & Chloroplast Mechanism',
    subject: 'Biology',
    desc: 'Light and dark reactions, ATP synthesis.',
  },
  {
    title: 'Solving Quadratic Equations by Factoring',
    subject: 'Mathematics',
    desc: 'Quadratic formula derivation and roots.',
  },
  {
    title: 'Ohm’s Law & Resistance in Circuits',
    subject: 'Physics',
    desc: 'Voltage, current, series vs parallel resistors.',
  },
];

export const LearnView: React.FC<LearnViewProps> = ({
  userPreferences,
  initialTopic,
  onClearInitialTopic,
}) => {
  const [topic, setTopic] = useState(initialTopic || '');
  const [mode, setMode] = useState<LearnModeType>('step_by_step');
  const [studentLevel, setStudentLevel] = useState('High School (Class 9-12)');
  const [learnLanguage, setLearnLanguage] = useState<string>(
    userPreferences.language === 'Tunglish' || userPreferences.language === 'Hinglish'
      ? userPreferences.language
      : 'English'
  );
  const [userAttempt, setUserAttempt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [outputResult, setOutputResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);

  // Print Sheet Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  React.useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      onClearInitialTopic?.();
    }
  }, [initialTopic, onClearInitialTopic]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setOutputResult(null);

    try {
      const data = await apiFetch<{ text: string }>('/api/learn', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          mode,
          studentLevel,
          language: learnLanguage,
          userAttempt: mode === 'check_work' ? userAttempt.trim() : undefined,
        }),
      });

      setOutputResult(data.text);
    } catch (err: any) {
      console.error('Learn error:', err);
      setErrorMessage(err.message || 'Error communicating with AGNI Learning Service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!topic.trim() && !outputResult) return;
    setIsGeneratingCards(true);
    try {
      const res = await apiFetch<{ flashcards: FlashcardItem[] }>('/api/learn/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim() || 'Exam Revision',
          content: outputResult || topic.trim(),
          language: learnLanguage,
        }),
      });

      if (res.flashcards && res.flashcards.length > 0) {
        setFlashcards(res.flashcards);
        setShowFlashcardModal(true);
      }
    } catch (e: any) {
      console.error('Error creating flashcards:', e);
      // Fallback local flashcards if API error
      setFlashcards([
        {
          id: '1',
          front: `What is the core principle of ${topic || 'this concept'}?`,
          back: `The fundamental relation states that understanding causes gives clear predictive effects.`,
          topic: topic || 'Core Principle',
        },
        {
          id: '2',
          front: `Which mathematical formula or equation governs ${topic || 'this chapter'}?`,
          back: `Always check standard SI units and apply basic dimensional balance.`,
          topic: topic || 'Formula',
        },
      ]);
      setShowFlashcardModal(true);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleCopy = () => {
    if (!outputResult) return;
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modesConfig: { id: LearnModeType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    {
      id: 'step_by_step',
      label: 'Step-by-Step (Hints & Method)',
      icon: Lightbulb,
      desc: 'Concept → Hint → Method → Reasoning → Practice Question',
    },
    {
      id: 'quiz',
      label: 'Practice Quiz',
      icon: HelpCircle,
      desc: 'Generate 4 MCQs with answer keys and explanations',
    },
    {
      id: 'check_work',
      label: 'Check My Attempt',
      icon: CheckCircle2,
      desc: 'Analyze your solution, spot mistakes and get guidance',
    },
    {
      id: 'simplify',
      label: 'Simplify for 10-Yr-Old',
      icon: Smile,
      desc: 'Everyday analogies with zero overwhelming jargon',
    },
    {
      id: 'revision',
      label: 'Exam Revision Sheet',
      icon: FileCheck,
      desc: 'Master formula sheet, summary points & exam tips',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      <BackButton label="Back" />
      {/* Top Banner */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-5 dark:border-amber-900/40 dark:bg-neutral-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  AGNI Student Learn Companion
                </h1>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Pillar
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Guiding learning through hints and step-by-step reasoning rather than raw answers.
              </p>
            </div>
          </div>

          {/* Student Level & Language Select */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-500">Language:</span>
              <select
                id="learn-lang-select"
                value={learnLanguage}
                onChange={(e) => setLearnLanguage(e.target.value)}
                className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="English">English</option>
                <option value="Tunglish">Tunglish (Telugu + Eng)</option>
                <option value="Hinglish">Hinglish (Hindi + Eng)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-500">Level:</span>
              <select
                id="learn-level-select"
                value={studentLevel}
                onChange={(e) => setStudentLevel(e.target.value)}
                className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
              >
                <option value="Middle School (Class 6-8)">Middle School (Class 6-8)</option>
                <option value="High School (Class 9-12)">High School (Class 9-12)</option>
                <option value="College / Competitive Exams">College / Competitive (JEE/NEET/UPSC)</option>
                <option value="Lifelong Learner">Beginner / Lifelong Learner</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {modesConfig.map((m) => {
          const Icon = m.icon;
          const isSelected = mode === m.id;
          return (
            <button
              key={m.id}
              id={`learn-mode-btn-${m.id}`}
              type="button"
              onClick={() => {
                setMode(m.id);
                setOutputResult(null);
              }}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition cursor-pointer ${
                isSelected
                  ? 'border-orange-500 bg-orange-50/80 shadow-sm dark:border-orange-600 dark:bg-orange-950/40'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon
                  className={`h-4 w-4 ${
                    isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-neutral-500'
                  }`}
                />
                <span
                  className={`text-xs font-bold line-clamp-1 ${
                    isSelected ? 'text-orange-900 dark:text-orange-200' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {m.label.split(' ')[0]}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                {m.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Input Form */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="learn-topic-input"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
            >
              {mode === 'check_work'
                ? 'Problem Statement / Question'
                : 'Enter Concept, Chapter, or Problem to Learn'}
            </label>
            <input
              id="learn-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                mode === 'quiz'
                  ? 'e.g. Periodic Table & Chemical Bonding'
                  : mode === 'simplify'
                  ? 'e.g. How do Black Holes warp time?'
                  : 'e.g. A ball is thrown upward with velocity 20 m/s. Find max height.'
              }
              className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          {/* If 'check_work' mode is active, show the student's attempt box */}
          {mode === 'check_work' && (
            <div>
              <label
                htmlFor="learn-attempt-input"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
              >
                Your Solution / Attempt (Write your steps so AGNI can review)
              </label>
              <textarea
                id="learn-attempt-input"
                rows={4}
                value={userAttempt}
                onChange={(e) => setUserAttempt(e.target.value)}
                placeholder="e.g. Step 1: Used v^2 = u^2 - 2gs. At max height v=0, so 0 = 20^2 - 2(9.8)s... then got s = 20.4 meters."
                className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs sm:text-sm text-neutral-900 outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          )}

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-neutral-500">Quick Samples:</span>
            {PRESET_TOPICS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTopic(p.title)}
                className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:border-orange-300 hover:bg-orange-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              id="learn-submit-btn"
              type="submit"
              disabled={!topic.trim() || isLoading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>AGNI is structuring your lesson...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Start Learning</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Output / Results Card */}
      {outputResult && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 animate-fade-in">
          <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                AGNI Study Master Guide
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingCards}
                className="flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-900 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-200 cursor-pointer disabled:opacity-50 transition"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>{isGeneratingCards ? 'Making Cards...' : 'Flashcards'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </button>

              <button
                id="learn-copy-btn"
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            <MarkdownView content={outputResult} />
          </div>
        </div>
      )}

      {/* Flashcards Deck Modal */}
      <FlashcardDeckModal
        isOpen={showFlashcardModal}
        onClose={() => setShowFlashcardModal(false)}
        flashcards={flashcards}
        topicTitle={topic || 'Revision Flashcards'}
        language={learnLanguage}
      />

      {/* Printable PDF Sheet Modal */}
      <StudySheetPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={topic || 'Exam Revision Master Guide'}
        subject={studentLevel}
        content={outputResult || ''}
      />
    </div>
  );
};
