import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import {
  canvasLogicalSize,
  resizeCanvasToParent,
} from "@/components/art-clock/states/canvas-utils";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const SWEEP_SPEED_RAD_PER_MS = (2 * Math.PI) / 4000;
const BLIP_COUNT = 6;
const BLIP_DECAY_MS = 2000;

interface Blip {
  angle: number;
  radius: number;
  spawnedAt: number;
}

function randomBlip(maxRadius: number): Blip {
  return {
    angle: Math.random() * 2 * Math.PI,
    radius: maxRadius * (0.2 + Math.random() * 0.75),
    spawnedAt: -1,
  };
}

export function Radar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const blipsRef = useRef<Blip[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ foreground, foregroundAlpha });
  colorsRef.current = { foreground, foregroundAlpha };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const { width, height } = resizeCanvasToParent(canvas);
      const maxR = Math.min(width, height) * 0.42;
      blipsRef.current = Array.from({ length: BLIP_COUNT }, () => randomBlip(maxR));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const sweepAngle = (elapsed * SWEEP_SPEED_RAD_PER_MS - Math.PI / 2) % (2 * Math.PI);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.42;
      const { foreground: fg, foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = fgAlpha(0.15);
      ctx.lineWidth = 0.5;
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (ring / 4) * maxR, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      ctx.fillStyle = fgAlpha(0.3);
      ctx.font = "100 10px 'GeistMono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("N", cx, cy - maxR - 6);
      ctx.fillText("S", cx, cy + maxR + 14);
      ctx.textAlign = "left";
      ctx.fillText("E", cx + maxR + 6, cy + 4);
      ctx.textAlign = "right";
      ctx.fillText("W", cx - maxR - 6, cy + 4);

      const trailAngle = Math.PI / 2;
      for (let step = 0; step < 30; step++) {
        const fraction = step / 30;
        const arcStart = sweepAngle - trailAngle * fraction;
        const opacity = (1 - fraction) * 0.12;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * 0.01, arcStart - 0.05, arcStart + 0.05);
        ctx.strokeStyle = fgAlpha(opacity);
        ctx.lineWidth = maxR;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(sweepAngle), cy + maxR * Math.sin(sweepAngle));
      ctx.strokeStyle = fgAlpha(0.7);
      ctx.lineWidth = 1;
      ctx.stroke();

      for (const blip of blipsRef.current) {
        const blipAngle = blip.angle - Math.PI / 2;
        const diff = (((sweepAngle - blipAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (diff < 0.06 && blip.spawnedAt < 0) {
          blip.spawnedAt = elapsed;
        }
        if (blip.spawnedAt > 0 && elapsed - blip.spawnedAt > BLIP_DECAY_MS) {
          const fresh = randomBlip(maxR);
          blip.angle = fresh.angle;
          blip.radius = fresh.radius;
          blip.spawnedAt = -1;
        }

        if (blip.spawnedAt > 0) {
          const age = elapsed - blip.spawnedAt;
          const opacity = Math.max(0, 1 - age / BLIP_DECAY_MS);
          const bx = cx + blip.radius * Math.cos(blip.angle - Math.PI / 2);
          const by = cy + blip.radius * Math.sin(blip.angle - Math.PI / 2);
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, 2 * Math.PI);
          ctx.fillStyle = fgAlpha(opacity);
          ctx.fill();
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
      <canvas ref={canvasRef} data-testid="radar-canvas" className="absolute inset-0" />
      <div
        data-testid="radar-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-foreground"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex items-baseline gap-1"
          style={{ fontFamily: "'GeistMono', monospace", fontWeight: 100 }}
        >
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-2 text-4xl" style={{ fontWeight: 200 }}>
            {period}
          </span>
        </div>
        <div
          className="mt-2 text-sm tracking-widest"
          style={{ fontFamily: "'GeistMono', monospace", fontWeight: 300 }}
        >
          {dateStr}
        </div>
      </div>
    </div>
  );
}
