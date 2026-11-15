import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Palette,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Eye,
  EyeOff,
  Sparkles,
  Maximize2,
  RefreshCw,
  Layers,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface AgniCanvasProps {
  initialTopic?: string;
  onClose?: () => void;
  isStandalone?: boolean;
  onExplainWithVoice?: (text: string) => void;
}

interface DiagramPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  steps: string[];
}

const PRESETS: DiagramPreset[] = [
  {
    id: 'photosynthesis',
    title: 'Photosynthesis & Calvin Cycle',
    category: 'Biology',
    description: 'Light-dependent photolysis in thylakoids and carbon fixation in stroma.',
    steps: [
      'Sunlight Absorption (P680 Chlorophyll)',
      'Water Photolysis (H₂O → O₂ + 4H⁺ + 4e⁻)',
      'ATP & NADPH Formation (Thylakoid ETC)',
      'Atmospheric CO₂ Fixation via RuBisCO',
      'Calvin Cycle Regeneration (Stroma)',
      'Glucose Synthesis (C₆H₁₂O₆ Output)',
    ],
  },
  {
    id: 'heart',
    title: 'Human Heart Double Circulation',
    category: 'Anatomy',
    description: 'Deoxygenated venous return to lungs and systemic oxygenated pumping.',
    steps: [
      'Deoxygenated Blood Entry (Vena Cava)',
      'Right Atrium to Ventricle (Tricuspid)',
      'Pulmonary Artery to Lungs (O₂ binding)',
      'Oxygenated Blood Return (Pulmonary Veins)',
      'Left Ventricle Contraction (Mitral Valve)',
      'Aorta Systemic Circulation Complete (120 mmHg)',
    ],
  },
  {
    id: 'ohms_law',
    title: "Ohm's Law & DC Circuit",
    category: 'Physics',
    description: 'Potential difference, electron drift, resistance drop, and Kirchhoff loop.',
    steps: [
      'DC Power Source (V = 12V Potential)',
      'Switch Closes (Conducting Loop Formed)',
      'Electron Drift Current (I = V / R)',
      'Load Resistance Drop (R = 4 Ω, Heat P=I²R)',
      'Kirchhoff Loop Verification (ΣV = 0)',
      'Power Delivery Complete (36 Watts Output)',
    ],
  },
  {
    id: 'ml_lifecycle',
    title: 'Machine Learning & AI Lifecycle',
    category: 'Computer Science',
    description: 'Data ingestion, tokenization, transformer attention, and edge deployment.',
    steps: [
      'Multimodal Data Ingestion & ETL (80/10/10)',
      'Tokenization & Latent Vector Embeddings',
      'Transformer Attention Training (AdamW SGD)',
      'Loss Convergence & Backpropagation',
      'RLHF Alignment & Evaluation Benchmark',
      'Low-Latency Edge Model Deployment (~200ms)',
    ],
  },
  {
    id: 'independence',
    title: 'Indian Freedom Movement Milestones',
    category: 'History',
    description: 'Chronological timeline of India’s heroic struggle for sovereignty.',
    steps: [
      '1857: First War of Independence (Sepoy Mutiny)',
      '1920: Non-Cooperation Movement (Swadeshi Boycott)',
      '1930: Dandi Salt Satyagraha (240-mile March)',
      '1942: Quit India Movement ("Do or Die")',
      '15 Aug 1947: Sovereign Independence Dawn',
      'AGNI Legacy: "Made in India, To Serve the World"',
    ],
  },
];

