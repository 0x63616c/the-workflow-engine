import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import {
  canvasLogicalSize,
  resizeCanvasToParent,
} from "@/components/art-clock/states/canvas-utils";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const NOISE_TIME_SPEED = 0.00015;
const GRID_CELL_SIZE = 28;
const NOISE_SCALE = 0.04;
const CONTOUR_LEVELS = [
  -0.9, -0.8, -0.7, -0.6, -0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
  0.9,
];

// Marching squares edge table: edges: 0=top, 1=right, 2=bottom, 3=left
const MARCHING_EDGES: [number, number][][] = [
  [],
  [[0, 3]],
  [[0, 1]],
  [[1, 3]],
  [[1, 2]],
  [
    [0, 3],
    [1, 2],
  ],
  [[0, 2]],
  [[2, 3]],
  [[2, 3]],
  [[0, 2]],
  [
    [0, 1],
    [2, 3],
  ],
  [[1, 2]],
  [[1, 3]],
  [[0, 1]],
  [[0, 3]],
  [],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function TopographicContours() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ foregroundAlpha });
  colorsRef.current = { foregroundAlpha };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise3D = createNoise3D();

    const resize = () => {
      resizeCanvasToParent(canvas);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = Date.now() - startTimeRef.current;
      const t = elapsed * NOISE_TIME_SPEED;
      const { foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / GRID_CELL_SIZE) + 1;
      const rows = Math.ceil(h / GRID_CELL_SIZE) + 1;

      const grid: number[][] = [];
      for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
          grid[row][col] = noise3D(col * NOISE_SCALE, row * NOISE_SCALE, t);
        }
      }

      for (const level of CONTOUR_LEVELS) {
        const absLevel = Math.abs(level);
        const opacity = 0.12 + 0.55 * absLevel;
        const isMajor = Math.abs(level * 10) % 5 < 0.1;
        ctx.strokeStyle = fgAlpha(opacity);
        ctx.lineWidth = isMajor ? 1.2 : 0.6;

        for (let row = 0; row < rows - 1; row++) {
          for (let col = 0; col < cols - 1; col++) {
            const tl = grid[row][col];
            const tr = grid[row][col + 1];
            const br = grid[row + 1][col + 1];
            const bl = grid[row + 1][col];

            const x0 = col * GRID_CELL_SIZE;
            const y0 = row * GRID_CELL_SIZE;
            const x1 = x0 + GRID_CELL_SIZE;
            const y1 = y0 + GRID_CELL_SIZE;

            const config =
              (tl > level ? 8 : 0) |
              (tr > level ? 4 : 0) |
              (br > level ? 2 : 0) |
              (bl > level ? 1 : 0);

            const edgePoints: [number, number][] = [
              [lerp(x0, x1, (level - tl) / (tr - tl || 1e-9)), y0],
              [x1, lerp(y0, y1, (level - tr) / (br - tr || 1e-9))],
              [lerp(x0, x1, (level - bl) / (br - bl || 1e-9)), y1],
              [x0, lerp(y0, y1, (level - tl) / (bl - tl || 1e-9))],
            ];

            for (const [ea, eb] of MARCHING_EDGES[config]) {
              ctx.beginPath();
              ctx.moveTo(edgePoints[ea][0], edgePoints[ea][1]);
              ctx.lineTo(edgePoints[eb][0], edgePoints[eb][1]);
              ctx.stroke();
            }
          }
        }
      }

      // Fade contour lines at all four edges so strokes taper out instead of hard-clipping.
      const FADE_SIZE = GRID_CELL_SIZE * 3;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";

      const fadeTop = ctx.createLinearGradient(0, 0, 0, FADE_SIZE);
      fadeTop.addColorStop(0, "rgba(0,0,0,1)");
      fadeTop.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fadeTop;
      ctx.fillRect(0, 0, w, FADE_SIZE);

      const fadeBottom = ctx.createLinearGradient(0, h - FADE_SIZE, 0, h);
      fadeBottom.addColorStop(0, "rgba(0,0,0,0)");
      fadeBottom.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = fadeBottom;
      ctx.fillRect(0, h - FADE_SIZE, w, FADE_SIZE);

      const fadeLeft = ctx.createLinearGradient(0, 0, FADE_SIZE, 0);
      fadeLeft.addColorStop(0, "rgba(0,0,0,1)");
      fadeLeft.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fadeLeft;
      ctx.fillRect(0, 0, FADE_SIZE, h);

      const fadeRight = ctx.createLinearGradient(w - FADE_SIZE, 0, w, 0);
      fadeRight.addColorStop(0, "rgba(0,0,0,0)");
      fadeRight.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = fadeRight;
      ctx.fillRect(w - FADE_SIZE, 0, FADE_SIZE, h);

      ctx.restore();

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
      <canvas ref={canvasRef} data-testid="contours-canvas" className="absolute inset-0" />
      <div
        data-testid="contours-time-overlay"
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
