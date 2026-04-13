import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useEffect, useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const CELL = 4;
const GRID = 8;

// 5x7 pixel bitmap font — each digit is 5 columns × 7 rows
const DIGITS: Record<string, number[][]> = {
  "0": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "1": [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  "2": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  "3": [
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  "4": [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  "5": [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  "6": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "7": [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
  ],
  "8": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  "9": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  ":": [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  A: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  M: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  P: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  // extra letters for date
  S: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  U: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  N: [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  T: [
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  H: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  W: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 0, 0, 1],
  ],
  E: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  D: [
    [1, 1, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 0, 0],
  ],
  F: [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  R: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  I: [
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  O: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  V: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  G: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  J: [
    [0, 0, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 0, 0],
  ],
  L: [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  B: [
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  C: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  Y: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  " ": [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
};

function charWidth(ch: string): number {
  const glyph = DIGITS[ch];
  if (!glyph) return 3;
  return glyph[0].length;
}

function drawChar(
  ctx: CanvasRenderingContext2D,
  ch: string,
  px: number,
  py: number,
  cellSize: number,
) {
  const glyph = DIGITS[ch];
  if (!glyph) return;
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (glyph[row][col]) {
        ctx.fillRect(
          Math.round(px + col * cellSize),
          Math.round(py + row * cellSize),
          cellSize,
          cellSize,
        );
      }
    }
  }
}

function measureText(text: string, cellSize: number): number {
  let total = 0;
  for (const ch of text) {
    total += (charWidth(ch) + 1) * cellSize;
  }
  return total;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  px: number,
  py: number,
  cellSize: number,
) {
  let x = px;
  for (const ch of text) {
    drawChar(ctx, ch, x, py, cellSize);
    x += (charWidth(ch) + 1) * cellSize;
  }
}

interface Building {
  x: number;
  width: number;
  height: number;
  windowRows: number;
  windowCols: number;
  windowPhase: number;
}

function generateBuildings(seed: number, count: number, maxH: number, maxW: number): Building[] {
  const rng = (n: number) => {
    const x = Math.sin(n + seed) * 43758.5453123;
    return x - Math.floor(x);
  };

  const buildings: Building[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const w = Math.round((GRID + rng(i * 3) * GRID * 3) / GRID) * GRID;
    const h = Math.round((GRID * 2 + rng(i * 3 + 1) * maxH) / GRID) * GRID;
    buildings.push({
      x,
      width: w,
      height: h,
      windowRows: Math.max(1, Math.floor(h / GRID) - 1),
      windowCols: Math.max(1, Math.floor(w / GRID) - 1),
      windowPhase: rng(i * 3 + 2) * 10,
    });
    x += w + GRID;
  }

  // store total span
  const totalSpan = x;
  for (const b of buildings) {
    (b as Building & { span: number }).span = totalSpan;
  }
  return buildings;
}

interface Star {
  gx: number;
  gy: number;
  phase: number;
}

function generateStars(count: number, gw: number, gh: number, seed: number): Star[] {
  const rng = (n: number) => {
    const x = Math.sin(n + seed + 99) * 43758.5453123;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    gx: Math.floor(rng(i * 2) * gw),
    gy: Math.floor(rng(i * 2 + 1) * gh),
    phase: rng(i * 2 + 2) * 10,
  }));
}

export function PixelArt() {
  const startTimeRef = useRef<number>(Date.now());
  const bgBuildingsRef = useRef<Building[]>([]);
  const fgBuildingsRef = useRef<Building[]>([]);
  const starsRef = useRef<Star[]>([]);
  const timeRef = useRef({ hours: "12", minutes: "00", period: "AM", dateStr: "" });
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foreground, background } = useClockColors();
  const colorsRef = useRef({ foreground, background });
  colorsRef.current = { foreground, background };

  useEffect(() => {
    timeRef.current = { hours, minutes, period, dateStr };
  }, [hours, minutes, period, dateStr]);

  const canvasRef = useCanvasAnimation({
    onResize(width, height) {
      const gw = Math.ceil(width / GRID);
      const gh = Math.ceil(height / GRID);
      const bgMaxH = gh * 0.4 * GRID;
      const fgMaxH = gh * 0.55 * GRID;

      bgBuildingsRef.current = generateBuildings(1, 40, bgMaxH, width);
      fgBuildingsRef.current = generateBuildings(7, 25, fgMaxH, width);
      starsRef.current = generateStars(80, gw, Math.floor(gh * 0.45), 42);
    },
    draw(ctx, canvas) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const { foreground: fg, background: bg } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // Background
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars — twinkle by toggling on slow sine
      ctx.fillStyle = fg;
      for (const star of starsRef.current) {
        const on = Math.sin(elapsed * 0.7 + star.phase) > 0.3;
        if (on) {
          ctx.fillRect(star.gx * GRID, star.gy * GRID, CELL, CELL);
        }
      }

      // Moon — drifts slowly left to right across the sky
      const moonCycleS = 120;
      const moonT = (elapsed % moonCycleS) / moonCycleS;
      const moonX = Math.round((moonT * (w + 48)) / GRID) * GRID - 24;
      const moonY = Math.round((h * 0.1) / GRID) * GRID;
      const moonR = GRID * 3;
      // Draw moon as filled circle of CELL-sized pixels
      for (let dy = -moonR; dy <= moonR; dy += CELL) {
        for (let dx = -moonR; dx <= moonR; dx += CELL) {
          if (dx * dx + dy * dy <= moonR * moonR) {
            ctx.fillRect(moonX + dx, moonY + dy, CELL, CELL);
          }
        }
      }

      // Background buildings (slow scroll)
      const bgScrollPx =
        (elapsed * 12) %
        (bgBuildingsRef.current[bgBuildingsRef.current.length - 1]?.x +
          (bgBuildingsRef.current[bgBuildingsRef.current.length - 1]?.width ?? 0) +
          GRID || w);
      ctx.fillStyle = fg;
      const bgSpan = bgBuildingsRef.current.reduce(
        (acc, b) => Math.max(acc, b.x + b.width + GRID),
        0,
      );
      for (const b of bgBuildingsRef.current) {
        for (let rep = -1; rep <= 1; rep++) {
          const bx = Math.round((b.x - bgScrollPx + rep * bgSpan) / GRID) * GRID;
          const by = h - b.height;
          if (bx + b.width < 0 || bx > w) continue;
          ctx.fillRect(bx, by, b.width, b.height);
          // Carve windows out (background color)
          ctx.fillStyle = bg;
          const ww = GRID - 2;
          const wh = GRID - 2;
          for (let row = 0; row < b.windowRows; row++) {
            for (let col = 0; col < b.windowCols; col++) {
              const wx = bx + GRID / 2 + col * GRID;
              const wy = by + GRID / 2 + row * GRID;
              // Window on/off blink
              const blinkOn = Math.sin(elapsed * 0.3 + b.windowPhase + row * 1.1 + col * 0.7) > 0;
              if (blinkOn) {
                ctx.fillRect(Math.round(wx), Math.round(wy), ww, wh);
              }
            }
          }
          ctx.fillStyle = fg;
        }
      }

      // Foreground buildings (faster scroll)
      const fgSpan = fgBuildingsRef.current.reduce(
        (acc, b) => Math.max(acc, b.x + b.width + GRID),
        0,
      );
      const fgScrollPx = (elapsed * 28) % fgSpan;
      for (const b of fgBuildingsRef.current) {
        for (let rep = -1; rep <= 1; rep++) {
          const bx = Math.round((b.x - fgScrollPx + rep * fgSpan) / GRID) * GRID;
          const by = h - b.height;
          if (bx + b.width < 0 || bx > w) continue;
          ctx.fillRect(bx, by, b.width, b.height);
          ctx.fillStyle = bg;
          const ww = GRID - 2;
          const wh = GRID - 2;
          for (let row = 0; row < b.windowRows; row++) {
            for (let col = 0; col < b.windowCols; col++) {
              const wx = bx + GRID / 2 + col * GRID;
              const wy = by + GRID / 2 + row * GRID;
              const blinkOn = Math.sin(elapsed * 0.4 + b.windowPhase + row * 0.9 + col * 1.3) > 0;
              if (blinkOn) {
                ctx.fillRect(Math.round(wx), Math.round(wy), ww, wh);
              }
            }
          }
          ctx.fillStyle = fg;
        }
      }

      // Time display — pixel font, centered horizontally, upper third
      const { hours: h2, minutes: m2, period: per, dateStr: ds } = timeRef.current;
      const timeStr = `${h2}:${m2}`;
      const timeCellSize = CELL * 3;
      const timeW = measureText(timeStr, timeCellSize);
      const periodW = measureText(per, timeCellSize);
      const totalW = timeW + timeCellSize * 2 + periodW;
      const timeX = Math.round((w - totalW) / (GRID * 3)) * (GRID * 3);
      const timeY = Math.round((h * 0.18) / (GRID * 3)) * (GRID * 3);

      ctx.fillStyle = fg;
      drawText(ctx, timeStr, timeX, timeY, timeCellSize);
      const periodX = timeX + timeW + timeCellSize * 2;
      const periodY = timeY + timeCellSize * 4; // baseline align — period sits lower
      drawText(ctx, per, periodX, periodY, Math.round(timeCellSize * 0.6));

      // Date display — smaller pixel font below time
      const dateCellSize = CELL;
      const dateW = measureText(ds, dateCellSize);
      const dateX = Math.round((w - dateW) / (GRID * 2)) * (GRID * 2);
      const dateY = timeY + 7 * timeCellSize + dateCellSize * 2;
      drawText(ctx, ds, dateX, dateY, dateCellSize);
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="pixel-art-canvas" className="absolute inset-0" />
      <div
        data-testid="pixel-art-time-overlay"
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
