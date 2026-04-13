import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { canvasLogicalSize } from "@/components/art-clock/states/canvas-utils";
import { useCanvasAnimation } from "@/hooks/use-canvas-animation";
import { useClockColors } from "@/hooks/use-clock-colors";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useRef } from "react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const CALM_ACTIVE_PERIOD_S = 20;

export function WaveformPulse() {
  const startTimeRef = useRef<number>(Date.now());
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);
  const { background, foregroundAlpha } = useClockColors();
  const colorsRef = useRef({ background, foregroundAlpha });
  colorsRef.current = { background, foregroundAlpha };

  const canvasRef = useCanvasAnimation({
    draw(ctx, canvas) {
      const { width: w, height: h } = canvasLogicalSize(canvas);
      const dpr = window.devicePixelRatio;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const { background: bg, foregroundAlpha: fgAlpha } = colorsRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Use background color with alpha for the trailing fade effect
      ctx.fillStyle = bg;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      const amplitude =
        0.04 * h * (0.5 + 0.5 * Math.sin((elapsed / CALM_ACTIVE_PERIOD_S) * 2 * Math.PI));

      ctx.beginPath();
      ctx.strokeStyle = fgAlpha(0.9);
      ctx.lineWidth = 1;

      for (let x = 0; x <= w; x++) {
        const y =
          h / 2 +
          amplitude * Math.sin((x / w) * 2 * Math.PI * 2 + elapsed * 1.2) +
          amplitude * 0.5 * Math.sin((x / w) * 2 * Math.PI * 3.7 + elapsed * 2.1) +
          amplitude * 0.25 * Math.sin((x / w) * 2 * Math.PI * 6.3 + elapsed * 3.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
  });

  return (
    <div className="absolute inset-0 bg-background">
      <canvas ref={canvasRef} data-testid="waveform-canvas" className="absolute inset-0" />
      <div
        data-testid="waveform-time-overlay"
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
        <div className="mt-4 text-base tracking-widest" style={{ fontWeight: 300 }}>
          {dateStr}
        </div>
      </div>
    </div>
  );
}
