import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86_400_000;

const SPEED_MULTIPLIER = 50_000;

const MOON_PERIOD_DAYS = 27.322;
const MOON_M0_DEG = 134.963;

const EARTH_RADIUS = 20;
const MOON_RADIUS = 6;
const MOON_ORBIT_RADIUS_FACTOR = 0.18;

function moonAngleRad(now: number): number {
  const daysSinceJ2000 = (now - J2000_MS) / MS_PER_DAY;
  const m0Rad = (MOON_M0_DEG * Math.PI) / 180;
  const meanMotionRadPerDay = (2 * Math.PI) / MOON_PERIOD_DAYS;
  return m0Rad + meanMotionRadPerDay * daysSinceJ2000;
}

export function EarthMoon() {
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const nowRef = useRef(now);
  nowRef.current = now;
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ foreground, foregroundAlpha });
  colorsRef.current = { foreground, foregroundAlpha };

  const canvasRef = useCanvasAnimation({
    draw(ctx, canvas) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const simulatedNow =
        J2000_MS + (nowRef.current.getTime() - J2000_MS) + elapsed * SPEED_MULTIPLIER;
      const { foregroundAlpha: fgAlpha } = colorsRef.current;

      const cx = w / 2;
      const cy = h / 2;
      const moonOrbitR = Math.min(w, h) * MOON_ORBIT_RADIUS_FACTOR;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Moon orbital ring
      ctx.strokeStyle = fgAlpha(0.08);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, moonOrbitR, 0, 2 * Math.PI);
      ctx.stroke();

      // Earth glow
      const earthGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, EARTH_RADIUS * 2.5);
      earthGlow.addColorStop(0, fgAlpha(0.15));
      earthGlow.addColorStop(1, fgAlpha(0));
      ctx.beginPath();
      ctx.arc(cx, cy, EARTH_RADIUS * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = earthGlow;
      ctx.fill();

      // Earth
      ctx.beginPath();
      ctx.arc(cx, cy, EARTH_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = fgAlpha(0.85);
      ctx.fill();

      // Earth label
      ctx.font = `${11 * dpr}px 'Sora Variable', 'Sora', sans-serif`;
      ctx.fillStyle = fgAlpha(0.4);
      ctx.textAlign = "center";
      ctx.fillText("Earth", cx, cy + EARTH_RADIUS + 18);

      // Moon
      const angle = moonAngleRad(simulatedNow);
      const mx = cx + moonOrbitR * Math.cos(angle);
      const my = cy + moonOrbitR * Math.sin(angle);

      // Moon glow
      const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, MOON_RADIUS * 2);
      moonGlow.addColorStop(0, fgAlpha(0.12));
      moonGlow.addColorStop(1, fgAlpha(0));
      ctx.beginPath();
      ctx.arc(mx, my, MOON_RADIUS * 2, 0, 2 * Math.PI);
      ctx.fillStyle = moonGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mx, my, MOON_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = fgAlpha(0.75);
      ctx.fill();

      // Moon label
      ctx.font = `${10 * dpr}px 'Sora Variable', 'Sora', sans-serif`;
      ctx.fillStyle = fgAlpha(0.4);
      ctx.textAlign = "center";
      ctx.fillText("Moon", mx, my - MOON_RADIUS - 8);
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="earth-moon-canvas" className="absolute inset-0" />
      <div
        data-testid="earth-moon-time-overlay"
        className="absolute top-8 left-8 flex flex-col text-foreground"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex items-baseline gap-1"
          style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 100 }}
        >
          <span className="text-8xl">{hours}</span>
          <span className="text-8xl">:</span>
          <span className="text-8xl">{minutes}</span>
          <span className="ml-3 text-5xl" style={{ fontWeight: 200 }}>
            {period}
          </span>
        </div>
        <div
          className="mt-3 text-2xl tracking-widest"
          style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 300 }}
        >
          {dateStr}
        </div>
      </div>
    </div>
  );
}
