import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Bell,
  BellRing,
  Heart,
  Droplet,
  Eye,
  Activity,
  Sparkles,
  Award,
  Crown,
  Sun,
  Moon,
  Coffee,
  Play,
  RotateCcw,
  Zap,
  Target,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { AuthUser, LifeOSGoal, TimetableSlot } from '../types';
import { GOLD_FOUNDERS, getFounderName } from '../lib/auth';

interface SmartLifeOSProps {
  authUser?: AuthUser | null;
  userName?: string;
  onNavigateTab?: (tab: any) => void;
}

// Preset Timetables for Different Student Categories
const PRESET_TIMETABLES: Record<string, TimetableSlot[]> = {
  'Class 9 Standard': [
    { id: 't-1', timeRange: '06:00 AM - 07:00 AM', subject: 'Mathematics', activity: 'Polynomials & Number Systems problem solving', durationMinutes: 60, type: 'deep_study', completed: false },
    { id: 't-2', timeRange: '07:00 AM - 07:30 AM', subject: 'Morning Routine', activity: 'Light exercise & healthy breakfast', durationMinutes: 30, type: 'break', completed: true },
    { id: 't-3', timeRange: '04:30 PM - 05:30 PM', subject: 'Science (Physics)', activity: 'Gravitation formulas and NCERT numericals', durationMinutes: 60, type: 'problem_solving', completed: false },
    { id: 't-4', timeRange: '05:30 PM - 05:45 PM', subject: 'Wellness Break', activity: 'Water hydration & eye rest', durationMinutes: 15, type: 'break', completed: false },
    { id: 't-5', timeRange: '05:45 PM - 06:45 PM', subject: 'Science (Biology)', activity: 'The Fundamental Unit of Life diagrams', durationMinutes: 60, type: 'active_recall', completed: false },
    { id: 't-6', timeRange: '07:30 PM - 08:30 PM', subject: 'Social Science', activity: 'History & Geography quick revision', durationMinutes: 60, type: 'revision', completed: false },
    { id: 't-7', timeRange: '09:00 PM - 09:30 PM', subject: 'Day Review', activity: 'Flashcards recall & tomorrow prep', durationMinutes: 30, type: 'revision', completed: false },
  ],
  'Class 10 Board Prep': [
    { id: 't-b1', timeRange: '05:30 AM - 06:45 AM', subject: 'Mathematics', activity: 'Quadratic Equations & Trigonometry previous year papers', durationMinutes: 75, type: 'deep_study', completed: false },
    { id: 't-b2', timeRange: '04:30 PM - 05:45 PM', subject: 'Physics & Chemistry', activity: 'Electricity & Chemical Reactions lab concepts', durationMinutes: 75, type: 'deep_study', completed: false },
    { id: 't-b3', timeRange: '06:00 PM - 07:00 PM', subject: 'Life Processes', activity: 'Human Heart & Photosynthesis whiteboard diagrams', durationMinutes: 60, type: 'active_recall', completed: false },
    { id: 't-b4', timeRange: '07:30 PM - 08:30 PM', subject: 'Social Studies & English', activity: 'Case-based questions practice', durationMinutes: 60, type: 'revision', completed: false },
    { id: 't-b5', timeRange: '09:00 PM - 09:45 PM', subject: 'Mock Quiz / AGNI Test', activity: '15-question fast fire recall quiz', durationMinutes: 45, type: 'problem_solving', completed: false },
  ],
  'Class 11/12 JEE & NEET': [
    { id: 't-j1', timeRange: '06:00 AM - 08:00 AM', subject: 'Physics', activity: 'Rotational Dynamics & Thermodynamics advanced numericals', durationMinutes: 120, type: 'deep_study', completed: false },
    { id: 't-j2', timeRange: '04:00 PM - 06:00 PM', subject: 'Chemistry', activity: 'Organic Reaction Mechanisms & Periodic Trends', durationMinutes: 120, type: 'deep_study', completed: false },
    { id: 't-j3', timeRange: '06:30 PM - 08:30 PM', subject: 'Math / Biology', activity: 'Calculus Integrals / Genetics & Molecular Basis', durationMinutes: 120, type: 'problem_solving', completed: false },
    { id: 't-j4', timeRange: '09:30 PM - 10:30 PM', subject: 'Error Analysis', activity: 'Reviewing mistake notebook & formula revision', durationMinutes: 60, type: 'revision', completed: false },
  ],
};

