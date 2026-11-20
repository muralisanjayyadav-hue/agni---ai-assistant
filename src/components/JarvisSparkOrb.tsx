import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

export interface JarvisSparkOrbProps {
  /** When true: 1.18x scale, rings spin 2x faster, brighter glow, jittering dust. */
  isListening?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Canvas fill colour. Leave undefined for a transparent canvas (sits on the page background). */
  background?: string;
}

type V3 = [number, number, number];
type Edge = [number, number, number]; // [a, b, kind] kind: 0 surface, 1 inner shell, 2 chord

interface Dust {
  p: V3;
  size: number;
  phase: number;
  speed: number;
}

interface RingDef {
  rad: number;
  tiltX: number;
  tiltZ: number;
  dir: number;
  offset: number;
}

const TAU = Math.PI * 2;
const FOCAL = 3.4; // camera distance for perspective projection
const ORANGE = '255,107,0'; // #FF6B00
const GOLD = '255,215,0'; // #FFD700
const SEGMENTS = 96;

const RINGS: RingDef[] = [
  { rad: 1.5, tiltX: 0.75, tiltZ: -0.5, dir: 1, offset: 0 },
  { rad: 1.32, tiltX: 1.15, tiltZ: 0.6, dir: -1, offset: 2.1 },
];

/* ---------- small helpers ---------- */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rotX = (p: V3, a: number): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};
const rotY = (p: V3, a: number): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};
const rotZ = (p: V3, a: number): V3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

/* ---------- geometry (built once) ---------- */

function fibonacciSphere(n: number, radius: number): V3[] {
  const pts: V3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    pts.push([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius]);
  }
  return pts;
}

const OUTER_COUNT = 60;
const INNER_COUNT = 24;

function buildGeometry() {
  const rnd = mulberry32(7);
  const points: V3[] = [...fibonacciSphere(OUTER_COUNT, 1), ...fibonacciSphere(INNER_COUNT, 0.52)];
  const edges: Edge[] = [];
  const seen = new Set<number>();

  const add = (a: number, b: number, kind: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (lo === hi) return;
    const key = lo * 1000 + hi;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([lo, hi, kind]);
  };

  const dist2 = (i: number, j: number) => {
    const dx = points[i][0] - points[j][0];
    const dy = points[i][1] - points[j][1];
    const dz = points[i][2] - points[j][2];
    return dx * dx + dy * dy + dz * dz;
  };

  // nearest-neighbour links give a triangle-mesh look on each shell
  const connect = (start: number, count: number, k: number, kind: number) => {
    for (let i = start; i < start + count; i++) {
      const list: { j: number; d: number }[] = [];
      for (let j = start; j < start + count; j++) {
        if (j !== i) list.push({ j, d: dist2(i, j) });
      }
      list.sort((a, b) => a.d - b.d);
      for (let n = 0; n < k; n++) add(i, list[n].j, kind);
    }
  };
  connect(0, OUTER_COUNT, 5, 0);
  connect(OUTER_COUNT, INNER_COUNT, 3, 1);

  // long chords through the sphere = the chaotic inner web in the reference
  let made = 0;
  let guard = 0;
  while (made < 34 && guard++ < 800) {
    const a = Math.floor(rnd() * OUTER_COUNT);
    const b = Math.floor(rnd() * points.length);
    if (dist2(a, b) < 1.2) continue;
    const before = edges.length;
    add(a, b, 2);
    if (edges.length > before) made++;
  }

  const dust: Dust[] = [];
  for (let i = 0; i < 200; i++) {
    const u = rnd() * 2 - 1;
    const a = rnd() * TAU;
    const r2 = Math.sqrt(1 - u * u);
    const rad = 1.75 + Math.pow(rnd(), 1.5) * 0.55;
    dust.push({
      p: [Math.cos(a) * r2 * rad, u * rad * 0.78, Math.sin(a) * r2 * rad],
      size: 0.5 + rnd() * 1.3,
      phase: rnd() * TAU,
      speed: 0.6 + rnd() * 1.8,
    });
  }

  return { points, edges, dust };
}

let geometryCache: ReturnType<typeof buildGeometry> | null = null;
const getGeometry = () => (geometryCache ??= buildGeometry());

/* ---------- drawing helpers ---------- */

