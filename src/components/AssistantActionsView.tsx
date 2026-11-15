import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Youtube,
  Camera,
  MapPin,
  Clock,
  FileEdit,
  Settings,
  Calculator,
  Bell,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Send,
  ExternalLink,
} from 'lucide-react';
import { ReminderItem, ActiveTimer } from '../types';
import { apiFetch } from '../utils/api';

interface AssistantActionsViewProps {
  reminders: ReminderItem[];
  onAddReminder: (title: string, time: string, category: 'study' | 'homework' | 'general') => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export const AssistantActionsView: React.FC<AssistantActionsViewProps> = ({
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

  // Simulated Apps
  const [activeSimulatedApp, setActiveSimulatedApp] = useState<string | null>(null);

  // Timers State
  const [timers, setTimers] = useState<ActiveTimer[]>([
    {
      id: 'timer-1',
      label: 'Pomodoro Study Sprint',
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      isRunning: false,
    },
  ]);

  // New Reminder State
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('18:00');
  const [newReminderCategory, setNewReminderCategory] = useState<'study' | 'homework' | 'general'>('study');

  // Confirmation state for critical actions
  const [confirmationAction, setConfirmationAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Timer Tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((timer) => {
          if (!timer.isRunning || timer.remainingSeconds <= 0) return timer;
          const nextSec = timer.remainingSeconds - 1;
          if (nextSec === 0) {
            // Simulated alarm trigger
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🔥 AGNI Timer Finished!', { body: `${timer.label} has completed.` });
            }
          }
          return { ...timer, remainingSeconds: nextSec, isRunning: nextSec > 0 };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleResetTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false } : t))
    );
  };

  const handleAddTimer = (minutes: number, label: string) => {
    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}`,
      label,
      totalSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      isRunning: true,
    };
    setTimers((prev) => [...prev, newTimer]);
  };

  // Launch simulated app
  const launchApp = (appName: string, customUrl?: string) => {
    setActiveSimulatedApp(appName);
    setCommandFeedback(`Android Intent Dispatched: Opened ${appName} successfully.`);
    if (customUrl) {
      setTimeout(() => {
        window.open(customUrl, '_blank', 'noopener,noreferrer');
      }, 500);
    }
  };

  // Process natural language command through server
  const handleCommandSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commandInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setCommandFeedback(null);

    try {
      const data = await apiFetch<{
        intent: string;
        appName: string | null;
        parameters: any;
        requiresConfirmation: boolean;
        spokenFeedback?: string;
      }>('/api/action-detect', {
        method: 'POST',
        body: JSON.stringify({ input: commandInput.trim() }),
      });

      const { intent, appName, parameters, requiresConfirmation, spokenFeedback } = data;

      if (requiresConfirmation) {
        setConfirmationAction({
          message: `AGNI Safety Gate: Are you sure you want to execute "${commandInput}"?`,
          onConfirm: () => {
            executeIntent(intent, appName, parameters);
            setConfirmationAction(null);
          },
        });
      } else {
        executeIntent(intent, appName, parameters);
      }

      setCommandFeedback(spokenFeedback || 'Command processed.');
      setCommandInput('');
    } catch (err: any) {
      console.error('Command error:', err);
      setCommandFeedback('Could not process device action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeIntent = (intent: string, appName: string | null, parameters: any) => {
    if (intent === 'APP_LAUNCH' && appName) {
      launchApp(appName);
    } else if (intent === 'SET_TIMER') {
      const mins = parameters?.durationMinutes || 15;
      handleAddTimer(mins, parameters?.title || 'AGNI Timer');
    } else if (intent === 'SET_REMINDER') {
      onAddReminder(
        parameters?.title || 'Study Session',
        parameters?.time || '18:00',
        'study'
      );
    } else {
      setCommandFeedback(`Executed: ${intent}`);
    }
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    onAddReminder(newReminderTitle.trim(), newReminderTime, newReminderCategory);
    setNewReminderTitle('');
  };

  const APPS = [
    { name: 'YouTube', icon: Youtube, color: 'text-red-600 bg-red-100 dark:bg-red-950/60', url: 'https://youtube.com' },
    { name: 'Camera', icon: Camera, color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/60' },
    { name: 'Maps', icon: MapPin, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60', url: 'https://maps.google.com' },
    { name: 'Clock', icon: Clock, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/60' },
    { name: 'Notes', icon: FileEdit, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60' },
    { name: 'Calculator', icon: Calculator, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950/60' },
    { name: 'Settings', icon: Settings, color: 'text-neutral-600 bg-neutral-200 dark:bg-neutral-800' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      {/* Confirmation Modal */}
      {confirmationAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                Action Confirmation Required
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {confirmationAction.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmationAction(null)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmationAction.onConfirm}
                className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-orange-700"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent p-5 dark:border-purple-900/40 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                AGNI Device Assistant & Actions
              </h1>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Level 4 AI
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Natural language intent dispatcher, app launchers, timers, and study reminders with built-in safety confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Command Dispatcher Input */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
          Natural Language Command System
        </h3>
        <form onSubmit={handleCommandSubmit} className="relative flex items-center">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="e.g. 'Open YouTube', 'Set a study timer for 30 minutes', 'Remind me to revise biology at 7 PM'"
            className="w-full rounded-2xl border border-neutral-300 bg-neutral-50 py-3.5 pl-4 pr-24 text-xs sm:text-sm text-neutral-900 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={!commandInput.trim() || isProcessing}
            className="absolute right-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Execute</span>
          </button>
        </form>

        {commandFeedback && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-purple-50 p-2.5 text-xs text-purple-900 dark:bg-purple-950/50 dark:text-purple-200 border border-purple-200 dark:border-purple-900">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
            <span>{commandFeedback}</span>
          </div>
        )}
      </div>

      {/* App Launcher Simulator */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            Android Application Launchers (Simulated Intents)
          </h3>
          {activeSimulatedApp && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Active: {activeSimulatedApp}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {APPS.map((app) => {
            const Icon = app.icon;
            const isActive = activeSimulatedApp === app.name;
            return (
              <button
                key={app.name}
                type="button"
                onClick={() => launchApp(app.name, app.url)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 transition hover:scale-105 cursor-pointer ${
                  isActive
                    ? 'border-purple-500 bg-purple-50 shadow-md dark:border-purple-600 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                    : 'border-neutral-200 bg-neutral-50 hover:bg-white dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:bg-neutral-800'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${app.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {app.name}
                </span>
                {app.url && <ExternalLink className="h-2.5 w-2.5 text-neutral-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Timers & Reminders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Alarms & Study Timers */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Alarms & Study Timers
              </h3>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleAddTimer(15, 'Quick 15-Min Sprint')}
                className="rounded-lg bg-neutral-100 px-2 py-1 text-[10px] font-semibold hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => handleAddTimer(25, 'Pomodoro Session')}
                className="rounded-lg bg-neutral-100 px-2 py-1 text-[10px] font-semibold hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              >
                +25m
              </button>
              <button
                type="button"
                onClick={() => handleAddTimer(45, 'Exam Prep Block')}
                className="rounded-lg bg-neutral-100 px-2 py-1 text-[10px] font-semibold hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              >
                +45m
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {timers.map((timer) => (
              <div
                key={timer.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {timer.label}
                  </h4>
                  <div className="mt-1 font-mono text-xl font-extrabold tracking-wider text-purple-600 dark:text-purple-400">
                    {formatTimerTime(timer.remainingSeconds)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTimer(timer.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition ${
                      timer.isRunning
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {timer.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetTimer(timer.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Study Reminders & Tasks */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Reminders & Schedule
              </h3>
            </div>
            <span className="text-xs text-neutral-500">
              {reminders.filter((r) => !r.completed).length} pending
            </span>
          </div>

          {/* Add Reminder Form */}
          <form onSubmit={handleCreateReminder} className="flex gap-2">
            <input
              type="text"
              value={newReminderTitle}
              onChange={(e) => setNewReminderTitle(e.target.value)}
              placeholder="e.g. Science Revision"
              className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs outline-none focus:border-orange-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <input
              type="time"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              className="w-24 rounded-xl border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <button
              type="submit"
              disabled={!newReminderTitle.trim()}
              className="flex items-center justify-center rounded-xl bg-orange-600 px-3 text-white hover:bg-orange-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>

          {/* List of Reminders */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                  r.completed
                    ? 'border-neutral-200 bg-neutral-100/60 opacity-60 dark:border-neutral-800 dark:bg-neutral-850'
                    : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40'
                }`}
              >
                <div
                  onClick={() => onToggleReminder(r.id)}
                  className="flex items-center gap-2.5 cursor-pointer flex-1"
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${r.completed ? 'text-emerald-600' : 'text-neutral-300 dark:text-neutral-600'}`}
                  />
                  <div>
                    <span
                      className={`text-xs font-medium block ${r.completed ? 'line-through text-neutral-500' : 'text-neutral-800 dark:text-neutral-200'}`}
                    >
                      {r.title}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">Scheduled: {r.time}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteReminder(r.id)}
                  className="text-neutral-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