export const SmartLifeOS: React.FC<SmartLifeOSProps> = ({ authUser, userName = 'Student', onNavigateTab }) => {
  const cleanAuthEmail = (authUser?.email || '').toLowerCase().trim();
  const isFounder = authUser?.isFounder || GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(cleanAuthEmail);
  const effectiveName = isFounder ? getFounderName(cleanAuthEmail) : userName || 'Student';

  // 1. Daily Briefing Computation
  const currentHour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) timeGreeting = 'Good afternoon';
  if (currentHour >= 17) timeGreeting = 'Good evening';

  // 2. Study Goals State
  const [goals, setGoals] = useState<LifeOSGoal[]>(() => {
    try {
      const saved = localStorage.getItem('agni_life_os_goals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const initialGoals: LifeOSGoal[] = [
      { id: 'g-1', title: 'Finish Gravitation by Sunday', category: 'Physics', dueDate: 'This Sunday', progress: 65, completed: false, priority: 'high' },
      { id: 'g-2', title: 'Master Quadratic Formulas & Derivations', category: 'Math', dueDate: 'Tomorrow', progress: 40, completed: false, priority: 'medium' },
      { id: 'g-3', title: 'Memorize Photosynthesis Light vs Dark Reaction', category: 'Biology', dueDate: 'In 3 days', progress: 80, completed: false, priority: 'medium' },
    ];

    if (isFounder) {
      initialGoals.unshift(
        { id: 'gf-1', title: 'Review AGNI Voice Box latency across rural India', category: 'Founder', dueDate: 'End of month', progress: 85, completed: false, priority: 'high' },
        { id: 'gf-2', title: 'Empower 100,000 students with free multimodal AI', category: 'Founder', dueDate: 'Year 2026', progress: 50, completed: false, priority: 'high' }
      );
    }
    return initialGoals;
  });

  // Save goals
  useEffect(() => {
    try {
      localStorage.setItem('agni_life_os_goals', JSON.stringify(goals));
    } catch {}
  }, [goals]);

  // 3. Timetable State
  const [selectedTimetablePlan, setSelectedTimetablePlan] = useState<string>('Class 9 Standard');
  const [timetable, setTimetable] = useState<TimetableSlot[]>(PRESET_TIMETABLES['Class 9 Standard']);
  const [customTimetablePrompt, setCustomTimetablePrompt] = useState('');

  // Switch timetable preset
  const handleSelectPlan = (plan: string) => {
    setSelectedTimetablePlan(plan);
    if (PRESET_TIMETABLES[plan]) {
      setTimetable(PRESET_TIMETABLES[plan]);
    }
  };

  // Generate Custom Timetable
  const handleGenerateCustomTimetable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTimetablePrompt.trim()) return;

    // Build smart slots based on input
    const generated: TimetableSlot[] = [
      { id: `c-${Date.now()}-1`, timeRange: '06:00 AM - 07:15 AM', subject: `${customTimetablePrompt} Focus Session`, activity: 'Deep conceptual study and note summary', durationMinutes: 75, type: 'deep_study', completed: false },
      { id: `c-${Date.now()}-2`, timeRange: '04:30 PM - 05:45 PM', subject: 'Problem Solving & Numerical Practice', activity: 'Worksheets & previous year questions', durationMinutes: 75, type: 'problem_solving', completed: false },
      { id: `c-${Date.now()}-3`, timeRange: '06:00 PM - 07:00 PM', subject: 'Active Recall & Diagrams', activity: 'AGNI Canvas whiteboard reconstruction', durationMinutes: 60, type: 'active_recall', completed: false },
      { id: `c-${Date.now()}-4`, timeRange: '08:30 PM - 09:30 PM', subject: 'Revision & Flashcards', activity: 'Quick daily recap and memory retention check', durationMinutes: 60, type: 'revision', completed: false },
    ];
    setTimetable(generated);
    setSelectedTimetablePlan(`Custom: ${customTimetablePrompt.slice(0, 18)}...`);
    setCustomTimetablePrompt('');
  };

  // Toggle timetable slot completion
  const toggleSlotCompletion = (id: string) => {
    setTimetable((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  // 4. Goal Handlers
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<LifeOSGoal['category']>('Physics');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newG: LifeOSGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      dueDate: 'This Week',
      progress: 0,
      completed: false,
      priority: 'medium',
    };
    setGoals((prev) => [newG, ...prev]);
    setNewGoalTitle('');
  };

  const toggleGoalCompletion = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed, progress: g.completed ? 50 : 100 } : g))
    );
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // 5. Wellness & 45-min Health Reminders Engine (Notification API)
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const [activeTimerType, setActiveTimerType] = useState<'water' | 'posture' | 'eyes' | null>(null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsGranted(permission === 'granted');
      if (permission === 'granted') {
        new Notification('AGNI Wellness Active 🌿', {
          body: 'You will receive reminders for posture, hydration, and eye rest every 45 minutes.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  // 45-min interval countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            // Trigger alert
            if (notificationsGranted && 'Notification' in window) {
              new Notification('AGNI Wellness Reminder 🌿', {
                body: "45 minutes elapsed! Take a 20-second eye break (look 20 feet away), drink a glass of water, and straighten your spine.",
                icon: '/favicon.ico',
              });
            }
            return 45 * 60; // reset to 45 mins
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, notificationsGranted]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pending count
  const pendingGoalsCount = goals.filter((g) => !g.completed).length;
  const completedGoalsCount = goals.filter((g) => g.completed).length;

  return (
    <div id="smart-life-os-root" className="mx-auto max-w-6xl px-3 py-4 sm:px-6">
      {/* 1. Daily Briefing Banner */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 p-5 shadow-xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                {currentHour >= 6 && currentHour < 18 ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-100">
                {timeGreeting}, {effectiveName}!
              </h2>
              {isFounder && (
                <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300 flex items-center gap-1 shadow-sm">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  Founder {effectiveName} 🫡
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-neutral-300">
              Today you have <span className="font-bold text-orange-400">{pendingGoalsCount} pending goals</span> and {timetable.length} scheduled study slots.
            </p>
            <p className="text-xs text-neutral-400 italic">
              &quot;Consistent daily steps turn grand aspirations into reality.&quot; — Project AGNI
            </p>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3.5 py-2 text-center">
              <div className="text-base font-extrabold text-orange-400">{pendingGoalsCount}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Goals Left</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3.5 py-2 text-center">
              <div className="text-base font-extrabold text-green-400">{completedGoalsCount}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Achieved</div>
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-center">
              <div className="text-base font-extrabold text-amber-300 font-mono">{formatTimer(timerSecondsLeft)}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Next Break</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Timetable Generator + Goal Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* LEFT: Study Timetable Generator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm sm:text-base font-bold text-neutral-100">Study Timetable Generator</h3>
              </div>
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-bold text-neutral-400">
                {selectedTimetablePlan}
              </span>
            </div>

            {/* Plan Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-3">
              {Object.keys(PRESET_TIMETABLES).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedTimetablePlan === plan
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>

            {/* Custom Timetable Query */}
            <form onSubmit={handleGenerateCustomTimetable} className="flex gap-2 mb-4">
              <input
                type="text"
                value={customTimetablePrompt}
                onChange={(e) => setCustomTimetablePrompt(e.target.value)}
                placeholder="Ask e.g. 'Make my Class 9 timetable' or 'Exam revision in 5 hours'..."
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!customTimetablePrompt.trim()}
                className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-40 cursor-pointer shrink-0"
              >
                Generate
              </button>
            </form>

            {/* Timetable Slots List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {timetable.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => toggleSlotCompletion(slot.id)}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                    slot.completed
                      ? 'border-neutral-800/60 bg-neutral-950/60 opacity-60'
                      : 'border-neutral-800 bg-neutral-950/90 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5 text-neutral-400 hover:text-orange-400 cursor-pointer"
                    >
                      {slot.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-neutral-500" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${slot.completed ? 'line-through text-neutral-400' : 'text-neutral-100'}`}>
                          {slot.subject}
                        </span>
                        <span className="rounded bg-neutral-800 px-1.5 py-0.2 text-[9px] font-mono text-orange-400">
                          {slot.durationMinutes}m
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-400">{slot.activity}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500 shrink-0">{slot.timeRange}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Goal Tracker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm sm:text-base font-bold text-neutral-100">Study Goal Tracker</h3>
              </div>
              <span className="text-xs text-neutral-400 font-bold">
                {completedGoalsCount}/{goals.length} Done
              </span>
            </div>

            {/* Add Goal Form */}
            <form onSubmit={handleAddGoal} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Finish Gravitation by Sunday..."
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newGoalTitle.trim()}
                  className="flex items-center gap-1 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {(['Physics', 'Math', 'Chemistry', 'Biology', 'Exams', 'Personal'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewGoalCategory(cat)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                      newGoalCategory === cat
                        ? 'bg-orange-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </form>

            {/* Goals List */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    g.category === 'Founder'
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : g.completed
                      ? 'border-neutral-800/60 bg-neutral-950/40 opacity-70'
                      : 'border-neutral-800 bg-neutral-950/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleGoalCompletion(g.id)}
                        className="mt-0.5 text-neutral-400 hover:text-green-400 cursor-pointer"
                      >
                        {g.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-neutral-500" />
                        )}
                      </button>
                      <div>
                        <span className={`text-xs font-bold ${g.completed ? 'line-through text-neutral-400' : 'text-neutral-100'}`}>
                          {g.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold ${g.category === 'Founder' ? 'text-amber-400' : 'text-orange-400'}`}>
                            {g.category}
                          </span>
                          <span className="text-[10px] text-neutral-400">Due: {g.dueDate}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteGoal(g.id)}
                      className="text-neutral-500 hover:text-red-400 cursor-pointer p-1"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden mt-1.5">
                    <div
                      className={`h-full transition-all duration-300 ${
                        g.completed ? 'bg-green-500' : g.category === 'Founder' ? 'bg-amber-400' : 'bg-orange-500'
                      }`}
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Wellness & 45-Min Health Reminders Banner */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-100">
                Wellness & Focus Companion (Every 45 mins)
              </h3>
              <p className="text-xs text-neutral-400">
                Regular hydration, eye breaks, and spine alignment keep mental stamina at peak performance.
              </p>
            </div>
          </div>

          <button
            id="wellness-notification-perm-btn"
            type="button"
            onClick={requestNotificationPermission}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              notificationsGranted
                ? 'border border-green-500/40 bg-green-500/10 text-green-300'
                : 'bg-orange-600 text-white hover:bg-orange-500'
            }`}
          >
            {notificationsGranted ? <Bell className="h-3.5 w-3.5 text-green-400" /> : <BellRing className="h-3.5 w-3.5" />}
            <span>{notificationsGranted ? 'Reminders Active' : 'Enable Browser Reminders'}</span>
          </button>
        </div>

        {/* 3 Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 flex items-start gap-3">
            <Droplet className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-neutral-100">Hydration Check</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Drink at least 250ml of water every hour to prevent brain fatigue and headaches.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 flex items-start gap-3">
            <Eye className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-neutral-100">20-20-20 Eye Break</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Look at an object 20 feet away for 20 seconds to relax ciliary eye muscles.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 flex items-start gap-3">
            <Activity className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-neutral-100">Spine & Posture Check</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Roll your shoulders back, straighten your neck, and take three deep diaphragmatic breaths.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Founder Task Deck (If Founder logged in) */}
      {isFounder && (
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-900 p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-extrabold text-amber-300">
              Founder {effectiveName} Strategic Command Deck 🫡
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mb-4">
            Welcome Boss. Here are your foundational milestones to scale Project AGNI from India to serve the world:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3">
              <span className="font-bold text-amber-400">Feature 1: AR Camera</span>
              <p className="text-neutral-400 mt-1">Real-time overlay on handwritten equations & circuit schematics.</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3">
              <span className="font-bold text-amber-400">Feature 2: Regional Voice</span>
              <p className="text-neutral-400 mt-1">Tamil, Hindi, Telugu, Kannada, Malayalam emotion engine tuning.</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3">
              <span className="font-bold text-amber-400">Feature 3: Dynamic Canvas</span>
              <p className="text-neutral-400 mt-1">Step-by-step interactive diagram drawer & practice mode.</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3">
              <span className="font-bold text-amber-400">Feature 4: Offline Lite</span>
              <p className="text-neutral-400 mt-1">Zero internet access for formula sheets and NCERT summaries.</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3">
              <span className="font-bold text-amber-400">Feature 5: Smart Life OS</span>
              <p className="text-neutral-400 mt-1">Daily timetable generation, goal tracking, and 45-min health pacer.</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3">
              <span className="font-bold text-amber-400">Security & Anti-Hack</span>
              <p className="text-neutral-400 mt-1">Secret code qprwqwertyuio access & zero-trust rate limits.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