function strokeSegs(
  ctx: CanvasRenderingContext2D,
  list: number[][],
  width: number,
  rgb: string,
  alpha: number,
) {
  if (!list.length || alpha <= 0) return;
  ctx.beginPath();
  for (const s of list) {
    ctx.moveTo(s[0], s[1]);
    ctx.lineTo(s[2], s[3]);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = `rgba(${rgb},${Math.min(1, alpha)})`;
  ctx.stroke();
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  list: number[][],
  bw: number,
  glow: number,
  dim: number,
) {
  // layered strokes = soft outer glow -> orange body -> gold edge -> white-hot centre
  strokeSegs(ctx, list, bw * 3.6, ORANGE, 0.07 * glow * dim);
  strokeSegs(ctx, list, bw * 2.0, ORANGE, 0.18 * glow * dim);
  strokeSegs(ctx, list, bw, ORANGE, 0.9 * dim);
  strokeSegs(ctx, list, bw * 0.38, GOLD, 0.95 * dim);
  strokeSegs(ctx, list, bw * 0.12, '255,255,240', 0.75 * dim);
}

/* ---------- component ---------- */

export function JarvisSparkOrb({ isListening = false, className, style, background }: JarvisSparkOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listeningRef = useRef(isListening);
  const backgroundRef = useRef(background);

  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    backgroundRef.current = background;
  }, [background]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { points, edges, dust } = getGeometry();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let time = 0;
    let listen = 0; // smoothed 0..1
    const ringPhase = [0, 0];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      time += dt;
      if (w < 2 || h < 2) return;

      // ease toward the listening state
      const target = listeningRef.current ? 1 : 0;
      listen += (target - listen) * (1 - Math.exp(-dt * 6));

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.21 * (1 + 0.18 * listen);
      const glow = 1 + 0.6 * listen;
      const speedMul = 1 + listen; // 2x when listening
      ringPhase[0] += dt * 0.55 * speedMul;
      ringPhase[1] += dt * 0.4 * speedMul;

      const project = (p: V3) => {
        const s = FOCAL / (FOCAL + p[2]);
        return { x: cx + p[0] * s * R, y: cy + p[1] * s * R, z: p[2], s };
      };

      // ---- clear ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      const bg = backgroundRef.current;
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // ---- ambient bloom ----
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.8);
      bloom.addColorStop(0, `rgba(255,120,10,${0.16 * glow})`);
      bloom.addColorStop(0.45, `rgba(255,80,0,${0.07 * glow})`);
      bloom.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      const tiltCam = 0.42 + Math.sin(time * 0.25) * 0.08;
      const spinCam = time * 0.3 * (1 + 0.35 * listen);

      // ---- dust halo (200 particles) ----
      const jitter = listen * R * 0.035;
      for (const d of dust) {
        const q = rotX(rotY(d.p, time * 0.07), tiltCam * 0.6);
        const pr = project(q);
        const tw = 0.55 + 0.45 * Math.sin(time * d.speed + d.phase);
        const a = (0.12 + 0.3 * tw) * glow * (q[2] > 0 ? 0.55 : 1);
        const jx = jitter ? (Math.random() - 0.5) * jitter * 2 : 0;
        const jy = jitter ? (Math.random() - 0.5) * jitter * 2 : 0;
        ctx.fillStyle = `rgba(255,${170 + ((tw * 60) | 0)},60,${Math.min(1, a)})`;
        ctx.beginPath();
        ctx.arc(pr.x + jx, pr.y + jy, d.size * pr.s * (R / 105), 0, TAU);
        ctx.fill();
      }

      // ---- rings: compute both halves ----
      const bw = R * 0.065; // ~7px at a 500px canvas
      const ringData = RINGS.map((ring, idx) => {
        const spin = ringPhase[idx] * ring.dir + ring.offset;
        const back: number[][] = [];
        const front: number[][] = [];
        let prev: ReturnType<typeof project> | null = null;
        for (let i = 0; i <= SEGMENTS; i++) {
          const a = (i / SEGMENTS) * TAU;
          let p: V3 = [Math.cos(a) * ring.rad, 0, Math.sin(a) * ring.rad];
          p = rotZ(rotY(rotX(p, ring.tiltX), spin), ring.tiltZ);
          const pr = project(p);
          if (prev) {
            const seg = [prev.x, prev.y, pr.x, pr.y];
            ((prev.z + pr.z) / 2 > 0 ? back : front).push(seg);
          }
          prev = pr;
        }
        return { back, front };
      });

      // back halves of rings (behind sphere, dimmer)
      for (const rd of ringData) drawRing(ctx, rd.back, bw * 0.88, glow, 0.5);

      // ---- wireframe sphere ----
      const proj = points.map((p) => project(rotX(rotY(p, spinCam), tiltCam)));
      const lw = Math.max(0.8, R * 0.009);
      for (const [a, b, kind] of edges) {
        const pa = proj[a];
        const pb = proj[b];
        const z = (pa.z + pb.z) / 2;
        const front = 1 - (Math.max(-1, Math.min(1, z)) + 1) / 2; // 0 far .. 1 near
        const base = kind === 2 ? 0.2 : kind === 1 ? 0.3 : 0.55;
        const al = base * (0.25 + 0.75 * front) * glow;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.lineWidth = lw * 3;
        ctx.strokeStyle = `rgba(${ORANGE},${Math.min(1, al * 0.22)})`;
        ctx.stroke();
        ctx.lineWidth = lw;
        ctx.strokeStyle = `rgba(255,${150 + ((front * 70) | 0)},30,${Math.min(1, al)})`;
        ctx.stroke();
      }
      // glowing vertices
      for (let i = 0; i < proj.length; i++) {
        const pr = proj[i];
        const front = 1 - (Math.max(-1, Math.min(1, pr.z)) + 1) / 2;
        const r = (i < OUTER_COUNT ? 1.7 : 1.2) * pr.s * (R / 105);
        ctx.fillStyle = `rgba(255,225,140,${Math.min(1, (0.25 + 0.7 * front) * glow)})`;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, r, 0, TAU);
        ctx.fill();
      }

      // ---- starburst core ----
      const pulse = 1 + 0.06 * Math.sin(time * 3.1) + 0.1 * listen * Math.sin(time * 9);
      // long spikes + short rays
      for (let i = 0; i < 18; i++) {
        const long = i % 3 === 0;
        const ang = (i / 18) * TAU + time * 0.12 + Math.sin(i * 12.9) * 0.2;
        const flick = 0.75 + 0.25 * Math.sin(time * (2 + (i % 5)) + i);
        const len = R * (long ? 1.9 : 0.85 + (i % 4) * 0.12) * flick * (1 + 0.25 * listen);
        const ex = cx + Math.cos(ang) * len;
        const ey = cy + Math.sin(ang) * len;
        const g = ctx.createLinearGradient(cx, cy, ex, ey);
        g.addColorStop(0, `rgba(255,245,200,${0.85 * glow > 1 ? 1 : 0.85 * glow})`);
        g.addColorStop(0.35, `rgba(${GOLD},${0.4 * glow})`);
        g.addColorStop(1, `rgba(${ORANGE},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = long ? Math.max(1.2, R * 0.014) : Math.max(0.8, R * 0.008);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      const cr = R * 0.36 * pulse * (0.9 + 0.2 * glow);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(0.1, 'rgba(255,250,200,0.98)');
      core.addColorStop(0.28, `rgba(${GOLD},${Math.min(1, 0.6 * glow)})`);
      core.addColorStop(0.62, `rgba(${ORANGE},${0.22 * glow})`);
      core.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, TAU);
      ctx.fill();

      // ---- front halves of rings (over the sphere) ----
      for (const rd of ringData) drawRing(ctx, rd.front, bw * 1.1, glow, 1);

      // ---- lens flare ----
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.07);
      const streakR = R * 2.6 * (1 + 0.2 * listen);
      const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, streakR);
      streak.addColorStop(0, `rgba(255,235,170,${0.55 * glow})`);
      streak.addColorStop(0.3, `rgba(255,150,30,${0.2 * glow})`);
      streak.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = streak;
      ctx.beginPath();
      ctx.arc(0, 0, streakR, 0, TAU);
      ctx.fill();
      ctx.restore();

      const ghosts: [number, number, number][] = [
        [0.9, 0.12, 0.07],
        [1.5, 0.2, 0.05],
        [-1.1, 0.16, 0.06],
        [2.2, 0.32, 0.035],
      ];
      for (const [k, size, alpha] of ghosts) {
        const gx = cx + k * R * 0.8;
        const gy = cy - k * R * 0.35;
        const gr = size * R * 1.2;
        const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        gg.addColorStop(0, `rgba(255,200,90,${alpha * glow})`);
        gg.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, TAU);
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
      aria-label="AGNI orb"
    />
  );
}

export default JarvisSparkOrb;
