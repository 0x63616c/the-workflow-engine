/**
 * Curated Conway's Game of Life pattern library.
 *
 * All patterns sourced from conwaylife.appspot.com pattern library.
 * RLE notation: b = dead, o = alive, $ = end of row, ! = end of pattern.
 * Numbers prefix = repetition count.
 *
 * Patterns are stored as 2D boolean grids (row-major) decoded from RLE at module load.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternCategory = "spaceship" | "oscillator" | "methuselah" | "gun";

export interface PatternDef {
  /** Human-readable name */
  name: string;
  /** Category determines spawn behavior (edge vs anywhere, weight) */
  category: PatternCategory;
  /** Decoded cells: grid[row][col] = true means alive */
  cells: boolean[][];
  /** Width of the pattern (cols) */
  width: number;
  /** Height of the pattern (rows) */
  height: number;
  /**
   * Relative spawn weight (higher = more likely to be picked).
   * Weights are relative within the full pool.
   */
  weight: number;
}

// ---------------------------------------------------------------------------
// RLE decoder
// ---------------------------------------------------------------------------

function decodeRLE(rle: string): boolean[][] {
  const rows: boolean[][] = [];
  let currentRow: boolean[] = [];
  let count = "";

  for (const ch of rle) {
    if (ch >= "0" && ch <= "9") {
      count += ch;
      continue;
    }

    const n = count === "" ? 1 : Number.parseInt(count, 10);
    count = "";

    if (ch === "b") {
      for (let i = 0; i < n; i++) currentRow.push(false);
    } else if (ch === "o") {
      for (let i = 0; i < n; i++) currentRow.push(true);
    } else if (ch === "$") {
      rows.push(currentRow);
      // RLE $ can repeat (2$ = two row breaks, meaning one empty row between)
      for (let i = 1; i < n; i++) rows.push([]);
      currentRow = [];
    } else if (ch === "!") {
      break;
    }
  }

  // Push final row if it has cells
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Normalize: ensure all rows have the same width (max width)
  const maxWidth = Math.max(...rows.map((r) => r.length));
  for (const row of rows) {
    while (row.length < maxWidth) {
      row.push(false);
    }
  }

  return rows;
}

function definePattern(
  name: string,
  category: PatternCategory,
  rle: string,
  weight: number,
): PatternDef {
  const cells = decodeRLE(rle);
  return {
    name,
    category,
    cells,
    width: cells[0]?.length ?? 0,
    height: cells.length,
    weight,
  };
}

// ---------------------------------------------------------------------------
// Pattern definitions
// Source: https://conwaylife.appspot.com/pattern/{name}
// ---------------------------------------------------------------------------

export const PATTERNS: PatternDef[] = [
  // -- Spaceships (travel across the grid) ----------------------------------

  // Glider: 3x3, c/4 diagonal, the most common spaceship
  definePattern("glider", "spaceship", "bob$2bo$3o!", 10),

  // Lightweight spaceship (LWSS): 5x4, c/2 orthogonal
  definePattern("lwss", "spaceship", "bo2bo$o4b$o3bo$4o!", 6),

  // Middleweight spaceship (MWSS): 6x5, c/2 orthogonal
  definePattern("mwss", "spaceship", "3bo2b$bo3bo$o5b$o4bo$5o!", 4),

  // Heavyweight spaceship (HWSS): 7x5, c/2 orthogonal
  definePattern("hwss", "spaceship", "3b2o2b$bo4bo$o6b$o5bo$6o!", 3),

  // -- Oscillators (pulse in place) -----------------------------------------

  // Blinker: 3x1, period 2, the most common oscillator
  definePattern("blinker", "oscillator", "3o!", 8),

  // Toad: 4x2, period 2, second most common oscillator
  definePattern("toad", "oscillator", "b3o$3o!", 6),

  // Beacon: 4x4, period 2, third most common oscillator
  definePattern("beacon", "oscillator", "2o2b$o3b$3bo$2b2o!", 6),

  // Pulsar: 13x13, period 3, fourth most common oscillator
  definePattern(
    "pulsar",
    "oscillator",
    "2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!",
    3,
  ),

  // Pentadecathlon: 10x3, period 15, most common oscillator of period > 3
  definePattern("pentadecathlon", "oscillator", "2bo4bo2b$2ob4ob2o$2bo4bo!", 4),

  // -- Methuselahs (small patterns that explode into long-lived chaos) ------

  // R-pentomino: 3x3, stabilizes after 1103 generations
  definePattern("r-pentomino", "methuselah", "b2o$2ob$bo!", 2),

  // Acorn: 7x3, stabilizes after 5206 generations, produces 13 gliders
  definePattern("acorn", "methuselah", "bo5b$3bo3b$2o2b3o!", 1),

  // -- Guns (produce gliders endlessly) -------------------------------------

  // Gosper glider gun: 36x9, period 30, first known gun
  definePattern(
    "gosper-gun",
    "gun",
    "24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!",
    1,
  ),
];

// ---------------------------------------------------------------------------
// Rotation / reflection utilities
// ---------------------------------------------------------------------------

/** Rotate a pattern 90 degrees clockwise */
export function rotateCW(cells: boolean[][]): boolean[][] {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const result: boolean[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: boolean[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(cells[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

/** Reflect a pattern horizontally (mirror left-right) */
export function reflectH(cells: boolean[][]): boolean[][] {
  return cells.map((row) => [...row].reverse());
}

/**
 * Apply a random orientation to a pattern.
 * Returns a new cells grid rotated 0/90/180/270 and optionally reflected.
 */
export function randomOrientation(cells: boolean[][]): boolean[][] {
  const rotations = Math.floor(Math.random() * 4);
  let result = cells;
  for (let i = 0; i < rotations; i++) {
    result = rotateCW(result);
  }
  if (Math.random() < 0.5) {
    result = reflectH(result);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Weighted random selection
// ---------------------------------------------------------------------------

export function pickWeightedPattern(): PatternDef {
  const totalWeight = PATTERNS.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const pattern of PATTERNS) {
    roll -= pattern.weight;
    if (roll <= 0) return pattern;
  }
  return PATTERNS[PATTERNS.length - 1];
}
