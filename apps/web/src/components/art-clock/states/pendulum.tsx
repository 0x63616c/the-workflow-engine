import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const PERIOD_S = 4;
const BREATHE_PERIOD_S = 180;
const A_MIN = 0.15;
const A_MAX = 0.45;
const TRAIL_LENGTH = 7;
const TRAIL_OPACITIES = [0.08, 0.12, 0.18, 0.26, 0.36, 0.5, 1.0];

export function Pendulum() {
  const startTimeRef = useRef<number>(Date.now());
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ foregroundAlpha });
  colorsRef.current = { foregroundAlpha };

  const canvasRef = useCanvasAnimation({
    draw(ctx, canvas) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const { foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const amplitude =
        A_MIN + (A_MAX - A_MIN) * 0.5 * (1 + Math.sin((elapsed / BREATHE_PERIOD_S) * 2 * Math.PI));
      const angle = amplitude * Math.cos((elapsed / PERIOD_S) * 2 * Math.PI);

      const pivotX = w / 2;
      const length = h * 0.85;
      const bobX = pivotX + length * Math.sin(angle);
      const bobY = length * Math.cos(angle);

      trailRef.current.push({ x: bobX, y: bobY });
      if (trailRef.current.length > TRAIL_LENGTH) {
        trailRef.current.shift();
      }

      for (let i = 0; i < trailRef.current.length; i++) {
        const pos = trailRef.current[i];
        const opacity = TRAIL_OPACITIES[i + (TRAIL_LENGTH - trailRef.current.length)];
        ctx.beginPath();
        ctx.moveTo(pivotX, 0);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = fgAlpha(opacity);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="pendulum-canvas" className="absolute inset-0" />
      <div
        data-testid="pendulum-time-overlay"
        className="absolute top-6 left-0 right-0 flex flex-col items-center text-foreground"
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
        <div className="mt-1 text-base tracking-widest" style={{ fontWeight: 300 }}>
          {dateStr}
        </div>
      </div>
    </div>
  );
}
