import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PERIOD_S = 4;
const BREATHE_PERIOD_S = 180;
const A_MIN = 0.15;
const A_MAX = 0.45;
const TRAIL_LENGTH = 7;
const TRAIL_OPACITIES = [0.08, 0.12, 0.18, 0.26, 0.36, 0.5, 1.0];

export function Pendulum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

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
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const amplitude =
        A_MIN + (A_MAX - A_MIN) * 0.5 * (1 + Math.sin((elapsed / BREATHE_PERIOD_S) * 2 * Math.PI));
      const angle = amplitude * Math.cos((elapsed / PERIOD_S) * 2 * Math.PI);

      const pivotX = w / 2;
      const length = h * 0.85;
      const bobX = pivotX + length * Math.sin(angle);
      const bobY = length * Math.cos(angle);

      trailRef.current.push({ x: bobX, y: bobY });
      if (trailRef.current.length > TRAIL_LENGTH) {
        trailRef.current.shift();
      }

      for (let i = 0; i < trailRef.current.length; i++) {
        const pos = trailRef.current[i];
        const opacity = TRAIL_OPACITIES[i + (TRAIL_LENGTH - trailRef.current.length)];
        ctx.beginPath();
        ctx.moveTo(pivotX, 0);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
    <div className="absolute inset-0 bg-black">
      <canvas ref={canvasRef} data-testid="pendulum-canvas" className="absolute inset-0" />
      <div
        data-testid="pendulum-time-overlay"
        className="absolute top-6 left-0 right-0 flex flex-col items-center text-white"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-baseline gap-1" style={{ fontWeight: 100 }}>
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>
            {period}
          </span>
        </div>
        <div className="mt-1 text-base tracking-widest" style={{ fontWeight: 300 }}>
          {dateStr}
        </div>
      </div>
    </div>
  );
}
