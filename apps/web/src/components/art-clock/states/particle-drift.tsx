import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PARTICLE_COUNT = 300;
const CONNECT_DISTANCE_PX = 120;
const SPEED_CYCLE_S = 30;
const CELL_SIZE = CONNECT_DISTANCE_PX;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function initParticles(w: number, h: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
  }));
}

export function ParticleDrift() {
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ foreground, foregroundAlpha });
  colorsRef.current = { foreground, foregroundAlpha };

  const canvasRef = useCanvasAnimation({
    onResize(width, height) {
      particlesRef.current = initParticles(width, height);
    },
    draw(ctx, canvas) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const speedMul = 0.3 + 0.9 * 0.5 * (1 + Math.sin((elapsed / SPEED_CYCLE_S) * 2 * Math.PI));
      const { foreground: fg, foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.vx * speedMul;
        p.y += p.vy * speedMul;
        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;
      }

      const cells: Map<string, Particle[]> = new Map();
      for (const p of particlesRef.current) {
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);
        const key = `${cx},${cy}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)?.push(p);
      }

      for (const p of particlesRef.current) {
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbors = cells.get(`${cx + dx},${cy + dy}`);
            if (!neighbors) continue;
            for (const q of neighbors) {
              if (q === p) continue;
              const dist = Math.hypot(p.x - q.x, p.y - q.y);
              if (dist < CONNECT_DISTANCE_PX) {
                const opacity = (1 - dist / CONNECT_DISTANCE_PX) * 0.3;
                ctx.beginPath();
                ctx.strokeStyle = fgAlpha(opacity);
                ctx.lineWidth = 0.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
              }
            }
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = fgAlpha(0.8);
        ctx.fill();
      }
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="particle-canvas" className="absolute inset-0" />
      <div
        data-testid="particle-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-foreground"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-9xl">{hours}</span>
          <span className="text-9xl">:</span>
          <span className="text-9xl">{minutes}</span>
          <span className="ml-2 text-5xl" style={{ fontWeight: 200 }}>
            {period}
          </span>
        </div>
        <div className="mt-2 text-base tracking-widest" style={{ fontWeight: 300 }}>
          {dateStr}
        </div>
      </div>
    </div>
  );
}
