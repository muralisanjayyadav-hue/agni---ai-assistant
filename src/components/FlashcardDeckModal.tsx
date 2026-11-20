import React, { useState } from 'react';
import {
  X,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  Shuffle,
  Volume2,
} from 'lucide-react';
import { FlashcardItem } from '../types';
import { speakText, stopSpeaking } from '../utils/speech';

interface FlashcardDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: FlashcardItem[];
  topicTitle: string;
  language?: string;
}

export const FlashcardDeckModal: React.FC<FlashcardDeckModalProps> = ({
  isOpen,
  onClose,
  flashcards: initialCards,
  topicTitle,
  language = 'English',
}) => {
  const [cards, setCards] = useState<FlashcardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  // Update cards if initialCards changes
  React.useEffect(() => {
    setCards(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialCards]);

  if (!isOpen || cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const isMastered = masteredIds.has(currentCard.id);

  const handleNext = () => {
    stopSpeaking();
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    stopSpeaking();
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(currentCard.id)) {
        next.delete(currentCard.id);
      } else {
        next.add(currentCard.id);
      }
      return next;
    });
  };

  const handleShuffle = () => {
    stopSpeaking();
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleSpeakCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToSpeak = isFlipped ? currentCard.back : currentCard.front;
    speakText(textToSpeak, { rate: 0.95, pitch: 1.05, volume: 1.0, profile: 'natural-warm' });
  };

  const printCards = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = cards
      .map(
        (c, idx) => `
        <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; font-family: sans-serif;">
          <div style="font-size: 11px; color: #ea580c; font-weight: bold; text-transform: uppercase;">Card ${idx + 1} • ${c.topic || topicTitle}</div>
          <div style="font-size: 16px; font-weight: bold; margin-top: 6px; color: #111827;">Q: ${c.front}</div>
          <hr style="border: 0; border-top: 1px dashed #d1d5db; margin: 12px 0;" />
          <div style="font-size: 14px; color: #374151; line-height: 1.5;"><strong>A:</strong> ${c.back}</div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AGNI Flashcards - ${topicTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 4px; color: #ea580c; }
            p { font-size: 12px; color: #666; margin-bottom: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>AGNI Flashcard Deck: ${topicTitle}</h1>
          <p>Created by Founder M. Sanjay • Active Recall Revision Sheet</p>
          ${cardsHtml}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex w-full max-w-xl flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <div>
              <h2 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                Active Recall Flashcards
              </h2>
              <p className="text-[11px] text-neutral-500 line-clamp-1">
                {topicTitle} • {cards.length} Cards ({masteredIds.size} Mastered)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={printCards}
              title="Print or Export Flashcards to PDF"
              className="flex h-8 items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              title="Shuffle Cards"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-neutral-500">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span className="text-orange-600 dark:text-orange-400">
            {Math.round(((currentIndex + 1) / cards.length) * 100)}% Complete
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Interactive 3D Flip Card */}
        <div
          onClick={handleFlip}
          className="relative mt-4 flex min-h-[260px] cursor-pointer flex-col justify-between rounded-2xl border-2 border-orange-200/80 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/50 p-6 text-center shadow-inner transition-all duration-300 hover:shadow-md dark:border-orange-950/60 dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900 select-none"
        >
          {/* Card Top Label & Quick Voice */}
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isFlipped
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
              }`}
            >
              {isFlipped ? 'Answer & Explanation' : 'Prompt / Question'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSpeakCard}
                title="Listen with realistic voice"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-orange-600 shadow-sm hover:bg-orange-100 dark:bg-neutral-800 dark:text-orange-300"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleMastered}
                title={isMastered ? 'Mark as Need Review' : 'Mark as Mastered'}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                  isMastered
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/80 text-neutral-500 hover:text-emerald-600 dark:bg-neutral-800'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>{isMastered ? 'Mastered' : 'Mark Known'}</span>
              </button>
            </div>
          </div>

          {/* Card Body Text */}
          <div className="my-auto py-4">
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg leading-relaxed">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </div>

          {/* Flip Hint */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-neutral-400">
            <RotateCw className="h-3 w-3 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Tap card to flip ({isFlipped ? 'Show Question' : 'Reveal Answer'})</span>
          </div>
        </div>

        {/* Navigation & Score Controls */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={handleFlip}
            className="rounded-xl bg-orange-100 px-4 py-2 text-xs font-bold text-orange-900 hover:bg-orange-200 dark:bg-orange-950/80 dark:text-orange-200 cursor-pointer"
          >
            Flip Card ⮂
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-orange-600 hover:to-amber-600 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
