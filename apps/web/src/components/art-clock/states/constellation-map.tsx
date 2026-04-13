import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const ROTATION_SPEED_RAD_PER_MS = 0.00003;

interface Star {
  x: number;
  y: number;
}

interface Constellation {
  name: string;
  stars: Star[];
  lines: [number, number][];
}

const CONSTELLATIONS: Constellation[] = [
  {
    name: "ORION",
    stars: [
      { x: 0.35, y: 0.3 },
      { x: 0.38, y: 0.35 },
      { x: 0.41, y: 0.4 },
      { x: 0.32, y: 0.45 },
      { x: 0.44, y: 0.45 },
      { x: 0.36, y: 0.52 },
      { x: 0.4, y: 0.52 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    name: "CASSIOPEIA",
    stars: [
      { x: 0.6, y: 0.12 },
      { x: 0.65, y: 0.17 },
      { x: 0.7, y: 0.13 },
      { x: 0.75, y: 0.18 },
      { x: 0.8, y: 0.13 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: "URSA MAJOR",
    stars: [
      { x: 0.15, y: 0.22 },
      { x: 0.19, y: 0.2 },
      { x: 0.23, y: 0.19 },
      { x: 0.27, y: 0.21 },
      { x: 0.28, y: 0.25 },
      { x: 0.24, y: 0.27 },
      { x: 0.2, y: 0.28 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
    ],
  },
  {
    name: "URSA MINOR",
    stars: [
      { x: 0.5, y: 0.05 },
      { x: 0.52, y: 0.08 },
      { x: 0.54, y: 0.12 },
      { x: 0.53, y: 0.16 },
      { x: 0.56, y: 0.18 },
      { x: 0.59, y: 0.16 },
      { x: 0.57, y: 0.12 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 2],
    ],
  },
  {
    name: "LYRA",
    stars: [
      { x: 0.72, y: 0.3 },
      { x: 0.74, y: 0.35 },
      { x: 0.76, y: 0.33 },
      { x: 0.78, y: 0.35 },
      { x: 0.76, y: 0.38 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 1],
    ],
  },
  {
    name: "CYGNUS",
    stars: [
      { x: 0.83, y: 0.25 },
      { x: 0.88, y: 0.3 },
      { x: 0.93, y: 0.35 },
      { x: 0.86, y: 0.28 },
      { x: 0.9, y: 0.28 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
  },
  {
    name: "LEO",
    stars: [
      { x: 0.12, y: 0.55 },
      { x: 0.16, y: 0.52 },
      { x: 0.2, y: 0.5 },
      { x: 0.24, y: 0.52 },
      { x: 0.22, y: 0.58 },
      { x: 0.16, y: 0.6 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
    ],
  },
  {
    name: "SCORPIUS",
    stars: [
      { x: 0.65, y: 0.62 },
      { x: 0.68, y: 0.65 },
      { x: 0.7, y: 0.7 },
      { x: 0.67, y: 0.75 },
      { x: 0.63, y: 0.78 },
      { x: 0.6, y: 0.82 },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ],
  },
];

export function ConstellationMap() {
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
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
      const angle = elapsed * ROTATION_SPEED_RAD_PER_MS;
      const { foreground: fg, foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.translate(-w / 2, -h / 2);

      for (const c of CONSTELLATIONS) {
        ctx.strokeStyle = fgAlpha(0.4);
        ctx.lineWidth = 0.5;
        for (const [a, b] of c.lines) {
          const sa = c.stars[a];
          const sb = c.stars[b];
          ctx.beginPath();
          ctx.moveTo(sa.x * w, sa.y * h);
          ctx.lineTo(sb.x * w, sb.y * h);
          ctx.stroke();
        }

        for (const star of c.stars) {
          ctx.beginPath();
          ctx.arc(star.x * w, star.y * h, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = fg;
          ctx.fill();
        }

        const cx = c.stars.reduce((s, st) => s + st.x, 0) / c.stars.length;
        const cy = c.stars.reduce((s, st) => s + st.y, 0) / c.stars.length;
        ctx.fillStyle = fgAlpha(0.35);
        ctx.font = "100 11px 'Sora Variable', 'Sora', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(c.name, cx * w, cy * h - 12);
      }

      ctx.restore();
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="constellation-canvas" className="absolute inset-0" />
      <div
        data-testid="constellation-time-overlay"
        className="absolute bottom-16 left-0 right-0 flex flex-col items-center text-foreground"
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
