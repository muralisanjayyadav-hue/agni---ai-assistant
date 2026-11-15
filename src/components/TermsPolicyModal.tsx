import React, { useState } from 'react';
import {
  X,
  Shield,
  FileText,
  Lock,
  GraduationCap,
  Sparkles,
  Flame,
  CheckCircle2,
  ExternalLink,
  Search,
  Heart,
  Scale,
  Trophy,
  Award,
} from 'lucide-react';

import { AuthUser } from '../types';
import { GOLD_FOUNDERS } from '../lib/auth';

interface TermsPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'student' | 'about';
  authUser?: AuthUser | null;
  onOpenFounderAccess?: () => void;
  customFounderBio?: string;
}

export const TermsPolicyModal: React.FC<TermsPolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
  authUser,
  onOpenFounderAccess,
  customFounderBio,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'student' | 'about'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <div
      id="agni-terms-policy-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 shadow-md shadow-orange-500/20 text-white">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  AGNI Terms &amp; Policy
                </h2>
                <span className="rounded-full bg-orange-100 dark:bg-orange-950/70 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60">
                  Made in India
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Terms of Service • Privacy Policy • Student Safety • Founders M. Sanjay & T. Hasini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close Terms & Policy"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation & Quick Search */}
        <div className="px-6 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-2 sm:items-center justify-between bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Terms of Service</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Student Safety</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Heart className="h-3.5 w-3.5" />
              <span>About &amp; Founder</span>
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policy..."
              className="w-full sm:w-44 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 py-1 pl-7 pr-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm leading-relaxed space-y-5">
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 p-4 border border-orange-200/80 dark:border-orange-800/40">
                <p className="font-semibold text-orange-900 dark:text-orange-200">
                  Welcome to AGNI (Artificial Generative Neural Intelligence)
                </p>
                <p className="mt-1 text-xs text-orange-800 dark:text-orange-300">
                  By accessing or using the AGNI web platform, voice assistant orb, offline study packs, or
                  multimodal features, you agree to comply with these Terms of Service.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">1. Purpose &amp; Intended Use</h3>
                <p className="mt-1">
                  AGNI is designed as an accessible, high-performance conversational AI assistant tailored
                  for students, educators, and lifelong learners across India and worldwide. AGNI provides
                  educational explanations, problem-solving assistance, multilingual translation, voice conversations,
                  document analysis, and study tools.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">2. Educational Integrity &amp; Responsible Use</h3>
                <p className="mt-1">
                  AGNI is intended to assist your comprehension and concept mastery. You agree not to use AGNI to:
                </p>
                <ul className="mt-1.5 list-disc pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                  <li>Engage in exam malpractice, unauthorized cheating, or academic dishonesty.</li>
                  <li>Generate harmful, abusive, defamatory, discriminatory, or unlawful content.</li>
                  <li>Distribute malware, attack system endpoints, or compromise user sessions.</li>
                  <li>Impersonate individuals or misrepresent affiliations.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">3. Generative AI Disclaimers &amp; Verification</h3>
                <p className="mt-1">
                  AGNI synthesizes knowledge using advanced AGNI Multimodal Neural Models. While AGNI
                  strives for high accuracy, AI outputs may occasionally contain inaccuracies or hallucinations.
                  Users should independently verify critical medical, legal, structural, or high-stakes financial data.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">4. Voice &amp; Speech Interaction</h3>
                <p className="mt-1">
                  The Voice Orb and Natural Voice features enable bidirectional speech in regional Indian
                  languages (Telugu, Hindi, Tamil, Kannada, etc.) and global tongues. You may tap to speak or
                  type your inquiries. You may stop AI speech output at any time using the dedicated &quot;Stop Speaking&quot; button.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">5. Intellectual Property</h3>
                <p className="mt-1">
                  AGNI’s branding, design architecture, customized features, and software interfaces are
                  conceived and built under the direction of <strong>Founders M. Sanjay &amp; T. Hasini</strong>. All rights reserved.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200/80 dark:border-emerald-800/40">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    AGNI Privacy Promise: Zero Data Selling
                  </p>
                </div>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                  Your privacy, documents, and voice recordings are respected. We do NOT monetize or sell your
                  personal queries to third-party ad networks.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">1. Local-First Client Storage</h3>
                <p className="mt-1">
                  Your study preferences, custom flashcard decks, offline study packs, and chat sessions are
                  stored locally in your browser storage (IndexedDB / localStorage) for instant access and
                  offline reliability. You maintain full ownership and can export or wipe your data anytime.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">2. Voice &amp; Microphone Audio Security</h3>
                <p className="mt-1">
                  When you tap the Voice Orb to talk with AGNI:
                </p>
                <ul className="mt-1.5 list-disc pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                  <li>Microphone access is requested strictly when you activate voice mode.</li>
                  <li>Speech-to-text recognition converts spoken phonemes to text queries in real time.</li>
                  <li>AGNI does NOT record or maintain private voice databases for commercial targeting.</li>
                  <li>You can always use the <strong>Typing Option</strong> if you prefer not to use your microphone.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">3. Documents &amp; Visual Homework Uploads</h3>
                <p className="mt-1">
                  When you upload diagrams, syllabus notes, or homework photos in Vision or Documents view,
                  they are processed solely to formulate answers and step-by-step solutions for your session.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">4. Account Information</h3>
                <p className="mt-1">
                  If you choose to sign in via linked provider or email, we only retain your
                  display name, email address, and avatar to personalize your experience. No intrusive tracking
                  or background telemetry is harvested.
                </p>
              </div>


              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">5. Data Deletion Rights (India DPDP Act 2023)</h3>
                <p className="mt-1">
                  You have the right to request deletion of your account and all associated data at any time. Contact us at <strong>muralisanjayyadav@gmail.com</strong> with subject &quot;Delete My AGNI Data&quot;. We will process deletion within 7 business days.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">6. Children Privacy (Under 13)</h3>
                <p className="mt-1">
                  AGNI does not knowingly collect personal information from children under 13 without verifiable parental consent. Contact muralisanjayyadav@gmail.com to request data removal for a minor.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">7. Contact &amp; Grievance Officer</h3>
                <p className="mt-1">
                  For privacy concerns or data deletion: <strong>Founders M. Sanjay &amp; T. Hasini</strong>, Grievance Officers. Email: muralisanjayyadav@gmail.com. Response within 48 hours.
                </p>
              </div>
            </div>
          )}
          {/* TAB 3: STUDENT SAFETY */}
          {activeTab === 'student' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200/80 dark:border-blue-800/40">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="font-semibold text-blue-900 dark:text-blue-200">
                    Dedicated Student Safety &amp; Youth Guardrails
                  </p>
                </div>
                <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                  Designed from the ground up to provide a safe, encouraging, and academically nurturing environment.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">1. Safe AI Content Filtering</h3>
                <p className="mt-1">
                  AGNI incorporates strict multi-tiered safety filters to block explicit, adult, violent, or
                  harmful content. When Student Mode is toggled on, explanations are calibrated to age-appropriate
                  grade levels (Classes 6 through College / Competitive Exams).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">2. Concept-First Learning Support</h3>
                <p className="mt-1">
                  Rather than just providing answers, AGNI provides the &quot;why&quot; and &quot;how&quot; behind solutions,
                  empowering students to master mathematical logic, physics derivations, and biological concepts.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">3. Multilingual Empowerment for Indian Students</h3>
                <p className="mt-1">
                  Recognizing the diversity of Indian education boards (CBSE, ICSE, State Boards, JEE, NEET),
                  AGNI offers seamless explanations in Telugu, Hindi, Tamil, Kannada, Bengali, and bilingual
                  modes (Tunglish &amp; Hinglish) so language is never a barrier to learning.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm">4. Parental &amp; Educator Transparency</h3>
                <p className="mt-1">
                  Parents and teachers can review saved flashcards, study sheets, and memory items at any time
                  directly from the user device.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT & FOUNDER */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Anti-Hack A+ Security Badge */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 shadow-sm">
                <div className="flex items-center gap-2 font-bold tracking-tight">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
                    🔒
                  </span>
                  <span>A+ Secured by Founders M. Sanjay &amp; T. Hasini | Anti-Hack Active</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300">
                  Protected
                </span>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-rose-500/15 p-5 border border-orange-500/30 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-md shadow-orange-600/30">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
                        Founders: M. Sanjay & T. Hasini
                      </h3>
                      <span className="rounded-full bg-orange-100 dark:bg-orange-950/80 px-2.5 py-0.5 text-[10px] font-bold text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
                        Founders of AGNI
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Multi-Sports Person • Kind-Hearted Innovator • Made in India, To Serve the World
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/60 dark:border-neutral-800/80 backdrop-blur-sm">
                  <p className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 font-medium">
                    &quot;M. Sanjay &amp; T. Hasini are the founders of AGNI. They founded AGNI to solve day-to-day life problems faced by people. Their vision is Project AGNI - Made in India, To Serve the World - a unified multimodal personal AI assistant that can explain concepts step-by-step, analyze diagrams, fetch live discoveries, and organize tasks, just like a true human friend. They believe AI should be helpful, humble, and human.&quot;
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-3 py-1 font-semibold text-orange-800 dark:text-orange-300 text-[11px]">
                      <Trophy className="h-3.5 w-3.5 text-orange-500" />
                      <span>Multi-Sports Person</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1 font-semibold text-rose-800 dark:text-rose-300 text-[11px]">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      <span>Kind-Hearted</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 font-semibold text-amber-800 dark:text-amber-300 text-[11px]">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Innovator</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
                      <span>🇮🇳</span>
                      <span>Made in India</span>
                    </span>
                  </div>

                  {/* Hidden Founder Access button in Terms & Policy (About tab) - STRICTLY For Gold Founders (M. Sanjay & T. Hasini) */}
                  {GOLD_FOUNDERS.map((e) => e.toLowerCase().trim()).includes(authUser?.email?.toLowerCase().trim() || '') && onOpenFounderAccess && (
                    <button
                      type="button"
                      id="terms-founder-access-btn"
                      onClick={() => {
                        onClose();
                        onOpenFounderAccess();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-300 shadow-sm transition-all cursor-pointer select-none animate-in fade-in"
                      title="Founder Access Panel • Gold Access 👑"
                    >
                      <Lock className="h-3 w-3 text-amber-500 dark:text-amber-300" />
                      <span>Founder Access</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  style={{ backgroundColor: '#0a090a' }}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Founder &amp; Architect</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">M. Sanjay &amp; T. Hasini</span>
                  <p className="text-neutral-500 text-[11px] mt-0.5">Founded AGNI to solve everyday human problems</p>
                </div>

                <div
                  style={{ backgroundColor: '#000000' }}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Philosophy &amp; Values</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">Helpful, Humble &amp; Human</span>
                  <p className="text-neutral-500 text-[11px] mt-0.5">Empathetic companionship, not cold machines</p>
                </div>

                <div
                  style={{ backgroundColor: '#0c0b0c' }}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Technology Stack</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">AGNI Neural Multimodal Engine</span>
                  <p className="text-neutral-500 text-[11px] mt-0.5">Natural voice, vision, student learning &amp; live web</p>
                </div>

                <div
                  style={{ backgroundColor: '#060506' }}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3"
                >
                  <span className="text-neutral-400 font-semibold block text-[10px] uppercase">Mission Slogan</span>
                  <span className="font-bold text-neutral-900 dark:text-white text-sm">Made in India, To Serve the World</span>
                  <p className="text-neutral-500 text-[11px] mt-0.5">13+ Indian &amp; Global languages</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/90 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Last Updated: September 2026 • Version 2.5</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 font-bold shadow-sm transition cursor-pointer"
          >
            <span>I Understand &amp; Agree</span>
          </button>
        </div>
      </div>
    </div>
  );
};
