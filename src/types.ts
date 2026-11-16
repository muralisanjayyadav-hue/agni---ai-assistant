export type TabMode =
  | 'home'
  | 'chat'
  | 'heart_care'
  | 'voice'
  | 'learn'
  | 'vision'
  | 'canvas'
  | 'offline'
  | 'life_os'
  | 'documents'
  | 'bot'
  | 'search'
  | 'actions'
  | 'memory'
  | 'settings'
  | 'jarvis'
  | 'doubt_battle'
  | 'tn_board'
  | 'my_voice'
  | 'parent_dashboard'
  | 'founder_analytics'
  | 'founder_panel';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'facebook' | 'instagram' | 'microsoft' | 'email';
  isFounder?: boolean;
  isCoFounder?: boolean;
}

export interface CoFounder {
  email: string;
  name: string;
  addedAt: string;
  appointedBy: string;
}

export interface FounderBroadcast {
  id: string;
  message: string;
  timestamp: string;
  active: boolean;
  author: string;
}

export interface FounderFeedback {
  id: string;
  userName: string;
  userEmail: string;
  rating: number;
  message: string;
  timestamp: string;
  tag?: string;
}

export interface MediaAttachment {
  id: string;
  url: string;
  type: 'image' | 'video';
  mimeType: string;
  name?: string;
  size?: number;
  thumbnailUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
  isSpeaking?: boolean;
  attachments?: MediaAttachment[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  thumbnailUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type LanguageCode = string;

export interface UserPreferences {
  userName: string;
  language: string; // 'English' | 'Tunglish' | 'Hinglish' | 'Telugu' | 'Hindi' | 'Tamil' | 'Bengali' | 'Marathi'
  bilingualMode?: 'none' | 'hinglish' | 'tunglish';
  responseStyle: 'concise' | 'educational' | 'balanced' | 'technical' | 'empathetic';
  isStudent: boolean;
  studentGrade: string;
  emotionalSupportMode?: boolean;
  voiceEnabled: boolean;
  masterVolume?: number; // 0 - 100
  powerState?: 'active' | 'standby' | 'saver';
  wakeWordEnabled?: boolean;
  voiceSpeed: number; // 0.8 - 1.2
  voicePitch?: number;
  voiceProfile?: 'natural-warm' | 'natural-clarity' | 'indian-accent' | 'studio-deep';
  agniVoiceProfile?: 'swara' | 'ember' | 'dhruv' | 'tara';
  agniVoice?: 'Aoede' | 'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon';
  theme: 'dark' | 'light';
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  topic?: string;
  mastered?: boolean;
}

export interface BookmarkedVoiceNote {
  id: string;
  text: string;
  timestamp: string;
  speaker: 'user' | 'agni';
  topic?: string;
}

export interface OfflineStudyPack {
  id: string;
  title: string;
  category: string;
  description: string;
  itemsCount: number;
  sizeKb: number;
  downloaded: boolean;
  content: string;
}

export interface StoredMemory {
  id: string;
  content: string;
  category: 'preference' | 'study' | 'personal' | 'goal';
  createdAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  category: 'study' | 'homework' | 'general';
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export interface DeviceIntentAction {
  intent: 'APP_LAUNCH' | 'SET_REMINDER' | 'SET_TIMER' | 'SET_ALARM' | 'WEB_SEARCH' | 'STUDY_HELP' | 'GENERAL_CHAT';
  appName: string | null;
  parameters: {
    title?: string | null;
    time?: string | null;
    durationMinutes?: number | null;
    searchQuery?: string | null;
  };
  requiresConfirmation: boolean;
  spokenFeedback: string;
}

// Feature 1: AR Camera & Real-Time Vision Types
export interface VisionAROverlay {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number;
  height: number;
  label: string;
  type: 'error' | 'formula' | 'component' | 'solution' | 'step';
  detail: string;
}

// Feature 3: Interactive Canvas & Diagram Types
export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  detail?: string;
  category?: string;
  color?: string;
  step?: number;
  revealedInPractice?: boolean;
}

export interface CanvasConnector {
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
}

export interface CanvasDiagram {
  id: string;
  title: string;
  description: string;
  category: string;
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
}

// Feature 5: Smart Life OS Types
export interface LifeOSGoal {
  id: string;
  title: string;
  category: 'Physics' | 'Math' | 'Chemistry' | 'Biology' | 'Exams' | 'Personal' | 'Founder';
  dueDate: string;
  progress: number; // 0 to 100
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface TimetableSlot {
  id: string;
  timeRange: string;
  subject: string;
  activity: string;
  durationMinutes: number;
  type: 'deep_study' | 'problem_solving' | 'active_recall' | 'break' | 'revision';
  completed: boolean;
}

export interface WellnessConfig {
  waterIntervalMinutes: number;
  postureIntervalMinutes: number;
  eyeBreakIntervalMinutes: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

// Feature 4: Offline Formula Bank Item
export interface OfflineFormulaItem {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  topic: string;
  name: string;
  formula: string;
  explanation: string;
  variables: string[];
  example: string;
}
