import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  Trash2,
  BookOpen,
  Binary,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Crosshair,
  AlertTriangle,
  Play,
  StopCircle,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { apiFetch } from '../utils/api';
import { VisionAROverlay } from '../types';
import { speakText, stopSpeaking } from '../utils/speech';

// Curated interactive educational samples with realistic errors/diagrams
const SAMPLE_PROBLEMS = [
  {
    title: 'Handwritten Polynomial Error',
    category: 'Math',
    mode: 'math',
    prompt: 'Analyze this handwritten algebraic equation. Check line-by-line for sign or arithmetic errors and highlight the exact mistake.',
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    mockOverlays: [
      {
        id: 'ov-1',
        x: 18,
        y: 28,
        width: 64,
        height: 18,
        label: 'Line 2: Sign Error (-3x)',
        type: 'error' as const,
        detail: 'Mistake: moving -3x across equals sign should become +3x.',
      },
      {
        id: 'ov-2',
        x: 22,
        y: 62,
        width: 56,
        height: 16,
        label: 'Correct Root: x = 4',
        type: 'solution' as const,
        detail: 'After correcting line 2, factoring yields (x - 4)(x + 1) = 0.',
      },
    ],
  },
  {
    title: 'Circuit Schematic & Ohm\'s Law',
    category: 'Physics',
    mode: 'circuit',
    prompt: 'Trace the circuit components. Calculate total equivalent resistance and branch currents using Ohm’s law.',
    url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&auto=format&fit=crop&q=80',
    mockOverlays: [
      {
        id: 'ov-c1',
        x: 15,
        y: 20,
        width: 35,
        height: 20,
        label: 'DC Power Source (12V)',
        type: 'component' as const,
        detail: 'Primary DC Voltage potential V = 12 Volts.',
      },
      {
        id: 'ov-c2',
        x: 52,
        y: 35,
        width: 40,
        height: 25,
        label: 'Resistors in Parallel (R1=6Ω, R2=3Ω)',
        type: 'formula' as const,
        detail: 'Equivalent R_eq = (6×3)/(6+3) = 2 Ω. Total current I = 12/2 = 6 Amps.',
      },
    ],
  },
  {
    title: 'Photosynthesis Cellular Diagram',
    category: 'Biology',
    mode: 'diagram',
    prompt: 'Identify the organelle structures and trace the light reactions versus Calvin cycle flow.',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
    mockOverlays: [
      {
        id: 'ov-b1',
        x: 25,
        y: 22,
        width: 50,
        height: 22,
        label: 'Thylakoid Grana (Light Rxn)',
        detail: 'Photolysis of H2O releases O2 and generates ATP + NADPH.',
        type: 'step' as const,
      },
      {
        id: 'ov-b2',
        x: 40,
        y: 58,
        width: 48,
        height: 22,
        label: 'Stroma Matrix (Calvin Cycle)',
        detail: 'RuBisCO fixes CO2 to synthesize glucose hexose sugars.',
        type: 'solution' as const,
      },
    ],
  },
];

