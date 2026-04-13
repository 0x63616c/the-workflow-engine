import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import {
  type PatternDef,
  pickWeightedPattern,
  randomOrientation,
} from "@/components/art-clock/states/game-of-life-patterns";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

// ---------------------------------------------------------------------------
// Tweakable constants
// ---------------------------------------------------------------------------

/** How often the clock text updates (ms) */
const CLOCK_UPDATE_INTERVAL_MS = 1000;

/** Size of each cell in CSS pixels */
const CELL_SIZE_PX = 5;

/** Time between simulation generations (ms) */
const GENERATION_INTERVAL_MS = 80;

/** How many patterns to spawn on first load */
const INITIAL_SPAWN_COUNT = 10;

/** Time between periodic pattern spawns (ms). Range: 3000-5000, randomized each time. */
const SPAWN_INTERVAL_MIN_MS = 3000;
const SPAWN_INTERVAL_MAX_MS = 5000;

/**
 * Buffer multiplier for spawn clearance.
 * A pattern of size WxH needs a clear area of (W * BUFFER_MULT) x (H * BUFFER_MULT).
 */
const SPAWN_BUFFER_MULTIPLIER = 2;

/** Max random positions to try before giving up (grid is too busy) */
const SPAWN_MAX_ATTEMPTS = 20;

/**
 * Clock exclusion zone: fraction of screen width/height around center
 * where patterns won't spawn, so the time overlay stays readable.
 */
const CLOCK_EXCLUSION_ZONE_W = 0.3;
const CLOCK_EXCLUSION_ZONE_H = 0.15;

/** Whether spaceships should prefer spawning from screen edges */
const SPACESHIPS_SPAWN_FROM_EDGES = true;

// ---------------------------------------------------------------------------
// Simulation (pure functions, no React)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Spawn logic
// ---------------------------------------------------------------------------

/**
 * Check if a rectangular area on the grid is completely empty (all dead cells).
 * Uses the buffered bounding box: pattern size * SPAWN_BUFFER_MULTIPLIER.
 */
function isAreaClear(
  grid: Uint8Array,
  cols: number,
  rows: number,
  startCol: number,
  startRow: number,
  areaWidth: number,
  areaHeight: number,
): boolean {
  for (let r = startRow; r < startRow + areaHeight; r++) {
    for (let c = startCol; c < startCol + areaWidth; c++) {
      // Wrap around edges (toroidal)
      const wr = ((r % rows) + rows) % rows;
      const wc = ((c % cols) + cols) % cols;
      if (grid[wr * cols + wc]) return false;
    }
  }
  return true;
}

/**
 * Check if a position overlaps with the clock exclusion zone.
 */
function overlapsClockZone(
  col: number,
  row: number,
  patternWidth: number,
  patternHeight: number,
  cols: number,
  rows: number,
): boolean {
  const centerCol = cols / 2;
  const centerRow = rows / 2;
  const halfZoneW = (cols * CLOCK_EXCLUSION_ZONE_W) / 2;
  const halfZoneH = (rows * CLOCK_EXCLUSION_ZONE_H) / 2;

  const zoneLeft = centerCol - halfZoneW;
  const zoneRight = centerCol + halfZoneW;
  const zoneTop = centerRow - halfZoneH;
  const zoneBottom = centerRow + halfZoneH;

  const patRight = col + patternWidth;
  const patBottom = row + patternHeight;

  return col < zoneRight && patRight > zoneLeft && row < zoneBottom && patBottom > zoneTop;
}

/**
 * Place a pattern's cells onto the grid at the given position.
 */
function placePattern(
  grid: Uint8Array,
  cols: number,
  rows: number,
  cells: boolean[][],
  startCol: number,
  startRow: number,
): void {
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      if (cells[r][c]) {
        const wr = (((startRow + r) % rows) + rows) % rows;
        const wc = (((startCol + c) % cols) + cols) % cols;
        grid[wr * cols + wc] = 1;
      }
    }
  }
}

/**
 * Pick a random edge position for a spaceship so it enters the screen naturally.
 * Returns [col, row] on one of the four edges.
 */
function randomEdgePosition(
  patternWidth: number,
  patternHeight: number,
  cols: number,
  rows: number,
): [number, number] {
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: // top
      return [Math.floor(Math.random() * (cols - patternWidth)), 0];
    case 1: // bottom
      return [Math.floor(Math.random() * (cols - patternWidth)), rows - patternHeight];
    case 2: // left
      return [0, Math.floor(Math.random() * (rows - patternHeight))];
    default: // right
      return [cols - patternWidth, Math.floor(Math.random() * (rows - patternHeight))];
  }
}