export const AgniCanvas: React.FC<AgniCanvasProps> = ({
  initialTopic,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESETS[0].id);
  const [activeTopic, setActiveTopic] = useState<string>(initialTopic || PRESETS[0].title);
  const [activeSteps, setActiveSteps] = useState<string[]>(PRESETS[0].steps);
  const [activeCategory, setActiveCategory] = useState<string>(PRESETS[0].category);
  const [currentStep, setCurrentStep] = useState<number>(6);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set());
  const [isAutoDrawing, setIsAutoDrawing] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Switch preset
  const handleSelectPreset = (preset: DiagramPreset) => {
    setSelectedPresetId(preset.id);
    setActiveTopic(preset.title);
    setActiveSteps(preset.steps);
    setActiveCategory(preset.category);
    setCurrentStep(preset.steps.length);
    setIsAutoDrawing(false);
    setRevealedSteps(new Set());
  };

  // Auto Draw playback loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoDrawing) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= activeSteps.length) {
            setIsAutoDrawing(false);
            return activeSteps.length;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isAutoDrawing, activeSteps]);

  // Practice mode toggle step reveal
  const toggleStepReveal = (stepIdx: number) => {
    if (!isPracticeMode) return;
    setRevealedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIdx)) {
        next.delete(stepIdx);
      } else {
        next.add(stepIdx);
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // CANVAS DRAWING ENGINE
  // -------------------------------------------------------------
  const drawDiagram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    const w = parent ? Math.max(800, parent.clientWidth) : 1000;
    const h = 640;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Apply Zoom
    ctx.translate((w * (1 - zoom)) / 2, (h * (1 - zoom)) / 2);
    ctx.scale(zoom, zoom);

    // Title banner on canvas
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`🔥 AGNI Interactive Canvas: ${activeTopic}`, 40, 42);

    ctx.fillStyle = '#737373';
    ctx.font = '12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`Category: ${activeCategory} • Showing Step 1 to ${currentStep} of ${activeSteps.length}`, 40, 64);

    // Specific diagram rendering
    const topicLower = activeTopic.toLowerCase();

    if (topicLower.includes('photosynthesis')) {
      renderPhotosynthesis(ctx, w, h, currentStep, isPracticeMode, revealedSteps);
    } else if (topicLower.includes('heart')) {
      renderHeart(ctx, w, h, currentStep, isPracticeMode, revealedSteps);
    } else if (topicLower.includes('ohm') || topicLower.includes('circuit')) {
      renderOhmsLaw(ctx, w, h, currentStep, isPracticeMode, revealedSteps);
    } else if (topicLower.includes('machine learning') || topicLower.includes('ai')) {
      renderMachineLearning(ctx, w, h, currentStep, isPracticeMode, revealedSteps);
    } else if (topicLower.includes('indian') || topicLower.includes('freedom') || topicLower.includes('independence')) {
      renderIndianMovement(ctx, w, h, currentStep, isPracticeMode, revealedSteps);
    } else {
      renderGenericFlow(ctx, w, h, activeTopic, activeSteps, currentStep, isPracticeMode, revealedSteps);
    }

    ctx.restore();
  }, [activeTopic, activeCategory, activeSteps, currentStep, isPracticeMode, revealedSteps, zoom]);

  useEffect(() => {
    drawDiagram();
    window.addEventListener('resize', drawDiagram);
    return () => window.removeEventListener('resize', drawDiagram);
  }, [drawDiagram]);

  // -------------------------------------------------------------
  // SPECIFIC DIAGRAM ARTWORK FUNCTIONS
  // -------------------------------------------------------------

  function drawNodeBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    bw: number,
    bh: number,
    title: string,
    subtitle: string,
    stepNum: number,
    visible: boolean,
    borderColor: string,
    practice: boolean,
    revealed: boolean
  ) {
    if (!visible) return;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    // Box background
    ctx.fillStyle = '#171717';
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, 10);
    ctx.fill();

    // Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Step tag
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.roundRect(x + 10, y - 10, 60, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`STEP ${stepNum}`, x + 40, y + 4);
    ctx.textAlign = 'left';

    // Text inside box
    if (practice && !revealed) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('❓ Tap to Reveal Step', x + 18, y + 36);
      ctx.fillStyle = '#a3a3a3';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('Active Recall Practice Mode', x + 18, y + 54);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(title, x + 18, y + 32);

      ctx.fillStyle = '#d4d4d4';
      ctx.font = '11px system-ui, sans-serif';
      // Word wrap subtitle
      const words = subtitle.split(' ');
      let line = '';
      let lineY = y + 50;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > bw - 30 && n > 0) {
          ctx.fillText(line, x + 18, lineY);
          line = words[n] + ' ';
          lineY += 15;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x + 18, lineY);
    }
  }

  function drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    label?: string,
    color = '#f97316'
  ) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Label
    if (label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2 - 8;
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, midX, midY);
      ctx.textAlign = 'left';
    }
  }

  // 1. Photosynthesis Renderer
  function renderPhotosynthesis(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    step: number,
    practice: boolean,
    revealed: Set<number>
  ) {
    // Step 1: Sunlight
    drawNodeBox(
      ctx,
      60,
      120,
      210,
      76,
      '☀️ Sunlight Absorption',
      'Photons absorbed by Chlorophyll a/b pigments (P680).',
      1,
      step >= 1,
      '#f59e0b',
      practice,
      revealed.has(1)
    );

    // Step 2: Water Photolysis
    drawNodeBox(
      ctx,
      60,
      260,
      210,
      76,
      '💧 Water Photolysis',
      'H₂O splits into protons (H⁺), electrons (e⁻), and O₂ gas.',
      2,
      step >= 2,
      '#06b6d4',
      practice,
      revealed.has(2)
    );

    // Step 3: Thylakoid Light Reaction
    drawNodeBox(
      ctx,
      330,
      180,
      230,
      86,
      '⚡ Light Reactions (Thylakoid)',
      'Electron transport chain synthesizes ATP + NADPH via ATP Synthase.',
      3,
      step >= 3,
      '#10b981',
      practice,
      revealed.has(3)
    );

    // Step 4: Atmospheric CO2
    drawNodeBox(
      ctx,
      620,
      120,
      220,
      76,
      '🍃 Atmospheric CO₂ Intake',
      'Carbon dioxide enters leaf stomata for carboxylation.',
      4,
      step >= 4,
      '#8b5cf6',
      practice,
      revealed.has(4)
    );

    // Step 5: Calvin Cycle (Circular Hub)
    drawNodeBox(
      ctx,
      620,
      260,
      230,
      90,
      '🔄 Calvin Cycle (Stroma)',
      'RuBisCO fixes CO₂ with RuBP. NADPH/ATP reduce it to G3P triose.',
      5,
      step >= 5,
      '#ec4899',
      practice,
      revealed.has(5)
    );

    // Step 6: Glucose
    drawNodeBox(
      ctx,
      440,
      420,
      250,
      80,
      '🍞 Glucose Synthesis (C₆H₁₂O₆)',
      'Hexose sugar stored as starch to nourish entire biosphere!',
      6,
      step >= 6,
      '#f97316',
      practice,
      revealed.has(6)
    );

    // Connectors
    if (step >= 3) {
      drawArrow(ctx, 270, 158, 330, 210, 'photons', '#f59e0b');
      drawArrow(ctx, 270, 298, 330, 235, 'e⁻ + H⁺', '#06b6d4');
    }
    if (step >= 5) {
      drawArrow(ctx, 560, 223, 620, 285, 'ATP + NADPH', '#10b981');
      drawArrow(ctx, 730, 196, 730, 260, 'CO₂ input', '#8b5cf6');
    }
    if (step >= 6) {
      drawArrow(ctx, 670, 350, 600, 420, 'G3P Output', '#ec4899');
    }

    // Equation Banner
    if (step >= 4) {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(140, 540, w - 280, 46, 8);
      ctx.fill();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 14px "Plus Jakarta Sans", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHEMICAL EQUATION: 6CO₂ + 6H₂O + Sunlight ──► C₆H₁₂O₆ + 6O₂ ↑', w / 2, 568);
      ctx.textAlign = 'left';
    }
  }

  // 2. Human Heart Double Circulation
  function renderHeart(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    step: number,
    practice: boolean,
    revealed: Set<number>
  ) {
    drawNodeBox(ctx, 60, 220, 220, 80, '1. Body Systemic Tissues', 'Deoxygenated blood enters vena cava.', 1, step >= 1, '#3b82f6', practice, revealed.has(1));
    drawNodeBox(ctx, 320, 110, 220, 80, '2. Right Atrium & Ventricle', 'Tricuspid valve opens, blood pumped to lungs.', 2, step >= 2, '#2563eb', practice, revealed.has(2));
    drawNodeBox(ctx, 600, 110, 220, 80, '3. Pulmonary Lungs', 'CO₂ released, Hemoglobin binds fresh O₂.', 3, step >= 3, '#06b6d4', practice, revealed.has(3));
    drawNodeBox(ctx, 600, 290, 220, 80, '4. Left Atrium & Ventricle', 'Bicuspid (mitral) valve opens to high pressure LV.', 4, step >= 4, '#ef4444', practice, revealed.has(4));
    drawNodeBox(ctx, 320, 370, 220, 80, '5. Aorta & Main Arteries', 'Powerful systolic stroke at 120 mmHg.', 5, step >= 5, '#dc2626', practice, revealed.has(5));
    drawNodeBox(ctx, 60, 370, 220, 80, '6. Double Circulation Loop', 'Complete systemic and pulmonary oxygen delivery.', 6, step >= 6, '#f97316', practice, revealed.has(6));

    if (step >= 2) drawArrow(ctx, 280, 250, 320, 160, 'Vena Cava', '#3b82f6');
    if (step >= 3) drawArrow(ctx, 540, 150, 600, 150, 'Pulmonary Art', '#06b6d4');
    if (step >= 4) drawArrow(ctx, 710, 190, 710, 290, 'Pulmonary Vein (O₂)', '#ef4444');
    if (step >= 5) drawArrow(ctx, 600, 335, 540, 395, 'Aortic Valve', '#dc2626');
    if (step >= 6) drawArrow(ctx, 320, 410, 280, 410, 'Capillary Exchange', '#f97316');

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(140, 540, w - 280, 46, 8);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PATHWAY: Tissues ──► RA/RV ──► Lungs (O₂) ──► LA/LV ──► Aorta ──► Body', w / 2, 568);
    ctx.textAlign = 'left';
  }

  // 3. Ohm's Law Renderer
  function renderOhmsLaw(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    step: number,
    practice: boolean,
    revealed: Set<number>
  ) {
    drawNodeBox(ctx, 80, 180, 210, 80, '1. DC Voltage Source', 'Chemical potential establishes 12V EMF.', 1, step >= 1, '#f59e0b', practice, revealed.has(1));
    drawNodeBox(ctx, 330, 100, 210, 80, '2. Closed Switch (S1)', 'Conducting path allows valence electron drift.', 2, step >= 2, '#10b981', practice, revealed.has(2));
    drawNodeBox(ctx, 580, 180, 220, 80, '3. Load Resistor (R = 4 Ω)', 'Current I = V / R = 12 / 4 = 3 Amperes.', 3, step >= 3, '#f97316', practice, revealed.has(3));
    drawNodeBox(ctx, 580, 330, 220, 80, '4. Heat Dissipation (P = I²R)', 'Electrical energy transforms: 3² × 4 = 36 W.', 4, step >= 4, '#ef4444', practice, revealed.has(4));
    drawNodeBox(ctx, 330, 330, 210, 80, '5. Common Ground (0V Reference)', 'Kirchhoff Voltage Law: Loop sum ΣV = 0.', 5, step >= 5, '#64748b', practice, revealed.has(5));
    drawNodeBox(ctx, 80, 330, 210, 80, '6. Steady-State Loop', 'Continuous DC current circulation maintained.', 6, step >= 6, '#38bdf8', practice, revealed.has(6));

    if (step >= 2) drawArrow(ctx, 230, 180, 330, 140, 'EMF (+)', '#f59e0b');
    if (step >= 3) drawArrow(ctx, 540, 140, 580, 200, 'I = 3 A', '#10b981');
    if (step >= 4) drawArrow(ctx, 690, 260, 690, 330, 'Voltage Drop -12V', '#ef4444');
    if (step >= 5) drawArrow(ctx, 580, 370, 540, 370, 'Return', '#64748b');
    if (step >= 6) drawArrow(ctx, 330, 370, 290, 370, 'Loop Closed', '#38bdf8');

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(140, 530, w - 280, 46, 8);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px "Plus Jakarta Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("OHM'S LAW: V = I × R   •   I = V / R = 12V / 4Ω = 3A   •   Power P = V × I = 36W", w / 2, 558);
    ctx.textAlign = 'left';
  }

  // 4. Machine Learning Lifecycle Renderer
  function renderMachineLearning(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    step: number,
    practice: boolean,
    revealed: Set<number>
  ) {
    drawNodeBox(ctx, 60, 140, 220, 80, '1. Data Pipeline & ETL', 'Raw multimodal dataset cleaned & split 80/10/10.', 1, step >= 1, '#3b82f6', practice, revealed.has(1));
    drawNodeBox(ctx, 320, 140, 220, 80, '2. Vector Embeddings', 'High-dimensional semantic vector projections.', 2, step >= 2, '#8b5cf6', practice, revealed.has(2));
    drawNodeBox(ctx, 580, 140, 220, 80, '3. Attention Training', 'Self-attention matrices with AdamW optimizer.', 3, step >= 3, '#ec4899', practice, revealed.has(3));
    drawNodeBox(ctx, 580, 310, 220, 80, '4. Loss Convergence', 'Cross-entropy loss optimized via backprop.', 4, step >= 4, '#f59e0b', practice, revealed.has(4));
    drawNodeBox(ctx, 320, 310, 220, 80, '5. RLHF & Alignment', 'Benchmarked against helpfulness & safety.', 5, step >= 5, '#10b981', practice, revealed.has(5));
    drawNodeBox(ctx, 60, 310, 220, 80, '6. Low-Latency Deployment', 'Quantized edge inference deployed globally.', 6, step >= 6, '#f97316', practice, revealed.has(6));

    if (step >= 2) drawArrow(ctx, 280, 180, 320, 180, 'Tokens', '#8b5cf6');
    if (step >= 3) drawArrow(ctx, 540, 180, 580, 180, 'Tensors', '#ec4899');
    if (step >= 4) drawArrow(ctx, 690, 220, 690, 310, 'SGD Steps', '#f59e0b');
    if (step >= 5) drawArrow(ctx, 580, 350, 540, 350, 'Checkpoint', '#10b981');
    if (step >= 6) drawArrow(ctx, 320, 350, 280, 350, 'Edge Push', '#f97316');

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(140, 520, w - 280, 46, 8);
    ctx.fill();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PIPELINE: Ingestion ──► Tokenizer ──► Transformers ──► SGD Loss ──► RLHF ──► Production', w / 2, 548);
    ctx.textAlign = 'left';
  }

  // 5. Indian Freedom Movement Renderer
  function renderIndianMovement(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    step: number,
    practice: boolean,
    revealed: Set<number>
  ) {
    drawNodeBox(ctx, 60, 120, 220, 80, '1857: Sepoy Mutiny', 'First War of Indian Independence against Company rule.', 1, step >= 1, '#ef4444', practice, revealed.has(1));
    drawNodeBox(ctx, 320, 120, 220, 80, '1920: Non-Cooperation', 'Mahatma Gandhi leads peaceful boycott of foreign goods.', 2, step >= 2, '#f59e0b', practice, revealed.has(2));
    drawNodeBox(ctx, 580, 120, 220, 80, '1930: Dandi Salt March', '240-mile march shattering salt monopoly tax law.', 3, step >= 3, '#10b981', practice, revealed.has(3));
    drawNodeBox(ctx, 580, 290, 220, 80, '1942: Quit India Movement', 'Historic "Do or Die" call united millions for freedom.', 4, step >= 4, '#3b82f6', practice, revealed.has(4));
    drawNodeBox(ctx, 320, 290, 220, 80, '15 Aug 1947: Independence', 'Sovereign dawn: "Tryst with Destiny" fulfilled.', 5, step >= 5, '#f97316', practice, revealed.has(5));
    drawNodeBox(ctx, 60, 290, 220, 80, 'Project AGNI Vision', '"Made in India, To Serve the World" by Founders M. Sanjay & T. Hasini.', 6, step >= 6, '#22c55e', practice, revealed.has(6));

    if (step >= 2) drawArrow(ctx, 280, 160, 320, 160, 'Nationalism', '#f59e0b');
    if (step >= 3) drawArrow(ctx, 540, 160, 580, 160, 'Satyagraha', '#10b981');
    if (step >= 4) drawArrow(ctx, 690, 200, 690, 290, 'Resolute Push', '#3b82f6');
    if (step >= 5) drawArrow(ctx, 580, 330, 540, 330, 'Sovereignty', '#f97316');
    if (step >= 6) drawArrow(ctx, 320, 330, 280, 330, 'Future Legacy', '#22c55e');

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(140, 510, w - 280, 46, 8);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIMELINE: 1857 ──► 1920 (Non-Coop) ──► 1930 (Dandi) ──► 1942 (Quit India) ──► 1947 🇮🇳', w / 2, 538);
    ctx.textAlign = 'left';
  }

  // 6. Generic Flowchart for AI Generated Prompts
  function renderGenericFlow(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    title: string,
    steps: string[],
    step: number,
    practice: boolean,
    revealed: Set<number>
  ) {
    const cols = 3;
    const boxW = 220;
    const boxH = 80;
    const startX = 60;
    const startY = 140;
    const gapX = 40;
    const gapY = 80;

    steps.forEach((stepText, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = startX + col * (boxW + gapX);
      const y = startY + row * (boxH + gapY);
      const stepNum = idx + 1;
      const isVisible = step >= stepNum;

      drawNodeBox(
        ctx,
        x,
        y,
        boxW,
        boxH,
        `Step ${stepNum}`,
        stepText,
        stepNum,
        isVisible,
        '#f97316',
        practice,
        revealed.has(stepNum)
      );

      // Connecting arrow to next node
      if (idx < steps.length - 1 && step > stepNum) {
        const nextRow = Math.floor((idx + 1) / cols);
        const nextCol = (idx + 1) % cols;
        const nextX = startX + nextCol * (boxW + gapX);
        const nextY = startY + nextRow * (boxH + gapY);

        if (row === nextRow) {
          drawArrow(ctx, x + boxW, y + boxH / 2, nextX, nextY + boxH / 2, '', '#f97316');
        } else {
          drawArrow(ctx, x + boxW / 2, y + boxH, nextX + boxW / 2, nextY, '', '#f97316');
        }
      }
    });

    // Summary banner
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.roundRect(140, 530, w - 280, 46, 8);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`AI VISUAL FLOW: ${title.toUpperCase()} (Total ${steps.length} Steps)`, w / 2, 558);
    ctx.textAlign = 'left';
  }

  // -------------------------------------------------------------
  // CONTROLS & ACTIONS
  // -------------------------------------------------------------

  // Download diagram as PNG image
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `AGNI-Diagram-${activeTopic.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // AI Generation
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const data = await apiFetch<{ text?: string; reply?: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `Generate exactly 6 chronological step titles for this topic: "${customPrompt}". Return ONLY a JSON array of 6 strings, e.g. ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6"]. Nothing else.`,
        }),
      });

      const responseText = data.text || data.reply || '';
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveTopic(customPrompt);
          setActiveSteps(parsed.slice(0, 6));
          setActiveCategory('AI Custom');
          setCurrentStep(parsed.length);
          setSelectedPresetId('custom');
          setCustomPrompt('');
        }
      } else {
        // Fallback default 6 steps
        setActiveTopic(customPrompt);
        setActiveSteps([
          `1. Input: Initial conditions for ${customPrompt}`,
          `2. Processing: Core mechanism & transformation`,
          `3. Reaction: Key interaction & energy exchange`,
          `4. Convergence: System stabilization & regulation`,
          `5. Output: Primary result & byproduct synthesis`,
          `6. Conclusion: Equilibrium & real-world impact`,
        ]);
        setActiveCategory('AI Custom');
        setCurrentStep(6);
        setSelectedPresetId('custom');
        setCustomPrompt('');
      }
    } catch {
      // Fallback
      setActiveTopic(customPrompt);
      setActiveSteps([
        `1. Initiation of ${customPrompt}`,
        `2. Elementary reactions & step-by-step progress`,
        `3. Intermediate state formation`,
        `4. Energy barrier traversal`,
        `5. Product synthesis`,
        `6. System cycle completion`,
      ]);
      setActiveCategory('AI Custom');
      setCurrentStep(6);
      setSelectedPresetId('custom');
      setCustomPrompt('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="agni-canvas-root"
      className="flex flex-col h-full min-h-[720px] w-full bg-[#0a0a0a] text-neutral-100 select-none rounded-2xl border border-orange-500/30 shadow-2xl overflow-hidden"
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 bg-neutral-900/95 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-100">AGNI Canvas & Whiteboard</h2>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                Interactive Visual Engine
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Live step-by-step educational diagram drawer • Self-test practice mode
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Practice Mode */}
          <button
            id="canvas-practice-toggle"
            type="button"
            onClick={() => setIsPracticeMode(!isPracticeMode)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isPracticeMode
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                : 'border border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white'
            }`}
            title="Practice Mode: Hides step labels so you can test your memory!"
          >
            {isPracticeMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{isPracticeMode ? 'Practice Mode: ON' : 'Practice Mode'}</span>
          </button>

          {/* Auto Draw Play / Pause */}
          <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
            <button
              id="canvas-play-steps-btn"
              type="button"
              onClick={() => {
                if (currentStep >= activeSteps.length) {
                  setCurrentStep(1);
                  setIsAutoDrawing(true);
                } else {
                  setIsAutoDrawing(!isAutoDrawing);
                }
              }}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
            >
              {isAutoDrawing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isAutoDrawing ? 'Pause' : 'Auto Draw'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep <= 1}
              className="px-1.5 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Previous Step"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(activeSteps.length, s + 1))}
              disabled={currentStep >= activeSteps.length}
              className="px-1.5 py-1 text-xs text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Next Step"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentStep(activeSteps.length);
                setIsAutoDrawing(false);
              }}
              className="px-1.5 py-1 text-xs text-neutral-400 hover:text-white cursor-pointer"
              title="Show All Steps"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-neutral-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.15))}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              title="Reset 100%"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>

          {/* Download Button */}
          <button
            id="canvas-download-png-btn"
            type="button"
            onClick={handleDownloadPNG}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 cursor-pointer"
            title="Download Diagram as PNG"
          >
            <Download className="h-3.5 w-3.5 text-orange-400" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* 2. Preset Selector & AI Prompt Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 bg-neutral-900/60 px-4 py-2">
        {/* Preset Topic Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Layers className="h-3 w-3 text-orange-400" />
            Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedPresetId === preset.id
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* AI Diagram Input */}
        <form onSubmit={handleGenerateAI} className="flex items-center gap-1.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ask AGNI to draw anything (e.g. Krebs cycle, Water cycle, Newton's laws)..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/90 py-1 pl-3 pr-8 text-xs text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
            />
            {isGenerating && (
              <RefreshCw className="absolute right-2.5 top-1.5 h-3.5 w-3.5 text-orange-400 animate-spin" />
            )}
          </div>
          <button
            type="submit"
            disabled={isGenerating || !customPrompt.trim()}
            className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-orange-500 disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Sparkles className="h-3 w-3" />
            <span>Draw AI</span>
          </button>
        </form>
      </div>

      {/* 3. Main Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[600px] w-full bg-[#0a0a0a] flex items-center justify-center p-2 overflow-auto"
      >
        <canvas
          ref={canvasRef}
          onClick={(e) => {
            if (!isPracticeMode) return;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const clickY = e.clientY - rect.top;
            // Approximate step index from click height
            const stepIndex = Math.min(6, Math.max(1, Math.ceil((clickY / 600) * 6)));
            toggleStepReveal(stepIndex);
          }}
          className="block rounded-xl border border-neutral-800 shadow-xl max-w-full bg-[#0a0a0a]"
        />

        {/* Practice Mode Helper Tag */}
        {isPracticeMode && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-neutral-900/95 px-3 py-2 text-xs text-amber-300 shadow-xl backdrop-blur-md animate-pulse">
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
            <div>
              <p className="font-bold">Practice Mode Active</p>
              <p className="text-[11px] text-neutral-300">
                Labels hidden. Tap on the canvas nodes to test your recall!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Step Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80 bg-neutral-900/90 px-4 py-2 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-300">Topic: {activeTopic}</span>
          <span>•</span>
          <span className="text-[11px] text-orange-400">Category: {activeCategory}</span>
          <span>•</span>
          <span className="text-[11px]">
            Showing {currentStep} of {activeSteps.length} steps
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeSteps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx + 1)}
              className={`h-2.5 w-6 rounded-full transition-all cursor-pointer ${
                currentStep >= idx + 1
                  ? 'bg-orange-500 shadow-sm shadow-orange-500/50'
                  : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
              title={`Jump to Step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