export const VisionView: React.FC = () => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [prompt, setPrompt] = useState<string>('Inspect this image carefully. Check for math errors, analyze circuit connections, and show step-by-step solution.');
  const [mode, setMode] = useState<'math' | 'circuit' | 'diagram' | 'textbook'>('math');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [summaryHeadline, setSummaryHeadline] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [arOverlays, setArOverlays] = useState<VisionAROverlay[]>([]);
  const [isLiveScanning, setIsLiveScanning] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveScanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, []);

  // Redraw AR overlay on video
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw active target reticle if camera is active
    if (isCameraActive) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(cx - 120, cy - 80, 240, 160);
      ctx.setLineDash([]);
    }

    // Render AR bounding boxes and highlight callouts
    arOverlays.forEach((ov) => {
      const bx = (ov.x / 100) * canvas.width;
      const by = (ov.y / 100) * canvas.height;
      const bw = (ov.width / 100) * canvas.width;
      const bh = (ov.height / 100) * canvas.height;

      // Colors based on type
      let strokeColor = '#f97316'; // orange default
      let fillColor = 'rgba(249, 115, 22, 0.15)';
      let tagBg = '#f97316';

      if (ov.type === 'error') {
        strokeColor = '#ef4444'; // vibrant red for errors
        fillColor = 'rgba(239, 68, 68, 0.25)';
        tagBg = '#ef4444';
      } else if (ov.type === 'solution') {
        strokeColor = '#10b981'; // green for solutions
        fillColor = 'rgba(16, 185, 129, 0.2)';
        tagBg = '#10b981';
      } else if (ov.type === 'component') {
        strokeColor = '#06b6d4'; // cyan
        fillColor = 'rgba(6, 182, 212, 0.2)';
        tagBg = '#06b6d4';
      } else if (ov.type === 'formula') {
        strokeColor = '#f59e0b'; // amber
        fillColor = 'rgba(245, 158, 11, 0.2)';
        tagBg = '#f59e0b';
      }

      // Draw bounding box
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = fillColor;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillRect(bx, by, bw, bh);

      // Corner markers
      const cornerLen = 12;
      ctx.lineWidth = 3.5;
      // top-left
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();
      // top-right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();

      // Tag Label Box above
      ctx.fillStyle = tagBg;
      ctx.fillRect(bx, Math.max(0, by - 24), Math.min(bw + 40, 240), 22);

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(ov.label, bx + 6, Math.max(14, by - 8));
    });
  }, [arOverlays, isCameraActive]);

  // Start Live Camera
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    try {
      setErrorMessage(null);
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setErrorMessage('Could not access camera. Please allow camera permissions in your browser or choose an educational sample.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsLiveScanning(false);
    if (liveScanIntervalRef.current) {
      clearInterval(liveScanIntervalRef.current);
    }
  };

  // Flip Camera between rear & front
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  // Capture frame from live video
  const captureCurrentFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Capture & Solve Immediately
  const handleCaptureAndSolve = async () => {
    let base64 = imageBase64;
    if (isCameraActive && videoRef.current) {
      base64 = captureCurrentFrame();
      if (base64) {
        setImageBase64(base64);
        setImageMime('image/jpeg');
      }
    }

    if (!base64) {
      setErrorMessage('No image or live camera frame available. Please point camera or upload an image.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAnalysisResult(null);

    try {
      const data = await apiFetch<{
        text: string;
        summary?: string;
        overlays?: VisionAROverlay[];
        detectedType?: string;
      }>('/api/vision', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageMime,
          prompt,
          mode,
        }),
      });

      setAnalysisResult(data.text);
      if (data.summary) {
        setSummaryHeadline(data.summary);
      }
      if (data.overlays && data.overlays.length > 0) {
        setArOverlays(data.overlays);
      } else {
        // Generate smart fallback AR overlay based on prompt mode
        setArOverlays([
          {
            id: 'ov-detected',
            x: 20,
            y: 30,
            width: 60,
            height: 20,
            label: mode === 'math' ? 'Equation Analysis & Error Check' : 'Detected Educational Focus',
            type: mode === 'math' ? 'error' : 'solution',
            detail: data.summary || 'Analyzed by AGNI Vision',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      setErrorMessage(err.message || 'Error occurred during vision processing.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Curated Sample
  const loadSampleProblem = async (sample: (typeof SAMPLE_PROBLEMS)[0]) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setMode(sample.mode as any);
      setPrompt(sample.prompt);
      stopCamera();

      const response = await fetch(sample.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultBase64 = reader.result as string;
        setImageBase64(resultBase64);
        setImageMime(blob.type || 'image/jpeg');
        setArOverlays(sample.mockOverlays);
        setSummaryHeadline(sample.title);
        setIsLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error loading sample image:', err);
      setErrorMessage('Failed to load sample educational image.');
      setIsLoading(false);
    }
  };

  // Speak Solution Aloud
  const handleToggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      if (!analysisResult && !summaryHeadline) return;
      const speakContent = summaryHeadline ? `${summaryHeadline}. ${analysisResult}` : analysisResult || '';
      setIsSpeaking(true);
      speakText(speakContent, {
        rate: 0.95,
        pitch: 1.05,
        profile: 'natural-warm',
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="vision-view-root" className="mx-auto max-w-6xl space-y-5 px-3 py-4 sm:px-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-950/40 via-neutral-900 to-neutral-950 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20">
              <Crosshair className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-neutral-100">
                  AGNI Real-Time AR Vision & Camera
                </h1>
                <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-400">
                  Feature 1 Evolution
                </span>
              </div>
              <p className="text-xs text-neutral-300 max-w-xl">
                Point camera at handwritten math, physics diagrams, or circuits. AGNI highlights errors directly as an AR overlay on top of the live feed!
              </p>
            </div>
          </div>

          {/* Quick Camera Action */}
          <div className="flex items-center gap-2">
            {!isCameraActive ? (
              <button
                id="vision-start-camera-btn"
                type="button"
                onClick={() => startCamera()}
                className="flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:bg-orange-500 transition-all cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Start Live Camera</span>
              </button>
            ) : (
              <button
                id="vision-stop-camera-btn"
                type="button"
                onClick={stopCamera}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-900/60 transition-all cursor-pointer"
              >
                <StopCircle className="h-4 w-4" />
                <span>Stop Camera</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout: Camera Viewport + Solution Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Camera & AR Overlay Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
            {/* Viewport Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isCameraActive ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  {isCameraActive ? 'Live Camera Feed (AR Active)' : 'Camera Stage / Image Preview'}
                </span>
              </div>

              {isCameraActive && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-200 hover:text-white cursor-pointer"
                    title="Flip between rear and front camera"
                  >
                    <FlipHorizontal className="h-3.5 w-3.5 text-orange-400" />
                    <span>Flip</span>
                  </button>
                </div>
              )}
            </div>

            {/* Video + AR Canvas Overlay Box */}
            <div className="relative overflow-hidden rounded-xl bg-neutral-950 aspect-[4/3] flex items-center justify-center border border-neutral-800 shadow-inner">
              {/* Live Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />

              {/* Uploaded or Sample Image Display if camera is inactive */}
              {!isCameraActive && imageBase64 && (
                <img
                  src={imageBase64}
                  alt="Captured educational scan"
                  className="h-full w-full object-contain"
                />
              )}

              {/* Placeholder when neither is active */}
              {!isCameraActive && !imageBase64 && (
                <div className="text-center p-6 space-y-2">
                  <Camera className="mx-auto h-12 w-12 text-neutral-600" />
                  <p className="text-xs font-bold text-neutral-400">Camera is currently idle</p>
                  <p className="text-[11px] text-neutral-500 max-w-xs">
                    Click &quot;Start Live Camera&quot; above, upload an image of your study notebook, or choose an interactive sample below.
                  </p>
                </div>
              )}

              {/* AR Canvas Overlay Layer (Rendered on top of video or image) */}
              <canvas
                ref={overlayCanvasRef}
                width={640}
                height={480}
                className="absolute inset-0 pointer-events-none w-full h-full z-10"
              />

              {/* AR Status Pill */}
              {arOverlays.length > 0 && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-neutral-900/90 px-3 py-1 text-[10px] font-bold text-orange-400 backdrop-blur-md shadow-md">
                  <Crosshair className="h-3.5 w-3.5 animate-spin" />
                  <span>{arOverlays.length} AR Markers Active</span>
                </div>
              )}
            </div>

            {/* Camera Actions Bar: Capture & Solve */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                id="vision-capture-solve-btn"
                type="button"
                onClick={handleCaptureAndSolve}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/30 hover:from-orange-500 hover:to-amber-500 transition-all cursor-pointer disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Handwritten Logic & Circuits...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-200" />
                    <span>[Capture & Solve]</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 hover:text-white cursor-pointer"
                title="Upload image from device"
              >
                <Upload className="h-3.5 w-3.5 text-orange-400" />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageMime(file.type || 'image/jpeg');
                  const reader = new FileReader();
                  reader.onload = () => {
                    setImageBase64(reader.result as string);
                    stopCamera();
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </div>

            {/* Mode Switcher */}
            <div className="mt-3 border-t border-neutral-800 pt-3">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Detection Target:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'math', label: 'Math & Errors', icon: Binary },
                  { id: 'circuit', label: 'Circuits & Ohm', icon: Zap },
                  { id: 'diagram', label: 'Science Diagrams', icon: Layers },
                  { id: 'textbook', label: 'Textbook OCR', icon: BookOpen },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id as any)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-semibold transition-colors cursor-pointer ${
                        mode === m.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Curated Interactive Sample Problems */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Try Interactive Study Samples:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PROBLEMS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => loadSampleProblem(sample)}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-left hover:border-orange-500/60 transition-colors cursor-pointer group"
                >
                  <div className="text-[10px] font-bold text-orange-400 uppercase mb-0.5">
                    {sample.category}
                  </div>
                  <div className="text-xs font-bold text-neutral-100 group-hover:text-orange-300 line-clamp-1">
                    {sample.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Solution & AR Callouts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* AR Callouts List */}
          {arOverlays.length > 0 && (
            <div className="rounded-2xl border border-orange-500/40 bg-neutral-900/90 p-4 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-2 flex items-center gap-1.5">
                <Crosshair className="h-4 w-4" />
                <span>Detected AR Overlays & Error Callouts:</span>
              </h3>
              <div className="space-y-2">
                {arOverlays.map((ov) => (
                  <div
                    key={ov.id}
                    className={`rounded-xl border p-3 text-xs ${
                      ov.type === 'error'
                        ? 'border-red-500/50 bg-red-950/20 text-red-200'
                        : ov.type === 'solution'
                        ? 'border-green-500/50 bg-green-950/20 text-green-200'
                        : 'border-orange-500/40 bg-neutral-950 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span>{ov.label}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                        {ov.type}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">{ov.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Derivation & Explanation Deck */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 shadow-lg flex flex-col h-full min-h-[380px]">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Step-by-Step AI Solution</h3>
                {summaryHeadline && (
                  <p className="text-xs font-semibold text-orange-400 mt-0.5">{summaryHeadline}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="vision-speak-solution-btn"
                  type="button"
                  onClick={handleToggleSpeak}
                  disabled={!analysisResult}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer disabled:opacity-30 ${
                    isSpeaking ? 'bg-orange-600 text-white' : ''
                  }`}
                  title="Speak explanation aloud"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!analysisResult}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer disabled:opacity-30"
                  title="Copy Solution"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-3 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Result Content */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-neutral-200">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <RefreshCw className="h-8 w-8 text-orange-500 animate-spin" />
                  <p className="text-xs text-neutral-400">
                    Inspecting handwritten symbols and deriving mathematical steps...
                  </p>
                </div>
              ) : analysisResult ? (
                <div className="markdown-body">
                  <MarkdownView content={analysisResult} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-500 space-y-2">
                  <Sparkles className="h-8 w-8 text-neutral-600" />
                  <p className="text-xs">
                    Start live camera or select a sample problem, then tap <strong className="text-orange-400">[Capture & Solve]</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
