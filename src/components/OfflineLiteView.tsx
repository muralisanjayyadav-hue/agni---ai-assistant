import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  WifiOff,
  Wifi,
  Search,
  BookOpen,
  Atom,
  Binary,
  Layers,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Send,
  Sparkles,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { OFFLINE_FORMULAS, OFFLINE_NCERT_SUMMARIES } from '../data/offlineData';
import { ChatSession } from '../types';

interface OfflineLiteViewProps {
  isOfflineMode: boolean;
  onToggleOfflineMode: (enabled: boolean) => void;
  savedSessions?: ChatSession[];
  onOpenSession?: (sessionId: string) => void;
}

export const OfflineLiteView: React.FC<OfflineLiteViewProps> = ({
  isOfflineMode,
  onToggleOfflineMode,
  savedSessions = [],
  onOpenSession,
}) => {
  const [activeTab, setActiveTab] = useState<'formulas' | 'ncert' | 'chats' | 'scratchpad'>('formulas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<'All' | 'Physics' | 'Chemistry' | 'Mathematics'>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scratchpad offline helper state
  const [scratchQuery, setScratchQuery] = useState('');
  const [scratchReplies, setScratchReplies] = useState<Array<{ q: string; a: string; time: string }>>([
    {
      q: 'What is Ohm\'s Law?',
      a: 'Ohm’s Law: V = IR. The potential difference (V) across a conductor is directly proportional to current (I), provided temperature and physical conditions remain constant. Unit of resistance is Ohm (Ω).',
      time: 'Offline Rule Engine',
    },
  ]);

  // Sync cache status
  const [isSyncingCache, setIsSyncingCache] = useState(false);
  const [cacheSyncSuccess, setCacheSyncSuccess] = useState(false);

  // Filter formulas
  const filteredFormulas = OFFLINE_FORMULAS.filter((item) => {
    const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.formula.toLowerCase().includes(query) ||
      item.topic.toLowerCase().includes(query) ||
      item.explanation.toLowerCase().includes(query);
    return matchesSubject && matchesSearch;
  });

  // Filter NCERT summaries
  const filteredSummaries = OFFLINE_NCERT_SUMMARIES.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.chapter.toLowerCase().includes(query) ||
      item.subject.toLowerCase().includes(query) ||
      item.grade.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query)
    );
  });

  // Handle local formula scratchpad query without internet
  const handleScratchpadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scratchQuery.trim()) return;

    const qLower = scratchQuery.toLowerCase();
    let localAnswer = '';

    // 50 key Q&A pairs for true offline answers
    const OFFLINE_QA: Record<string, string> = {
      'photosynthesis': 'Photosynthesis is how plants make food! 🌱\nPlants use: Sunlight + Water + CO₂ → Glucose + Oxygen\nEquation: 6CO₂ + 6H₂O + Sunlight → C₆H₁₂O₆ + 6O₂\nOccurs in chloroplasts (chlorophyll) — why leaves are green!',
      'respiration': 'Cellular Respiration releases energy from glucose.\nC₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38 ATP (energy)\nHappens in mitochondria — the powerhouse of the cell.',
      'newton': "Newton's 3 Laws of Motion:\n1. Inertia: Objects at rest stay at rest unless acted on by a force.\n2. F = m × a (Force = mass × acceleration)\n3. Every action has an equal and opposite reaction.",
      'gravity': 'Gravity pulls objects toward each other. On Earth, g = 9.8 m/s².\nNewton: F = G(m₁m₂)/r²\nEinstein: Gravity = curvature of spacetime.',
      'ohm': "Ohm's Law: V = I × R\nV = Voltage (Volts), I = Current (Amperes), R = Resistance (Ohms).\nMore resistance → less current for same voltage.",
      'atom': 'An atom has: Protons (+) and Neutrons (neutral) in the nucleus, Electrons (−) orbiting around.\nAtomic number = number of protons. Mass number = protons + neutrons.',
      'dna': 'DNA = Deoxyribonucleic Acid. Double helix structure (Watson & Crick, 1953).\n4 bases: Adenine-Thymine, Cytosine-Guanine.\nDNA → RNA → Protein (Central Dogma).',
      'cell': 'Cell = basic unit of life.\nProkaryotic (no nucleus): bacteria.\nEukaryotic (nucleus): plant & animal cells.\nKey organelles: nucleus, mitochondria, ribosome, ER, Golgi.',
      'mitosis': 'Mitosis: cell divides into 2 identical daughter cells.\nPhases: Prophase → Metaphase → Anaphase → Telophase.\nUsed for growth and repair.',
      'meiosis': 'Meiosis: cell divides into 4 haploid cells (gametes).\nTwo divisions: Meiosis I (homologous separation) and Meiosis II.\nCreates genetic diversity through crossing over.',
      'periodic table': 'Periodic Table: elements arranged by atomic number.\nRows = Periods (7). Columns = Groups (18).\nMetals (left), Non-metals (right), Metalloids (staircase).',
      'water': 'Water (H₂O): 2 hydrogen + 1 oxygen.\nCovers 71% of Earth. Universal solvent.\nBoils at 100°C, freezes at 0°C. Essential for all life.',
      'electricity': 'Electricity = flow of electrons.\nDirect Current (DC): one direction. Alternating Current (AC): changes direction.\nP = V × I (Power = Voltage × Current).',
      'magnet': 'Magnets have North and South poles.\nOpposites attract (N-S), likes repel (N-N, S-S).\nElectromagnets: electric current creates magnetic field.',
      'light': 'Light: electromagnetic wave, speed = 3 × 10⁸ m/s.\nReflection: angle of incidence = angle of reflection.\nRefraction: bending of light between media (Snell\'s law).',
      'sound': 'Sound: mechanical wave, needs medium.\nSpeed in air ≈ 343 m/s at 20°C.\nPitch = frequency. Loudness = amplitude. Echo = reflected sound.',
      'thermodynamics': '1st Law: Energy cannot be created or destroyed.\n2nd Law: Entropy always increases.\n3rd Law: Absolute zero (0 K) cannot be reached.',
      'acid base': 'Acids: pH < 7, sour taste, turn litmus red. e.g. HCl, H₂SO₄.\nBases: pH > 7, bitter taste, turn litmus blue. e.g. NaOH.\npH 7 = neutral (water).',
      'speed velocity': 'Speed = distance/time (scalar, no direction).\nVelocity = displacement/time (vector, has direction).\nAcceleration = change in velocity / time.',
      'ecosystem': 'Ecosystem: community of organisms + their environment.\nFood chain: Producer → Primary consumer → Secondary → Tertiary.\nEnergy decreases at each trophic level (10% rule).',
      'human heart': 'Heart has 4 chambers: Right Atrium, Right Ventricle, Left Atrium, Left Ventricle.\nDouble circulation: pulmonary (heart↔lungs) and systemic (heart↔body).',
      'brain': 'Brain has 3 main parts:\nCerebrum: thinking, memory, senses.\nCerebellum: balance, coordination.\nBrainstem: breathing, heartbeat (involuntary).',
      'python': "Python basics:\nprint('Hello') — output text\nvariables: x = 5\nif/else for decisions\nfor loop: for i in range(10)\ndef function_name(): to create functions",
      'html': "HTML basics:\n<html><head><title>Page</title></head>\n<body><h1>Heading</h1><p>Paragraph</p></body></html>\nTags: <div>, <img>, <a href>, <ul>/<li>",
      'constitution': 'Indian Constitution adopted 26 Nov 1949, effective 26 Jan 1950 (Republic Day).\nDr. B.R. Ambedkar = Chief Architect.\nLongest written constitution. Fundamental Rights in Part III.',
      'independence': 'India: Independence 15 Aug 1947.\nKey leaders: Gandhi (non-violence), Nehru, Bose (INA), Bhagat Singh.\nPartition into India and Pakistan.',
      'gandhi': 'Mahatma Gandhi (1869-1948): Father of the Nation.\nNon-violence (Ahimsa) and Satyagraha.\nKey movements: Non-Cooperation (1920), Salt March (1930), Quit India (1942).',
      'chola': 'Chola Dynasty (300 BCE - 1279 CE): Greatest Tamil dynasty.\nRaja Raja Chola I built Thanjavur Big Temple (1010 AD).\nRajendra Chola conquered Sri Lanka, Maldives, SE Asia. Famous navy.',
      'mughal': 'Mughal Empire (1526-1857):\nBabur → Humayun → Akbar (greatest) → Jahangir → Shah Jahan (Taj Mahal) → Aurangzeb.\nAkbar: religious tolerance, Din-i-Ilahi.',
      'solar system': 'Solar System: Sun + 8 planets.\nOrder: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.\nJupiter = largest. Mercury = smallest. Earth = only known life.',
      'triangle': 'Triangle types: Equilateral (all equal), Isosceles (two equal), Scalene (none equal).\nAngle sum = 180°.\nArea = ½ × base × height.\nPythagoras: a² + b² = c² (right triangle).',
      'circle': 'Circle formulas:\nArea = πr²\nCircumference = 2πr\nDiameter = 2r\nπ ≈ 3.14159',
      'algebra': 'Key algebra formulas:\n(a+b)² = a² + 2ab + b²\n(a-b)² = a² - 2ab + b²\na² - b² = (a+b)(a-b)\nQuadratic: x = (-b ± √(b²-4ac)) / 2a',
      'trigonometry': 'SOH-CAH-TOA:\nsin θ = Opposite/Hypotenuse\ncos θ = Adjacent/Hypotenuse\ntan θ = Opposite/Adjacent\nsin²θ + cos²θ = 1',
      'percentage': 'Percentage = (Part/Whole) × 100\nIncrease: New = Original × (1 + rate/100)\nDecrease: New = Original × (1 - rate/100)\nProfit% = (Profit/CP) × 100',
      'combustion': 'Combustion = burning in oxygen, releases heat & light.\nComplete: fuel + O₂ → CO₂ + H₂O\nIncomplete: produces CO (carbon monoxide) — toxic!',
      'metal nonmetal': 'Metals: shiny, conduct heat/electricity, malleable, ductile. e.g. Iron, Copper.\nNon-metals: dull, poor conductors, brittle. e.g. Sulphur, Carbon.\nMetalloids: both properties. e.g. Silicon.',
      'protein': 'Proteins: made of amino acids (20 types).\nFunctions: enzymes, hormones, antibodies, structural support.\nPrimary → Secondary → Tertiary → Quaternary structure.',
      'vitamin': 'Key vitamins:\nA: vision (carrots). B: energy (grains). C: immunity (citrus).\nD: bones (sunlight). E: antioxidant. K: blood clotting.\nDeficiency causes diseases (Scurvy=C, Rickets=D).',
      'reproduction': 'Sexual reproduction: fusion of male and female gametes → zygote.\nPlants: pollination → fertilisation → seed.\nHumans: sperm + egg → zygote → embryo → fetus.',
      'evolution': 'Evolution: species change over time through natural selection (Darwin).\nVariation → Selection → Inheritance.\nEvidence: fossils, homologous structures, DNA comparison.',
      'earthquake': 'Earthquake: sudden release of energy in Earth\'s crust.\nMeasured on Richter scale.\nCaused by tectonic plate movement.\nFocus (underground) → Epicenter (surface above).',
      'climate change': 'Climate change: long-term shift in temperatures.\nCauses: greenhouse gases (CO₂, CH₄), deforestation, fossil fuels.\nEffects: melting ice, rising seas, extreme weather.',
      'tensor': 'Simple Interest: SI = PNR/100 (P=principal, N=time, R=rate).\nCompound Interest: A = P(1 + R/100)ⁿ\nCI = A - P',
      'fraction': 'Fractions: part/whole. Types: proper (1/3), improper (5/3), mixed (1⅔).\nAdd: same denominator, add numerators.\nMultiply: multiply across. Divide: flip and multiply.',
      'blood': 'Blood components: RBC (oxygen), WBC (immunity), Platelets (clotting), Plasma (liquid).\nBlood groups: A, B, AB (universal recipient), O (universal donor).\nRh factor: + or −.',
      'digestive system': 'Digestion path: Mouth → Oesophagus → Stomach → Small intestine → Large intestine → Rectum.\nEnzymes: Amylase (starch), Pepsin (protein), Lipase (fats).\nAbsorption mainly in small intestine (villi).',
      'computer': 'Computer: Input → Process → Output.\nParts: CPU (brain), RAM (short-term memory), Hard Drive (storage), Monitor (output).\nBinary: 0s and 1s. 1 byte = 8 bits.',
      'ai artificial intelligence': 'AI = machines that mimic human intelligence.\nTypes: Narrow AI (specific task), General AI (human-level), Super AI (beyond human).\nExamples: Siri, ChatGPT, self-driving cars, AGNI!',
    };

    // Search offline Q&A bank first
    const qaMatch = Object.entries(OFFLINE_QA).find(([key]) =>
      key.split(' ').some((word) => qLower.includes(word) && word.length > 2) || qLower.includes(key)
    );
    if (qaMatch) {
      localAnswer = qaMatch[1];
    }

    // Search local formulas
    const matchedFormula = OFFLINE_FORMULAS.find(
      (f) =>
        qLower.includes(f.name.toLowerCase()) ||
        qLower.includes(f.topic.toLowerCase()) ||
        f.variables.some((v) => qLower.includes(v.toLowerCase().split('=')[0].trim()))
    );

    const matchedNcert = OFFLINE_NCERT_SUMMARIES.find(
      (n) => qLower.includes(n.chapter.toLowerCase()) || qLower.includes(n.subject.toLowerCase())
    );

    if (!localAnswer && matchedFormula) {
      localAnswer = `**${matchedFormula.name} (${matchedFormula.subject})**\n\n` +
        `Formula: \`${matchedFormula.formula}\`\n\n` +
        `${matchedFormula.explanation}\n\n` +
        `**Key Variables:**\n${matchedFormula.variables.map((v) => `• ${v}`).join('\n')}\n\n` +
        `**Example:** ${matchedFormula.example}`;
    } else if (!localAnswer && matchedNcert) {
      localAnswer = `**${matchedNcert.chapter} (${matchedNcert.grade} - ${matchedNcert.subject})**\n\n` +
        `${matchedNcert.summary}\n\n` +
        `**Core Points:**\n${matchedNcert.keyPoints.map((k) => `• ${k}`).join('\n')}`;
    } else if (!localAnswer) {
      localAnswer = `📴 **Offline Mode** — I don't have a pre-loaded answer for "${scratchQuery}" yet.\n\n` +
        `Try asking about: photosynthesis, Newton's laws, atoms, DNA, trigonometry, Chola dynasty, Indian constitution, or any topic from the Formula Bank above.\n\n` +
        `When you reconnect to the internet, AGNI AI will answer everything! 🌐`;
    }

    setScratchReplies((prev) => [
      {
        q: scratchQuery,
        a: localAnswer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    setScratchQuery('');
  };

  // Cache everything offline
  const handleCacheEverything = () => {
    setIsSyncingCache(true);
    setCacheSyncSuccess(false);

    try {
      localStorage.setItem('agni_offline_formulas', JSON.stringify(OFFLINE_FORMULAS));
      localStorage.setItem('agni_offline_ncert', JSON.stringify(OFFLINE_NCERT_SUMMARIES));
      localStorage.setItem('agni_offline_synced_at', new Date().toISOString());

      setTimeout(() => {
        setIsSyncingCache(false);
        setCacheSyncSuccess(true);
        setTimeout(() => setCacheSyncSuccess(false), 3500);
      }, 700);
    } catch (e) {
      console.warn('Offline cache storage error:', e);
      setIsSyncingCache(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="offline-lite-view-root" className="mx-auto max-w-6xl px-3 py-4 sm:px-6">
      {/* Offline Status Top Banner */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900 p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">AGNI Lite Mode Active</h2>
                <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                  Zero Internet Required
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-300 max-w-xl">
                Works without internet for saved chapters, complete formula sheets, NCERT summaries, and offline scratchpad. Ideal for rural and low-connectivity regions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="offline-cache-all-btn"
              type="button"
              onClick={handleCacheEverything}
              disabled={isSyncingCache}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/90 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-500 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              {cacheSyncSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-green-300">Synced Offline!</span>
                </>
              ) : isSyncingCache ? (
                <>
                  <RefreshCw className="h-4 w-4 text-orange-400 animate-spin" />
                  <span>Caching...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="h-4 w-4 text-orange-400" />
                  <span>Sync 100% Offline</span>
                </>
              )}
            </button>

            <button
              id="offline-toggle-active-btn"
              type="button"
              onClick={() => onToggleOfflineMode(!isOfflineMode)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isOfflineMode
                  ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                  : 'border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {isOfflineMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              <span>{isOfflineMode ? 'Lite Mode: ON' : 'Go Offline'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('formulas')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'formulas'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            <Atom className="h-3.5 w-3.5" />
            <span>Formula Bank ({OFFLINE_FORMULAS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ncert')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ncert'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>NCERT Summaries ({OFFLINE_NCERT_SUMMARIES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Saved Chats ({savedSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scratchpad')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scratchpad'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Offline Scratchpad</span>
          </button>
        </div>

        {/* Search input for formulas and NCERT */}
        {activeTab !== 'scratchpad' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offline topics..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* TAB 1: FORMULAS BANK */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          {/* Subject Filter Chips */}
          <div className="flex items-center gap-1.5">
            {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-white'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredFormulas.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-sm hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                      {item.subject} • {item.topic}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-100">{item.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.formula, item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                    title="Copy formula"
                  >
                    {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Formula Box */}
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2.5 font-mono text-xs font-bold text-orange-300 mb-2">
                  {item.formula}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed mb-2.5">{item.explanation}</p>

                {/* Variables */}
                <div className="rounded-lg bg-neutral-950 p-2 text-[11px] text-neutral-400 mb-2 space-y-0.5">
                  <span className="font-semibold text-neutral-300">Variables:</span>
                  {item.variables.map((v, i) => (
                    <div key={i} className="pl-1">
                      {v}
                    </div>
                  ))}
                </div>

                {/* Example */}
                <div className="text-[11px] text-neutral-400 bg-neutral-800/40 rounded-lg p-2">
                  <span className="font-semibold text-amber-300">Example: </span>
                  {item.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: NCERT SUMMARIES */}
      {activeTab === 'ncert' && (
        <div className="space-y-3.5">
          {filteredSummaries.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                  {item.grade}
                </span>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                  {item.subject}
                </span>
              </div>
              <h3 className="text-sm font-bold text-neutral-100 mb-2">{item.chapter}</h3>
              <p className="text-xs text-neutral-300 leading-relaxed mb-3">{item.summary}</p>

              <div className="rounded-lg bg-neutral-950 p-3">
                <h4 className="text-xs font-bold text-amber-400 mb-1.5">Key Exam Revision Points:</h4>
                <ul className="space-y-1">
                  {item.keyPoints.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-neutral-300">
                      <ChevronRight className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SAVED CHATS */}
      {activeTab === 'chats' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Last 20 Cached Conversations in Local Storage</span>
            <span>{savedSessions.length} sessions available offline</span>
          </div>

          {savedSessions.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
              <HardDrive className="mx-auto h-8 w-8 text-neutral-500 mb-2" />
              <p className="text-sm font-semibold text-neutral-300">No cached chat sessions found</p>
              <p className="text-xs text-neutral-500 mt-1">
                Chats you have while online are automatically saved to local storage so you can review them offline anytime.
              </p>
            </div>
          ) : (
            savedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onOpenSession?.(session.id)}
                className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3.5 hover:border-orange-500/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-neutral-100 truncate">{session.title}</h4>
                  <span className="text-[11px] text-neutral-500 shrink-0">{session.updatedAt}</span>
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2">
                  {session.messages[session.messages.length - 1]?.text || 'No messages'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-orange-400">
                  <span>{session.messages.length} messages</span>
                  <span>•</span>
                  <span>Tap to open & read offline</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: OFFLINE SCRATCHPAD */}
      {activeTab === 'scratchpad' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
            <h3 className="text-sm font-bold text-neutral-100 mb-1 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>Offline Instant Formula & Concept Query</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Type any concept, law, or formula name. AGNI’s local offline engine will instantly match and show the formula and explanation without needing an internet connection.
            </p>

            <form onSubmit={handleScratchpadSubmit} className="flex gap-2">
              <input
                type="text"
                value={scratchQuery}
                onChange={(e) => setScratchQuery(e.target.value)}
                placeholder="Ask about Ohm's law, Gravitation, Moles, Quadratic equation..."
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!scratchQuery.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-500 disabled:opacity-40 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Scratchpad history */}
          <div className="space-y-3">
            {scratchReplies.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span className="font-bold text-neutral-200">Q: {item.q}</span>
                  <span className="text-[10px] text-orange-400">{item.time}</span>
                </div>
                <div className="mt-2 text-xs text-neutral-300 whitespace-pre-line leading-relaxed bg-neutral-950 rounded-lg p-3">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
