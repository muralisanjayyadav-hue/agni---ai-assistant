import React, { useState } from 'react';
import {
  Brain,
  Trash2,
  Plus,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import { StoredMemory, UserPreferences } from '../types';

interface MemoryViewProps {
  userPreferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  memories: StoredMemory[];
  onAddMemory: (content: string, category: 'preference' | 'study' | 'personal' | 'goal') => void;
  onDeleteMemory: (id: string) => void;
  onClearMemories: () => void;
}

export const MemoryView: React.FC<MemoryViewProps> = ({
  userPreferences,
  onUpdatePreferences,
  memories,
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
}) => {
  const [newFact, setNewFact] = useState('');
  const [category, setCategory] = useState<'preference' | 'study' | 'personal' | 'goal'>('study');
  const [isSaved, setIsSaved] = useState(false);

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddMemory(newFact.trim(), category);
    setNewFact('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      {/* Banner */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-5 dark:border-indigo-900/40 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                AGNI Memory & Personalization Engine
              </h1>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Personalization
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Complete transparency and user control. Useful personalization without sacrificing privacy.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Preferences & Persona Controls */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Assistant Persona & Interaction Style
              </h3>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Your Preferred Name
              </label>
              <input
                type="text"
                value={userPreferences.userName}
                onChange={(e) => onUpdatePreferences({ userName: e.target.value })}
                placeholder="e.g. Sanjay"
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>

            {/* Response Style */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                AGNI Response Style
              </label>
              <select
                value={userPreferences.responseStyle}
                onChange={(e) => onUpdatePreferences({ responseStyle: e.target.value as any })}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="balanced">Balanced (Clear, structured & polite)</option>
                <option value="educational">Educational / Mentor (Step-by-step with analogies)</option>
                <option value="concise">Concise & Direct (Brief bulleted answers)</option>
                <option value="technical">Technical / In-Depth (Deep rigorous explanations)</option>
              </select>
            </div>

            {/* Student Mode Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Enable Student Persona
                </span>
                <p className="text-[11px] text-neutral-500">
                  AGNI gives guided hints before revealing final answers
                </p>
              </div>
              <input
                type="checkbox"
                checked={userPreferences.isStudent}
                onChange={(e) => onUpdatePreferences({ isStudent: e.target.checked })}
                className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
              />
            </div>

            {/* Speech Rate Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span>Voice Speech Speed</span>
                <span>{userPreferences.voiceSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={userPreferences.voiceSpeed}
                onChange={(e) => onUpdatePreferences({ voiceSpeed: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Privacy Guarantee Note */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>
                Privacy Guarantee (Vol 8): Your remembered facts are stored on your device and never sold or shared.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Explicit Persistent Memory Records */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Explicit Memory Store ({memories.length})
                </h3>
              </div>
              {memories.length > 0 && (
                <button
                  type="button"
                  onClick={onClearMemories}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-red-600 transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Purge All Memories</span>
                </button>
              )}
            </div>

            {/* Add Memory Form */}
            <form onSubmit={handleCreateMemory} className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Teach AGNI a Fact to Remember
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="e.g. 'I am preparing for the JEE Advanced Exam in 2027'"
                  className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="rounded-xl border border-neutral-300 bg-neutral-50 px-2.5 py-2 text-xs text-neutral-800 outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <option value="study">Study</option>
                  <option value="preference">Preference</option>
                  <option value="goal">Goal</option>
                  <option value="personal">Personal</option>
                </select>
                <button
                  type="submit"
                  disabled={!newFact.trim()}
                  className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
                >
                  {isSaved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{isSaved ? 'Saved' : 'Remember'}</span>
                </button>
              </div>
            </form>

            {/* Memory List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {memories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-500 dark:border-neutral-800">
                  No explicit memories stored yet. Add facts above so AGNI can customize explanations for you.
                </div>
              ) : (
                memories.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60"
                  >
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                          {m.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {m.category}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Added: {m.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteMemory(m.id)}
                      className="text-neutral-400 hover:text-red-500 p-1 transition"
                      title="Forget this fact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
