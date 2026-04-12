import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const NOISE_TIME_SPEED = 0.0002;
const GRID_CELL_SIZE = 80;
const CONTOUR_LEVELS = [-0.9, -0.75, -0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise3D = createNoise3D();

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
      const elapsed = Date.now() - startTimeRef.current;
      const t = elapsed * NOISE_TIME_SPEED;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / GRID_CELL_SIZE) + 1;
      const rows = Math.ceil(h / GRID_CELL_SIZE) + 1;

      const grid: number[][] = [];
      for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
          grid[row][col] = noise3D(col * 0.12, row * 0.12, t);
        }
      }

      for (const level of CONTOUR_LEVELS) {
        const opacity = 0.2 + 0.6 * Math.abs(level);
        ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
        ctx.lineWidth = 0.5;

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
      <canvas ref={canvasRef} data-testid="contours-canvas" className="absolute inset-0" />
      <div
        data-testid="contours-time-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center text-white"
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
        <div className="mt-2 text-sm tracking-widest" style={{ fontWeight: 300 }}>
          {dateStr}
        </div>
      </div>
    </div>
  );
}
