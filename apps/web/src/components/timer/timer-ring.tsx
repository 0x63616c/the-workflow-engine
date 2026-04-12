import type { TimerStatus } from "@/stores/timer-store";

interface TimerRingProps {
  remaining_MS: number;
  duration_MS: number;
  status: TimerStatus;
  className?: string;
}

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatRingCountdown(remaining_MS: number, status: TimerStatus): string {
  if (status === "idle") return "--:--";
  if (status === "done") return "0:00";
  const totalSeconds = Math.ceil(remaining_MS / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getRingColor(status: TimerStatus): string {
  if (status === "done") return "rgb(239 68 68)";
  if (status === "paused") return "rgba(255,255,255,0.4)";
  return "white";
}

export function TimerRing({
  remaining_MS,
  duration_MS,
  status,
  className = "w-64 h-64",
}: TimerRingProps) {
  const progress = duration_MS > 0 ? remaining_MS / duration_MS : 1;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const ringColor = getRingColor(status);
  const displayText = formatRingCountdown(remaining_MS, status);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        role="img"
        aria-label="Timer progress ring"
      >
        {/* Background track */}
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90, 100, 100)"
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.2s ease" }}
        />
      </svg>
      {/* Countdown digits centered over ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-4xl font-[200] tabular-nums"
          style={{ color: status === "done" ? "rgb(239 68 68)" : "white" }}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
}
