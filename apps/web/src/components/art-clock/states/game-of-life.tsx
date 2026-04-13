import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const CELL_SIZE_PX = 5;
const GENERATION_INTERVAL_MS = 80;
const STAGNATION_CHECK_GENERATIONS = 30;
const STAGNATION_THRESHOLD = 5;
const MIN_POPULATION = 50;
const SEED_DENSITY = 0.3;

function buildGrid(cols: number, rows: number): Uint8Array {
  const grid = new Uint8Array(cols * rows);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < SEED_DENSITY ? 1 : 0;
  }
  return grid;
}

function stepGrid(grid: Uint8Array, next: Uint8Array, cols: number, rows: number): number {
  let population = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let neighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = (row + dr + rows) % rows;
          const c = (col + dc + cols) % cols;
          neighbors += grid[r * cols + c];
        }
      }
      const alive = grid[row * cols + col];
      const nextAlive = alive
        ? neighbors === 2 || neighbors === 3
          ? 1
          : 0
        : neighbors === 3
          ? 1
          : 0;
      next[row * cols + col] = nextAlive;
      population += nextAlive;
    }
  }
  return population;
}

export function GameOfLife() {
  const gridRef = useRef<Uint8Array>(new Uint8Array(0));
  const nextGridRef = useRef<Uint8Array>(new Uint8Array(0));
  const colsRef = useRef(0);
  const rowsRef = useRef(0);
  const lastGenTimeRef = useRef(0);
  const generationRef = useRef(0);
  const populationRef = useRef(0);
  const lastCheckedPopRef = useRef(0);
  const stagnationCountRef = useRef(0);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, background } = useClockColors();
  const colorsRef = useRef({ foreground, background });
  colorsRef.current = { foreground, background };

  const canvasRef = useCanvasAnimation({
    onResize(width, height) {
      colsRef.current = Math.ceil(width / CELL_SIZE_PX);
      rowsRef.current = Math.ceil(height / CELL_SIZE_PX);
      const cols = colsRef.current;
      const rows = rowsRef.current;
      gridRef.current = buildGrid(cols, rows);
      nextGridRef.current = new Uint8Array(cols * rows);
      generationRef.current = 0;
      lastCheckedPopRef.current = 0;
      stagnationCountRef.current = 0;
    },
    draw(ctx, canvas, timestamp) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const cols = colsRef.current;
      const rows = rowsRef.current;
      const { foreground: fg, background: bg } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (timestamp - lastGenTimeRef.current >= GENERATION_INTERVAL_MS) {
        lastGenTimeRef.current = timestamp;
        populationRef.current = stepGrid(gridRef.current, nextGridRef.current, cols, rows);

        const tmp = gridRef.current;
        gridRef.current = nextGridRef.current;
        nextGridRef.current = tmp;

        generationRef.current++;

        if (generationRef.current % STAGNATION_CHECK_GENERATIONS === 0) {
          if (populationRef.current === lastCheckedPopRef.current) {
            stagnationCountRef.current++;
          } else {
            stagnationCountRef.current = 0;
          }
          lastCheckedPopRef.current = populationRef.current;

          if (
            stagnationCountRef.current >= STAGNATION_THRESHOLD ||
            populationRef.current < MIN_POPULATION
          ) {
            colsRef.current = Math.ceil(w / CELL_SIZE_PX);
            rowsRef.current = Math.ceil(h / CELL_SIZE_PX);
            gridRef.current = buildGrid(colsRef.current, rowsRef.current);
            nextGridRef.current = new Uint8Array(colsRef.current * rowsRef.current);
            generationRef.current = 0;
            lastCheckedPopRef.current = 0;
            stagnationCountRef.current = 0;
          }
        }
      }

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = fg;
      const grid = gridRef.current;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (grid[row * cols + col]) {
            ctx.fillRect(
              col * CELL_SIZE_PX,
              row * CELL_SIZE_PX,
              CELL_SIZE_PX - 1,
              CELL_SIZE_PX - 1,
            );
          }
        }
      }
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="game-of-life-canvas" className="absolute inset-0" />
      <div
        data-testid="game-of-life-time-overlay"
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
