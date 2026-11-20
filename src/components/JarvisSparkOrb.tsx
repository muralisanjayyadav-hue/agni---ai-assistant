import React, { useEffect, useRef } from 'react';

export interface JarvisSparkOrbProps {
  isListening: boolean;
  isSpeaking?: boolean;
  isThinking?: boolean;
  onClick?: () => void;
  size?: number;
  className?: string;
}

interface Particle {
  baseX: number;
  baseY: number;
  baseZ: number;
  color: string;
  size: number;
  alpha: number;
  sparkleSpeed: number;
  sparkleOffset: number;
}

const COLORS = ['#FF6A00', '#FF8C00', '#FFD700'];

export const JarvisSparkOrb: React.FC<JarvisSparkOrbProps> = ({
  isListening,
  isSpeaking = false,
  isThinking = false,
  onClick,
  size = 280,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Animated scale and glow values for smooth interpolation
  const currentScaleRef = useRef<number>(1.0);
  const currentGlowRef = useRef<number>(1.0);
  const rotYRef = useRef<number>(0);
  const rotXRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const width = size;
    const height = size;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const cx = width / 2;
    const cy = height / 2;
    const baseRadius = size * 0.33;

    // Generate 3D sphere particles using Fibonacci sphere distribution
    const PARTICLE_COUNT = 380;
    const particles: Particle[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio angle

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Distribute colors: #FF6A00 (Iron Man Orange), #FF8C00 (Amber), #FFD700 (Gold Spark)
      const color = COLORS[i % COLORS.length];
      const pSize = 1.3 + Math.random() * 1.6;

      particles.push({
        baseX: x * baseRadius,
        baseY: y * baseRadius,
        baseZ: z * baseRadius,
        color,
        size: pSize,
        alpha: 0.4 + Math.random() * 0.6,
        sparkleSpeed: 0.02 + Math.random() * 0.04,
        sparkleOffset: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.03;

      // Smoothly interpolate scale: 1.18x when listening, 1.08x when speaking, 1.0x idle
      const targetScale = isListening ? 1.18 : isSpeaking ? 1.08 : 1.0;
      currentScaleRef.current += (targetScale - currentScaleRef.current) * 0.09;

      // Smoothly interpolate glow: boosted when listening or speaking
      const targetGlow = isListening ? 1.8 : isSpeaking ? 1.4 : isThinking ? 1.3 : 1.0;
      currentGlowRef.current += (targetGlow - currentGlowRef.current) * 0.09;

      // Rotation speed increases when listening or thinking
      const speedY = isListening ? 0.016 : isThinking ? 0.024 : 0.009;
      const speedX = isListening ? 0.009 : isThinking ? 0.012 : 0.005;
      rotYRef.current += speedY;
      rotXRef.current += speedX;

      const rotY = rotYRef.current;
      const rotX = rotXRef.current;
      const scale = currentScaleRef.current;
      const glow = currentGlowRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // ── 1. Central Core Radial Energy Glow ──────────────────────────
      const coreRadius = baseRadius * scale * 0.95;
      const coreGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(10, coreRadius));
      const coreAlpha = isListening ? 0.45 : isSpeaking ? 0.35 : 0.22;

      coreGradient.addColorStop(0, `rgba(255, 215, 0, ${coreAlpha * 1.1})`); // #FFD700
      coreGradient.addColorStop(0.35, `rgba(255, 140, 0, ${coreAlpha * 0.75})`); // #FF8C00
      coreGradient.addColorStop(0.7, `rgba(255, 106, 0, ${coreAlpha * 0.35})`); // #FF6A00
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer ambient glow ring when listening
      if (isListening || isSpeaking) {
        const pulseRadius = baseRadius * scale * (1.15 + Math.sin(time * 3) * 0.05);
        const outerGrad = ctx.createRadialGradient(cx, cy, coreRadius * 0.7, cx, cy, pulseRadius);
        outerGrad.addColorStop(0, 'rgba(255, 106, 0, 0.25)');
        outerGrad.addColorStop(0.6, 'rgba(255, 140, 0, 0.12)');
        outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 2. Rotate & Project 3D Particles to 2D ──────────────────────
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 340;
      const projected: Array<{
        x: number;
        y: number;
        z: number;
        particle: Particle;
        pScale: number;
        alpha: number;
      }> = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Slight jitter when listening (voice frequency response)
        const jitter = isListening ? Math.sin(time * 8 + i) * 2.2 : 0;
        const px = p.baseX + (pxJitter(i) * jitter);
        const py = p.baseY + (pyJitter(i) * jitter);
        const pz = p.baseZ + (pzJitter(i) * jitter);

        // Rotate around Y axis
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;

        // Rotate around X axis
        const y1 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        // Perspective projection
        const pScale = fov / (fov + z2);
        const screenX = cx + x1 * pScale * scale;
        const screenY = cy + y1 * pScale * scale;

        // Depth alpha: particles facing viewer are brighter
        const depthFactor = (z2 + baseRadius) / (2 * baseRadius); // 0 (back) to 1 (front)
        const sparkle = 0.7 + Math.sin(time * 2 + p.sparkleOffset) * 0.3;
        const finalAlpha = Math.max(0.12, Math.min(1.0, (0.25 + depthFactor * 0.75) * p.alpha * sparkle * (isListening ? 1.25 : 1.0)));

        projected.push({
          x: screenX,
          y: screenY,
          z: z2,
          particle: p,
          pScale,
          alpha: finalAlpha,
        });
      }

      // Depth sort: back particles first, front particles last
      projected.sort((a, b) => a.z - b.z);

      // ── 3. Draw Connective Energy Filaments (Arc-Reactor Proximity Lines) ────
      const lineDistThreshold = 26 * scale;
      ctx.lineWidth = isListening ? 0.9 : 0.6;

      for (let i = 0; i < projected.length; i += 2) {
        const pA = projected[i];
        if (pA.z < 0) continue; // Only draw filaments for front hemisphere

        for (let j = i + 1; j < Math.min(projected.length, i + 14); j++) {
          const pB = projected[j];
          if (pB.z < 0) continue;

          const dx = pA.x - pB.x;
          const dy = pA.y - pB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < lineDistThreshold) {
            const lineAlpha = (1 - dist / lineDistThreshold) * 0.28 * (isListening ? 1.4 : 1.0);
            ctx.strokeStyle = pA.particle.color;
            ctx.globalAlpha = Math.min(lineAlpha, 0.5);
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
          }
        }
      }

      // ── 4. Draw Glowing Particles ──────────────────────────────────
      for (let i = 0; i < projected.length; i++) {
        const item = projected[i];
        const pRadius = Math.max(0.7, item.particle.size * item.pScale * (isListening ? 1.2 : 1.0));

        ctx.globalAlpha = item.alpha;
        ctx.fillStyle = item.particle.color;
        ctx.shadowColor = item.particle.color;
        ctx.shadowBlur = (isListening ? 14 : 7) * glow;

        ctx.beginPath();
        ctx.arc(item.x, item.y, pRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 5. Central Bright Core Iris Spark ──────────────────────────
      const irisRadius = isListening ? 8.5 : isSpeaking ? 7 : 5.5;
      ctx.globalAlpha = isListening ? 0.95 : 0.8;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = (isListening ? 22 : 12) * glow;

      ctx.beginPath();
      ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow blur
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isSpeaking, isThinking, size]);

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center cursor-pointer select-none group transition-transform duration-300 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'transparent',
      }}
      title={isListening ? 'Jarvis is listening... (1.18x)' : 'Tap sphere to speak to Jarvis'}
    >
      <canvas
        ref={canvasRef}
        className="block pointer-events-none"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
};

// Deterministic jitter helpers
function pxJitter(i: number): number {
  return ((i * 7) % 11 - 5) / 5;
}
function pyJitter(i: number): number {
  return ((i * 13) % 11 - 5) / 5;
}
function pzJitter(i: number): number {
  return ((i * 17) % 11 - 5) / 5;
}

export default JarvisSparkOrb;
