import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const GRID_SPACING = 60;
const DISK_ROTATION_SPEED_RAD_PER_MS = 0.0005;
const STREAK_COUNT = 18;

interface Streak {
  phase: number;
  speed: number;
  rx: number;
  ry: number;
  trail: { x: number; y: number }[];
}

export function BlackHole() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const streaksRef = useRef<Streak[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, background, foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ foreground, background, foregroundAlpha });
  colorsRef.current = { foreground, background, foregroundAlpha };

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

      const w = window.innerWidth;
      const eventRadius = w * 0.08;

      streaksRef.current = Array.from({ length: STREAK_COUNT }, (_, i) => ({
        phase: (i / STREAK_COUNT) * 2 * Math.PI,
        speed: 0.0008 + Math.random() * 0.0004,
        rx: eventRadius * (2.5 + Math.random() * 1.5),
        ry: eventRadius * (0.8 + Math.random() * 0.4),
        trail: [],
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const diskAngle = elapsed * DISK_ROTATION_SPEED_RAD_PER_MS;
      const eventRadius = w * 0.08;
      const cx = w / 2;
      const cy = h / 2;
      const lensStrength = eventRadius * eventRadius * 3;
      const { foreground: fg, background: bg, foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = fgAlpha(0.1);
      ctx.lineWidth = 0.5;

      const gridCountH = Math.ceil(h / GRID_SPACING) + 1;
      const gridCountW = Math.ceil(w / GRID_SPACING) + 1;

      for (let i = 0; i < gridCountH; i++) {
        const y = i * GRID_SPACING;
        ctx.beginPath();
        let started = false;
        for (let x = 0; x <= w; x += 3) {
          const dx = x - cx;
          const dy = y - cy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < eventRadius) {
            started = false;
            continue;
          }
          const warp = lensStrength / (distSq + lensStrength);
          const wx = x - dx * warp;
          const wy = y - dy * warp;
          if (!started) {
            ctx.moveTo(wx, wy);
            started = true;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      }

      for (let i = 0; i < gridCountW; i++) {
        const x = i * GRID_SPACING;
        ctx.beginPath();
        let started = false;
        for (let y = 0; y <= h; y += 3) {
          const dx = x - cx;
          const dy = y - cy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < eventRadius) {
            started = false;
            continue;
          }
          const warp = lensStrength / (distSq + lensStrength);
          const wx = x - dx * warp;
          const wy = y - dy * warp;
          if (!started) {
            ctx.moveTo(wx, wy);
            started = true;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(diskAngle);
      for (let ring = 0; ring < 6; ring++) {
        const rx = eventRadius * (1.6 + ring * 0.4);
        const ry = rx * 0.28;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, -0.43, 0, 2 * Math.PI);
        ctx.strokeStyle = fgAlpha(0.15 - ring * 0.02);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(diskAngle);
      for (const streak of streaksRef.current) {
        streak.phase += streak.speed;
        const sx = streak.rx * Math.cos(streak.phase);
        const sy = streak.ry * Math.sin(streak.phase);
        streak.trail.push({ x: sx, y: sy });
        if (streak.trail.length > 5) streak.trail.shift();

        for (let t = 0; t < streak.trail.length; t++) {
          const pt = streak.trail[t];
          const opacity = ((t + 1) / streak.trail.length) * 0.6;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = fgAlpha(opacity);
          ctx.fill();
        }
      }
      ctx.restore();

      // Event horizon uses background color
      ctx.beginPath();
      ctx.arc(cx, cy, eventRadius, 0, 2 * Math.PI);
      ctx.fillStyle = bg;
      ctx.fill();

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
      <canvas ref={canvasRef} data-testid="blackhole-canvas" className="absolute inset-0" />
      <div
        data-testid="blackhole-time-overlay"
        className="absolute top-1/3 left-0 right-0 flex flex-col items-center text-foreground"
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
