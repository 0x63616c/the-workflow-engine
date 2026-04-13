import {
  PATTERNS,
  type PatternDef,
  pickWeightedPattern,
  randomOrientation,
  reflectH,
  rotateCW,
} from "@/components/art-clock/states/game-of-life-patterns";

import { describe, expect, it } from "vitest";

/** Find a pattern by name, throwing if not found (avoids non-null assertions). */
function getPattern(name: string): PatternDef {
  const p = PATTERNS.find((pat) => pat.name === name);
  if (!p) throw new Error(`Pattern "${name}" not found in PATTERNS`);
  return p;
}

describe("game-of-life-patterns", () => {
  describe("pattern definitions", () => {
    it("has at least 10 patterns", () => {
      expect(PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it("every pattern has non-zero dimensions", () => {
      for (const p of PATTERNS) {
        expect(p.width, `${p.name} width`).toBeGreaterThan(0);
        expect(p.height, `${p.name} height`).toBeGreaterThan(0);
      }
    });

    it("every pattern has at least one live cell", () => {
      for (const p of PATTERNS) {
        const hasLiveCell = p.cells.some((row) => row.some((cell) => cell));
        expect(hasLiveCell, `${p.name} has no live cells`).toBe(true);
      }
    });

    it("every pattern has consistent row lengths", () => {
      for (const p of PATTERNS) {
        for (let r = 0; r < p.cells.length; r++) {
          expect(p.cells[r].length, `${p.name} row ${r} width`).toBe(p.width);
        }
      }
    });

    it("every pattern has positive weight", () => {
      for (const p of PATTERNS) {
        expect(p.weight, `${p.name} weight`).toBeGreaterThan(0);
      }
    });

    it("includes all expected categories", () => {
      const categories = new Set(PATTERNS.map((p) => p.category));
      expect(categories.has("spaceship")).toBe(true);
      expect(categories.has("oscillator")).toBe(true);
      expect(categories.has("methuselah")).toBe(true);
      expect(categories.has("gun")).toBe(true);
    });

    it.each([
      ["glider", 3, 3],
      ["lwss", 5, 4],
      ["mwss", 6, 5],
      ["hwss", 7, 5],
      ["blinker", 3, 1],
      ["toad", 4, 2],
      ["beacon", 4, 4],
      ["pulsar", 13, 13],
      ["pentadecathlon", 10, 3],
      ["r-pentomino", 3, 3],
      ["acorn", 7, 3],
      ["gosper-gun", 36, 9],
    ])("%s has expected dimensions %ix%i", (name, expectedWidth, expectedHeight) => {
      const pattern = getPattern(name as string);
      expect(pattern.width).toBe(expectedWidth);
      expect(pattern.height).toBe(expectedHeight);
    });

    // Verify specific known patterns by checking live cell count
    it("glider has exactly 5 live cells", () => {
      const glider = getPattern("glider");
      const count = glider.cells.flat().filter(Boolean).length;
      expect(count).toBe(5);
    });

    it("blinker has exactly 3 live cells", () => {
      const blinker = getPattern("blinker");
      const count = blinker.cells.flat().filter(Boolean).length;
      expect(count).toBe(3);
    });

    it("r-pentomino has exactly 5 live cells", () => {
      const rp = getPattern("r-pentomino");
      const count = rp.cells.flat().filter(Boolean).length;
      expect(count).toBe(5);
    });

    it("gosper-gun has exactly 36 live cells", () => {
      const gun = getPattern("gosper-gun");
      const count = gun.cells.flat().filter(Boolean).length;
      expect(count).toBe(36);
    });
  });

  describe("rotateCW", () => {
    it("rotates a 3x2 grid 90 degrees clockwise", () => {
      const input = [
        [true, false, true],
        [false, true, false],
      ];
      const result = rotateCW(input);
      expect(result).toEqual([
        [false, true],
        [true, false],
        [false, true],
      ]);
    });

    it("four rotations returns to original", () => {
      const glider = getPattern("glider");
      let cells = glider.cells;
      for (let i = 0; i < 4; i++) {
        cells = rotateCW(cells);
      }
      expect(cells).toEqual(glider.cells);
    });
  });

  describe("reflectH", () => {
    it("mirrors cells horizontally", () => {
      const input = [
        [true, false, false],
        [false, false, true],
      ];
      const result = reflectH(input);
      expect(result).toEqual([
        [false, false, true],
        [true, false, false],
      ]);
    });

    it("double reflection returns to original", () => {
      const glider = getPattern("glider");
      const result = reflectH(reflectH(glider.cells));
      expect(result).toEqual(glider.cells);
    });
  });

  describe("randomOrientation", () => {
    it("preserves live cell count", () => {
      const glider = getPattern("glider");
      const originalCount = glider.cells.flat().filter(Boolean).length;
      // Run many times to exercise different orientations
      for (let i = 0; i < 20; i++) {
        const oriented = randomOrientation(glider.cells);
        const count = oriented.flat().filter(Boolean).length;
        expect(count).toBe(originalCount);
      }
    });

    it("returns valid rectangular grid", () => {
      const pulsar = getPattern("pulsar");
      for (let i = 0; i < 10; i++) {
        const oriented = randomOrientation(pulsar.cells);
        expect(oriented.length).toBeGreaterThan(0);
        const width = oriented[0].length;
        for (const row of oriented) {
          expect(row.length).toBe(width);
        }
      }
    });
  });

  describe("pickWeightedPattern", () => {
    it("always returns a valid pattern", () => {
      for (let i = 0; i < 100; i++) {
        const pattern = pickWeightedPattern();
        expect(pattern).toBeDefined();
        expect(pattern.name).toBeTruthy();
        expect(PATTERNS).toContain(pattern);
      }
    });

    it("favors higher-weighted patterns over many samples", () => {
      const counts = new Map<string, number>();
      const iterations = 5000;
      for (let i = 0; i < iterations; i++) {
        const p = pickWeightedPattern();
        counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
      }
      // Glider (weight 10) should appear more than gosper-gun (weight 1)
      const gliderCount = counts.get("glider") ?? 0;
      const gunCount = counts.get("gosper-gun") ?? 0;
      expect(gliderCount).toBeGreaterThan(gunCount);
    });
  });

  describe("RLE decoding verification", () => {
    it("glider decodes to correct shape", () => {
      // .O.  / ..O / OOO
      const glider = getPattern("glider");
      expect(glider.cells).toEqual([
        [false, true, false],
        [false, false, true],
        [true, true, true],
      ]);
    });

    it("blinker decodes to three horizontal cells", () => {
      const blinker = getPattern("blinker");
      expect(blinker.cells).toEqual([[true, true, true]]);
    });

    it("toad decodes correctly", () => {
      // .OOO / OOO.
      const toad = getPattern("toad");
      expect(toad.cells).toEqual([
        [false, true, true, true],
        [true, true, true, false],
      ]);
    });

    it("beacon decodes correctly", () => {
      // OO.. / O... / ...O / ..OO
      const beacon = getPattern("beacon");
      expect(beacon.cells).toEqual([
        [true, true, false, false],
        [true, false, false, false],
        [false, false, false, true],
        [false, false, true, true],
      ]);
    });
  });
});
