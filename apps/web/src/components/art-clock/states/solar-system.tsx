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

interface PlanetData {
  name: string;
  periodDays: number;
  m0Deg: number;
  dotRadius: number;
}

const PLANETS: PlanetData[] = [
  { name: "Mercury", periodDays: 87.969, m0Deg: 174.796, dotRadius: 2 },
  { name: "Venus", periodDays: 224.701, m0Deg: 50.115, dotRadius: 2.5 },
  { name: "Earth", periodDays: 365.256, m0Deg: 357.517, dotRadius: 2.5 },
  { name: "Mars", periodDays: 686.971, m0Deg: 19.412, dotRadius: 2 },
  { name: "Jupiter", periodDays: 4332.59, m0Deg: 20.02, dotRadius: 5 },
  { name: "Saturn", periodDays: 10759.22, m0Deg: 317.02, dotRadius: 4.5 },
  { name: "Uranus", periodDays: 30688.5, m0Deg: 142.238, dotRadius: 3.5 },
  { name: "Neptune", periodDays: 60182.0, m0Deg: 256.228, dotRadius: 3 },
];

function planetAngleRad(planet: PlanetData, now: number): number {
  const daysSinceJ2000 = (now - J2000_MS) / MS_PER_DAY;
  const m0Rad = (planet.m0Deg * Math.PI) / 180;
  const meanMotionRadPerDay = (2 * Math.PI) / planet.periodDays;
  return m0Rad + meanMotionRadPerDay * daysSinceJ2000;
}

function orbitalRadius(index: number, maxR: number): number {
  return maxR * (Math.log(1 + index + 1) / Math.log(PLANETS.length + 1));
}

export function SolarSystem() {
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
      const { foreground: fg, foregroundAlpha: fgAlpha } = colorsRef.current;

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.44;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Orbital rings
      ctx.strokeStyle = fgAlpha(0.12);
      ctx.lineWidth = 0.5;
      for (let i = 0; i < PLANETS.length; i++) {
        const r = orbitalRadius(i, maxR);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Sun glow
      const sunGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
      sunGradient.addColorStop(0, fgAlpha(0.9));
      sunGradient.addColorStop(1, fgAlpha(0));
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
      ctx.fillStyle = sunGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = fgAlpha(0.95);
      ctx.fill();

      // Planet dots
      for (let i = 0; i < PLANETS.length; i++) {
        const planet = PLANETS[i];
        const r = orbitalRadius(i, maxR);
        const angle = planetAngleRad(planet, simulatedNow);
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(px, py, planet.dotRadius, 0, 2 * Math.PI);
        ctx.fillStyle = fgAlpha(0.9);
        ctx.fill();
      }
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="solar-system-canvas" className="absolute inset-0" />
      <div
        data-testid="solar-system-time-overlay"
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
