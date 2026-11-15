/**
 * TNBoardMode — TN Board Samacheer Kalvi Mode (Feature 13)
 * Toggle in LearnView, allows asking about TN Board chapters 9th–12th.
 * Sends context to Groq for TN-board-specific answers.
 * Founder: M. Sanjay (muralisanjayyadav@gmail.com)
 */

import React, { useState } from 'react';
import { Book, Send, GraduationCap, Loader2, ChevronDown } from 'lucide-react';
import BackButton from './BackButton';

const TN_SYLLABUS: Record<string, Record<string, string[]>> = {
  '10th': {
    Science: [
      'Ch-1: Laws of Motion', 'Ch-2: Optics', 'Ch-3: Thermal Physics', 'Ch-4: Electricity',
      'Ch-5: Acoustics', 'Ch-6: Nuclear Physics', 'Ch-7: Atoms and Molecules', 'Ch-8: Periodic Classification',
      'Ch-9: Solutions', 'Ch-10: Types of Chemical Reactions', 'Ch-11: Carbon and its Compounds',
      'Ch-12: Plant Anatomy & Plant Physiology', 'Ch-13: Structural Organisation of Animals',
      'Ch-14: Transportation in Plants & Circulation', 'Ch-15: Nervous System',
      'Ch-16: Plant & Animal Hormones', 'Ch-17: Reproduction in Plants & Animals',
      'Ch-18: Heredity', 'Ch-19: Origin and Evolution of Life', 'Ch-20: Breeding & Biotechnology',
      'Ch-21: Health & Diseases', 'Ch-22: Environmental Management', 'Ch-23: Visual Communication',
    ],
    Maths: [
      'Ch-1: Relations and Functions', 'Ch-2: Numbers and Sequences', 'Ch-3: Algebra',
      'Ch-4: Geometry', 'Ch-5: Coordinate Geometry', 'Ch-6: Trigonometry',
      'Ch-7: Mensuration', 'Ch-8: Statistics and Probability',
    ],
    Social: [
      'Ch-1: Outbreak of World War I', 'Ch-2: World War II', 'Ch-3: World after World War II',
      'Ch-4: The World after 1945', 'Ch-5: India – Location & Relief Features',
      'Ch-6: Climate of India', 'Ch-7: Resources & Industries',
    ],
  },
  '11th': {
    Physics: [
      'Ch-1: Nature of Physical World', 'Ch-2: Kinematics', 'Ch-3: Laws of Motion',
      'Ch-4: Work, Energy and Power', 'Ch-5: Motion of System of Particles',
      'Ch-6: Gravitation', 'Ch-7: Properties of Matter', 'Ch-8: Heat and Thermodynamics',
      'Ch-9: Kinetic Theory of Gases', 'Ch-10: Oscillations', 'Ch-11: Waves',
    ],
    Chemistry: [
      'Ch-1: Basic Concepts', 'Ch-2: Quantum Mechanical Model', 'Ch-3: Periodic Classification',
      'Ch-4: Hydrogen', 'Ch-5: Alkali & Alkaline Earth Metals', 'Ch-6: Gaseous State',
      'Ch-7: Thermodynamics', 'Ch-8: Physical & Chemical Equilibrium',
      'Ch-9: Solutions', 'Ch-10: Chemical Bonding',
    ],
    Biology: [
      'Ch-1: Living World', 'Ch-2: Plant Kingdom', 'Ch-3: Animal Kingdom',
      'Ch-4: Morphology of Flowering Plants', 'Ch-5: Anatomy of Flowering Plants',
      'Ch-6: Cell: Structure & Function', 'Ch-7: Cell Cycle',
      'Ch-8: Biomolecules', 'Ch-9: Plant Physiology', 'Ch-10: Animal Physiology',
    ],
  },
  '12th': {
    Physics: [
      'Ch-1: Electrostatics', 'Ch-2: Current Electricity', 'Ch-3: Magnetism',
      'Ch-4: Electromagnetic Induction', 'Ch-5: Electromagnetic Waves', 'Ch-6: Optics',
      'Ch-7: Dual Nature of Radiation', 'Ch-8: Atomic & Nuclear Physics',
      'Ch-9: Semiconductor Electronics', 'Ch-10: Communication Systems',
    ],
    Chemistry: [
      'Ch-1: Metallurgy', 'Ch-2: p-Block Elements', 'Ch-3: d and f Block Elements',
      'Ch-4: Coordination Chemistry', 'Ch-5: Isomerism in Organic',
      'Ch-6: Hydroxy Compounds & Ethers', 'Ch-7: Carbonyl Compounds',
      'Ch-8: Carboxylic Acids', 'Ch-9: Organic Nitrogen Compounds', 'Ch-10: Biomolecules',
    ],
    Biology: [
      'Ch-1: Reproduction in Organisms', 'Ch-2: Human Reproduction',
      'Ch-3: Reproductive Health', 'Ch-4: Principles of Inheritance',
      'Ch-5: Molecular Genetics', 'Ch-6: Evolution', 'Ch-7: Human Health & Disease',
      'Ch-8: Microbes in Human Welfare', 'Ch-9: Biotechnology',
      'Ch-10: Organisms and Environment', 'Ch-11: Biodiversity',
    ],
  },
  '9th': {
    Science: [
      'Ch-1: Measurement', 'Ch-2: Motion', 'Ch-3: Fluids', 'Ch-4: Electric Charge and Electric Current',
      'Ch-5: Magnetism & Electromagnetism', 'Ch-6: Light', 'Ch-7: Heat',
      'Ch-8: Sound', 'Ch-9: Universe', 'Ch-10: Matter Around Us',
      'Ch-11: Atoms and Molecules', 'Ch-12: Chemical Bonding',
      'Ch-13: Chemical Reactions', 'Ch-14: Solutions', 'Ch-15: Carbon Compounds',
      'Ch-16: Living World', 'Ch-17: Organisation in Living Things',
    ],
    Maths: [
      'Ch-1: Set Language', 'Ch-2: Real Numbers', 'Ch-3: Algebra',
      'Ch-4: Geometry', 'Ch-5: Coordinate Geometry', 'Ch-6: Trigonometry',
      'Ch-7: Mensuration', 'Ch-8: Statistics', 'Ch-9: Probability',
    ],
  },
};

