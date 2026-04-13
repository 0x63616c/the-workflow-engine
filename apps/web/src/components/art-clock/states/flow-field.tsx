import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PARTICLE_COUNT = 400;
const PARTICLE_LIFESPAN_FRAMES = 120;
const FIELD_SCALE = 0.003;
const FIELD_SPEED = 0.0004;
const PARTICLE_SPEED = 1.8;
const TRAIL_ALPHA = 0.03;

interface FlowParticle {
  x: number;
  y: number;
  age: number;
  lifespan: number;
}

function fieldAngle(x: number, y: number, t: number): number {
  return (
    Math.sin(x * FIELD_SCALE + t) * Math.cos(y * FIELD_SCALE * 0.7 + t * 0.8) * Math.PI +
    Math.cos(x * FIELD_SCALE * 0.5 - y * FIELD_SCALE * 0.9 + t * 1.3) * Math.PI * 0.5
  );
}

function spawnParticle(w: number, h: number): FlowParticle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    age: 0,
    lifespan: PARTICLE_LIFESPAN_FRAMES * (0.5 + Math.random() * 0.8),
  };
}

export function FlowField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const particlesRef = useRef<FlowParticle[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { background, foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ background, foregroundAlpha });
  colorsRef.current = { background, foregroundAlpha };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        spawnParticle(window.innerWidth, window.innerHeight),
      );
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const t = (Date.now() - startTimeRef.current) * FIELD_SPEED;
      const { background: bg, foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = bg;
      ctx.globalAlpha = TRAIL_ALPHA;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      ctx.lineWidth = 0.7;

      for (const p of particlesRef.current) {
        const angle = fieldAngle(p.x, p.y, t);
        const prevX = p.x;
        const prevY = p.y;

        p.x += Math.cos(angle) * PARTICLE_SPEED;
        p.y += Math.sin(angle) * PARTICLE_SPEED;
        p.age++;

        const lifeRatio = p.age / p.lifespan;
        const opacity =
          lifeRatio < 0.1
            ? lifeRatio * 10 * 0.6
            : lifeRatio > 0.8
              ? (1 - lifeRatio) * 5 * 0.6
              : 0.6;

        ctx.beginPath();
        ctx.strokeStyle = fgAlpha(opacity);
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (p.age >= p.lifespan || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          const fresh = spawnParticle(w, h);
          p.x = fresh.x;
          p.y = fresh.y;
          p.age = 0;
          p.lifespan = fresh.lifespan;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="flow-field-canvas" className="absolute inset-0" />
      <div
        data-testid="flow-field-time-overlay"
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
