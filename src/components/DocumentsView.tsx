import React, { useState } from 'react';
import {
  FileText,
  FileCheck,
  ListOrdered,
  HelpCircle,
  Upload,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Printer,
  Layers,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { FlashcardItem } from '../types';
import { apiFetch } from '../utils/api';
import { FlashcardDeckModal } from './FlashcardDeckModal';
import { StudySheetPrintModal } from './StudySheetPrintModal';

const SAMPLE_DOCS = [
  {
    title: 'Indian Space Program & Chandrayaan-3',
    subject: 'Science & Tech',
    text: `Chandrayaan-3 was the third lunar exploration mission developed by the Indian Space Research Organisation (ISRO). It was launched on 14 July 2023 from Satish Dhawan Space Centre in Sriharikota, Andhra Pradesh.

The mission consisted of a propulsion module, the Vikram lander, and the Pragyan rover. On 23 August 2023, India made history by becoming the first nation to successfully perform a soft landing near the south pole of the Moon, and the fourth country overall to land on the lunar surface after the Soviet Union, the United States, and China.

The scientific payloads aimed to measure the thermal conductivity and temperature of the lunar regolith (ChaSTE), detect lunar seismic activity (ILSA), analyze surface elemental composition using laser-induced breakdown spectroscopy (LIBS), and measure near-surface plasma density. The landing site was officially named 'Shiv Shakti Point', and 23 August was declared National Space Day in India.`,
  },
  {
    title: 'Thermodynamics & Heat Engines',
    subject: 'Physics',
    text: `Thermodynamics is the branch of physics dealing with heat, work, temperature, and their relations to energy, entropy, and properties of matter.

The Zeroth Law establishes temperature as a fundamental state variable, stating that if two systems are each in thermal equilibrium with a third system, they are in thermal equilibrium with each other.
The First Law is the conservation of energy: the change in internal energy (ΔU) equals heat added (Q) minus work done by the system (W), or ΔU = Q - W.
The Second Law states that entropy of an isolated system always increases over time, implying that 100% efficient conversion of heat into mechanical work is impossible without waste heat. The Carnot cycle defines the theoretical maximum efficiency achievable by any heat engine operating between two temperatures: η = 1 - (Tc / Th).
The Third Law states that as system temperature approaches absolute zero (-273.15°C or 0 K), entropy reaches a minimum constant value.`,
  },
];

export const DocumentsView: React.FC = () => {
  const [documentText, setDocumentText] = useState<string>(SAMPLE_DOCS[0].text);
  const [docAction, setDocAction] = useState<'quick_summary' | 'key_points' | 'exam_revision' | 'qa'>('quick_summary');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [outputResult, setOutputResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Flashcards & PDF Export modal states
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleGenerateFlashcards = async () => {
    if (!documentText.trim() && !outputResult) return;
    setIsGeneratingCards(true);
    try {
      const res = await apiFetch<{ flashcards: FlashcardItem[] }>('/api/learn/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Document Study Notes',
          content: outputResult || documentText.slice(0, 3000),
          language: 'English',
        }),
      });

      if (res.flashcards && res.flashcards.length > 0) {
        setFlashcards(res.flashcards);
        setShowFlashcardModal(true);
      }
    } catch (e: any) {
      console.error('Error generating doc flashcards:', e);
      setFlashcards([
        {
          id: '1',
          front: 'What is the main finding or topic discussed in this document?',
          back: outputResult ? outputResult.slice(0, 180) + '...' : 'Refer to document text for core findings.',
          topic: 'Key Concept',
        },
      ]);
      setShowFlashcardModal(true);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setDocumentText(content);
        setOutputResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleProcess = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!documentText.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setOutputResult(null);

    try {
      const data = await apiFetch<{ text: string }>('/api/document', {
        method: 'POST',
        body: JSON.stringify({
          documentText: documentText.trim(),
          action: docAction,
          question: docAction === 'qa' ? customQuestion.trim() : undefined,
        }),
      });

      setOutputResult(data.text);
    } catch (err: any) {
      console.error('Document error:', err);
      setErrorMessage(err.message || 'Error occurred while processing document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!outputResult) return;
    navigator.clipboard.writeText(outputResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actionOptions: { id: 'quick_summary' | 'key_points' | 'exam_revision' | 'qa'; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    {
      id: 'quick_summary',
      label: 'Executive Summary',
      icon: FileText,
      desc: 'Concise 3-paragraph summary of core concepts',
    },
    {
      id: 'key_points',
      label: 'Key Takeaways',
      icon: ListOrdered,
      desc: 'High-yield bulleted points & critical facts',
    },
    {
      id: 'exam_revision',
      label: 'Exam Revision Sheet',
      icon: FileCheck,
      desc: 'Definitions, formulas & expected exam questions',
    },
    {
      id: 'qa',
      label: 'Ask Document',
      icon: HelpCircle,
      desc: 'Ask specific questions grounded in this text',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      {/* Banner */}
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-5 dark:border-teal-900/40 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                AGNI Document & Notes Intelligence
              </h1>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                Level 2 AI
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Summarize long chapters, extract exam revision cheat sheets, and ask targeted questions about your study material.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Document Input & Analysis Mode */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Document text input */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Document Text
              </h3>
              <label
                htmlFor="doc-file-upload"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload .txt / .md</span>
                <input
                  id="doc-file-upload"
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={12}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste textbook notes, articles, or syllabus syllabus content here..."
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-mono"
            />

            {/* Presets */}
            <div className="mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-[11px] font-medium text-neutral-500 block mb-1.5">
                Load Sample Chapter:
              </span>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_DOCS.map((doc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDocumentText(doc.text);
                      setOutputResult(null);
                    }}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-2 text-left text-xs hover:border-teal-400 hover:bg-teal-50/50 dark:border-neutral-800 dark:hover:bg-neutral-800/80 cursor-pointer"
                  >
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {doc.title}
                    </span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {doc.subject}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Mode & Generated Output */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-3">
              Intelligence Action
            </h3>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {actionOptions.map((opt) => {
                const Icon = opt.icon;
                const active = docAction === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDocAction(opt.id);
                      setOutputResult(null);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition cursor-pointer ${
                      active
                        ? 'border-teal-500 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200 shadow-sm'
                        : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Specific Q&A input if 'qa' action */}
            {docAction === 'qa' && (
              <div className="mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  Question for Document
                </label>
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g. What is the efficiency formula for a Carnot cycle?"
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                id="doc-process-btn"
                type="button"
                onClick={handleProcess}
                disabled={!documentText.trim() || isLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Run Intelligence Action</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Result Output */}
          {outputResult && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 animate-fade-in">
              <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-teal-600" />
                  <h4 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    AGNI Document Analysis
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGenerateFlashcards}
                    disabled={isGeneratingCards}
                    className="flex items-center gap-1 rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-200 cursor-pointer disabled:opacity-50 transition"
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
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <MarkdownView content={outputResult} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flashcards Deck Modal */}
      <FlashcardDeckModal
        isOpen={showFlashcardModal}
        onClose={() => setShowFlashcardModal(false)}
        flashcards={flashcards}
        topicTitle="Document Study Flashcards"
        language="English"
      />

      {/* Printable PDF Revision Sheet Modal */}
      <StudySheetPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Document Intelligence Revision Sheet"
        subject="Academic & Professional Study"
        content={outputResult || ''}
      />
    </div>
  );
};