/**
 * Try to spawn a single pattern onto the grid.
 * Returns true if successfully placed, false if no clear spot was found.
 */
function trySpawnPattern(
  grid: Uint8Array,
  cols: number,
  rows: number,
  pattern: PatternDef,
): boolean {
  const oriented = randomOrientation(pattern.cells);
  const patH = oriented.length;
  const patW = oriented[0]?.length ?? 0;
  const bufferedW = Math.ceil(patW * SPAWN_BUFFER_MULTIPLIER);
  const bufferedH = Math.ceil(patH * SPAWN_BUFFER_MULTIPLIER);
  const offsetC = Math.floor((bufferedW - patW) / 2);
  const offsetR = Math.floor((bufferedH - patH) / 2);

  for (let attempt = 0; attempt < SPAWN_MAX_ATTEMPTS; attempt++) {
    let col: number;
    let row: number;

    if (SPACESHIPS_SPAWN_FROM_EDGES && pattern.category === "spaceship") {
      [col, row] = randomEdgePosition(bufferedW, bufferedH, cols, rows);
    } else {
      col = Math.floor(Math.random() * (cols - bufferedW));
      row = Math.floor(Math.random() * (rows - bufferedH));
    }

    if (col < 0 || row < 0) continue;

    if (overlapsClockZone(col, row, bufferedW, bufferedH, cols, rows)) {
      continue;
    }

    if (!isAreaClear(grid, cols, rows, col, row, bufferedW, bufferedH)) {
      continue;
    }

    placePattern(grid, cols, rows, oriented, col + offsetC, row + offsetR);
    return true;
  }

  return false;
}

function randomSpawnInterval(): number {
  return SPAWN_INTERVAL_MIN_MS + Math.random() * (SPAWN_INTERVAL_MAX_MS - SPAWN_INTERVAL_MIN_MS);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GameOfLife() {
  const gridRef = useRef<Uint8Array>(new Uint8Array(0));
  const nextGridRef = useRef<Uint8Array>(new Uint8Array(0));
  const colsRef = useRef(0);
  const rowsRef = useRef(0);
  const lastGenTimeRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const nextSpawnDelayRef = useRef(randomSpawnInterval());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, background } = useClockColors();
  const colorsRef = useRef({ foreground, background });
  colorsRef.current = { foreground, background };

  const canvasRef = useCanvasAnimation({
    onResize(width, height) {
      const cols = Math.ceil(width / CELL_SIZE_PX);
      const rows = Math.ceil(height / CELL_SIZE_PX);
      colsRef.current = cols;
      rowsRef.current = rows;

      // Start with empty grid
      gridRef.current = new Uint8Array(cols * rows);
      nextGridRef.current = new Uint8Array(cols * rows);

      // Spawn initial batch of patterns
      for (let i = 0; i < INITIAL_SPAWN_COUNT; i++) {
        const pattern = pickWeightedPattern();
        trySpawnPattern(gridRef.current, cols, rows, pattern);
      }

      lastSpawnTimeRef.current = 0;
      nextSpawnDelayRef.current = randomSpawnInterval();
    },
    draw(ctx, canvas, timestamp) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const cols = colsRef.current;
      const rows = rowsRef.current;
      const { foreground: fg, background: bg } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Step simulation
      if (timestamp - lastGenTimeRef.current >= GENERATION_INTERVAL_MS) {
        lastGenTimeRef.current = timestamp;
        stepGrid(gridRef.current, nextGridRef.current, cols, rows);

        const tmp = gridRef.current;
        gridRef.current = nextGridRef.current;
        nextGridRef.current = tmp;
      }

      // Periodic pattern spawning
      if (lastSpawnTimeRef.current === 0) {
        lastSpawnTimeRef.current = timestamp;
      }
      if (timestamp - lastSpawnTimeRef.current >= nextSpawnDelayRef.current) {
        lastSpawnTimeRef.current = timestamp;
        nextSpawnDelayRef.current = randomSpawnInterval();
        const pattern = pickWeightedPattern();
        trySpawnPattern(gridRef.current, cols, rows, pattern);
      }

      // Draw
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
          style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 100 }}
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
          style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 300 }}
        >
          {dateStr}
        </div>
      </div>
    </div>
  );
}