export default function TNBoardMode() {
  const [selectedGrade, setSelectedGrade] = useState('10th');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const subjects = TN_SYLLABUS[selectedGrade] ? Object.keys(TN_SYLLABUS[selectedGrade]) : [];
  const chapters = selectedSubject && TN_SYLLABUS[selectedGrade]?.[selectedSubject] || [];

  const askQuestion = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setIsLoading(true);
    setError('');
    setAnswer('');
    try {
      const context = selectedSubject
        ? `Tamil Nadu Samacheer Kalvi ${selectedGrade} ${selectedSubject}. Chapters: ${chapters.join(', ')}.`
        : `Tamil Nadu Samacheer Kalvi ${selectedGrade} syllabus.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          mode: 'learn',
          mode_context: `TN Board Samacheer Kalvi context: ${context}. Answer as a Tamil Nadu board student tutor. Use TN Board textbook terminology. Give step-by-step explanations. Include relevant formulas and diagrams descriptions.`,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.text || 'Could not get answer. Try again.';
      setAnswer(reply);
    } catch {
      setError('⚠️ Could not reach AI service. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <BackButton />
        <GraduationCap className="h-6 w-6 text-[#FF6B00]" />
        <div>
          <h1 className="text-lg font-bold text-[#FF6B00]">TN Board Mode 📚</h1>
          <p className="text-xs text-neutral-400">Samacheer Kalvi 9th – 12th</p>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-4 pb-24">
        {/* Grade & Subject selector */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-neutral-400 mb-1 block">Grade</label>
            <div className="relative">
              <select
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setSelectedSubject(''); setAnswer(''); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:border-[#FF6B00]"
              >
                {Object.keys(TN_SYLLABUS).map((g) => (
                  <option key={g} value={g} className="bg-[#1a1a1a]">{g} Standard</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-neutral-400 mb-1 block">Subject</label>
            <div className="relative">
              <select
                value={selectedSubject}
                onChange={(e) => { setSelectedSubject(e.target.value); setAnswer(''); }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:border-[#FF6B00]"
              >
                <option value="" className="bg-[#1a1a1a]">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Chapter list */}
        {chapters.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="font-bold text-sm text-[#FF6B00] mb-2 flex items-center gap-2">
              <Book className="h-4 w-4" />
              {selectedGrade} {selectedSubject} Chapters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {chapters.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => { setQuestion(`Explain ${ch} from ${selectedGrade} ${selectedSubject} TN Board`); askQuestion(`Explain ${ch} from ${selectedGrade} ${selectedSubject} TN Board Samacheer Kalvi textbook`); }}
                  className="text-left text-xs bg-white/5 hover:bg-[#FF6B00]/20 rounded-lg px-3 py-2 transition-colors border border-white/5 hover:border-[#FF6B00]/40"
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question input */}
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            placeholder={`Ask about ${selectedGrade} ${selectedSubject || 'any subject'}...`}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]"
          />
          <button
            onClick={() => askQuestion()}
            disabled={isLoading || !question.trim()}
            className="bg-[#FF6B00] hover:bg-orange-600 rounded-xl px-4 py-3 disabled:opacity-50 transition-all"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        {/* Answer */}
        {error && <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">{error}</div>}
        {answer && (
          <div className="bg-white/5 rounded-2xl p-5 border border-[#FF6B00]/20 text-sm leading-relaxed whitespace-pre-wrap">
            <div className="flex items-center gap-2 mb-3 text-[#FF6B00] font-bold">
              <GraduationCap className="h-4 w-4" />
              AGNI Answer — {selectedGrade} {selectedSubject || 'General'}
            </div>
            {answer}
          </div>
        )}

        {/* Quick questions */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="font-bold text-sm text-white mb-2">🔥 Popular Questions</h3>
          <div className="flex flex-wrap gap-2">
            {[
              '10th Science Ch-2 Optics explain',
              '12th Physics Electrostatics formulas',
              '10th Maths Trigonometry important problems',
              '11th Chemistry Periodic Classification',
              '10th Science Heredity explain with diagram',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => { setQuestion(q); askQuestion(`${q} — TN Board Samacheer Kalvi`); }}
                className="text-xs bg-white/10 hover:bg-[#FF6B00]/20 rounded-lg px-3 py-1.5 border border-white/10 hover:border-[#FF6B00]/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
