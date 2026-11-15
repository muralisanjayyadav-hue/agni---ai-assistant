import React, { useEffect, useRef } from 'react';

interface VoiceWaveChartProps {
  voiceState: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioStream?: MediaStream | null;
  className?: string;
}

export const VoiceWaveChart: React.FC<VoiceWaveChartProps> = ({
  voiceState,
  audioStream,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // Attempt to set up Web Audio API analyser when audioStream is active
    if (audioStream && voiceState === 'listening') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;

          const source = ctx.createMediaStreamSource(audioStream);
          source.connect(analyser);

          audioContextRef.current = ctx;
          analyserRef.current = analyser;
          sourceRef.current = source;
        }
      } catch (err) {
        console.warn('Web Audio stream analyser initialization skipped:', err);
      }
    }

    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {}
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [audioStream, voiceState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 32;
      const barWidth = Math.max(3, (width / numBars) - 3);
      const centerY = height / 2;

      let freqData: Uint8Array | null = null;
      if (analyserRef.current && voiceState === 'listening') {
        freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
      }

      phase += 0.08;

      // Draw dynamic visual audio frequency bars
      for (let i = 0; i < numBars; i++) {
        let barHeight = 6; // baseline idle height

        if (freqData && freqData.length > 0) {
          const dataIdx = Math.floor((i / numBars) * freqData.length);
          const rawVal = freqData[dataIdx] || 0;
          barHeight = Math.max(6, (rawVal / 255) * (height * 0.85));
        } else if (voiceState === 'listening') {
          // Dynamic simulated acoustic ripple when listening
          const wave = Math.sin(phase + i * 0.4) * 0.5 + 0.5;
          barHeight = 12 + wave * (height * 0.55);
        } else if (voiceState === 'speaking') {
          // Harmonic speech resonance oscillation
          const harmonic = Math.sin(phase * 1.5 + i * 0.3) * Math.cos(phase * 0.8 + i * 0.2);
          barHeight = 10 + Math.abs(harmonic) * (height * 0.75);
        } else if (voiceState === 'thinking') {
          // Subtle rhythmic ripple
          const ripple = Math.sin(phase * 2 + i * 0.5);
          barHeight = 8 + Math.abs(ripple) * (height * 0.35);
        } else {
          // Calm breathing idle curve
          const breath = Math.sin(phase * 0.5 + i * 0.2) * 4;
          barHeight = Math.max(4, 6 + breath);
        }

        const x = i * (barWidth + 3) + 4;
        const y = centerY - barHeight / 2;

        // Gradient color based on state
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (voiceState === 'listening') {
          gradient.addColorStop(0, '#10b981'); // Emerald top
          gradient.addColorStop(1, '#059669'); // Emerald bottom
        } else if (voiceState === 'speaking') {
          gradient.addColorStop(0, '#f97316'); // Orange top
          gradient.addColorStop(0.5, '#ef4444'); // Red mid
          gradient.addColorStop(1, '#f59e0b'); // Amber bottom
        } else if (voiceState === 'thinking') {
          gradient.addColorStop(0, '#fbbf24'); // Amber top
          gradient.addColorStop(1, '#d97706'); // Amber bottom
        } else {
          gradient.addColorStop(0, '#f97316'); // Calm orange
          gradient.addColorStop(1, '#9a3412');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 4);
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      // Draw subtle connecting central sound wave line
      ctx.beginPath();
      ctx.strokeStyle =
        voiceState === 'listening'
          ? 'rgba(16, 185, 129, 0.4)'
          : voiceState === 'speaking'
          ? 'rgba(249, 115, 22, 0.4)'
          : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;

      for (let x = 0; x < width; x += 4) {
        const amp =
          voiceState === 'listening' ? 14 : voiceState === 'speaking' ? 20 : voiceState === 'thinking' ? 8 : 3;
        const y = centerY + Math.sin((x * 0.05) + phase) * amp * Math.cos(phase * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [voiceState]);

  return (
    <div className={`relative flex flex-col items-center justify-center w-full ${className}`}>
      <canvas
        ref={canvasRef}
        width={340}
        height={70}
        className="w-full max-w-[340px] h-[70px] rounded-xl"
      />
      <div className="mt-1 flex items-center justify-between w-full max-w-[340px] px-2 text-[10px] text-neutral-400">
        <span className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              voiceState === 'listening'
                ? 'bg-emerald-400 animate-ping'
                : voiceState === 'speaking'
                ? 'bg-orange-400 animate-pulse'
                : 'bg-neutral-500'
            }`}
          />
          {voiceState === 'listening'
            ? 'Live Audio Input (Mic Active)'
            : voiceState === 'speaking'
            ? 'Voice Harmonic Frequency'
            : voiceState === 'thinking'
            ? 'Neural Processing'
            : 'Voice Standby'}
        </span>
        <span className="font-mono text-neutral-400">
          {voiceState === 'listening' ? '44.1 kHz • Active' : voiceState === 'speaking' ? 'Realistic TTS' : 'Ready'}
        </span>
      </div>
    </div>
  );
};
