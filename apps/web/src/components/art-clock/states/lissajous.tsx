import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const POINTS_PER_FRAME = 600;
const FADE_ALPHA = 0.008;
const DRIFT_SPEED = 0.000007;
const BASE_FREQ_A = 3;
const BASE_FREQ_B = 2;

export function Lissajous() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const phaseRef = useRef<number>(0);
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
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) * DRIFT_SPEED;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = `rgba(0,0,0,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.38;
      const ry = h * 0.38;

      const freqA = BASE_FREQ_A + Math.sin(elapsed * 0.7) * 0.15;
      const freqB = BASE_FREQ_B + Math.cos(elapsed * 0.5) * 0.1;
      const delta = phaseRef.current;

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 0.6;

      const step = (2 * Math.PI) / POINTS_PER_FRAME;
      for (let i = 0; i <= POINTS_PER_FRAME; i++) {
        const t = i * step + elapsed * 0.3;
        const x = cx + rx * Math.sin(freqA * t + delta);
        const y = cy + ry * Math.sin(freqB * t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phaseRef.current += 0.003;

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
      <canvas ref={canvasRef} data-testid="lissajous-canvas" className="absolute inset-0" />
      <div
        data-testid="lissajous-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
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
