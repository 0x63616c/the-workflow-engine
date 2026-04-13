import type { TimerStatus } from "@/stores/timer-store";

interface TimerControlsProps {
  status: TimerStatus;
  remaining_MS: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  startDisabled: boolean;
}

export function TimerControls({
  status,
  onStart,
  onPause,
  onResume,
  onReset,
  startDisabled,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      {status === "idle" && (
        <button
          type="button"
          aria-label="Start timer"
          disabled={startDisabled}
          onClick={onStart}
          className="px-8 py-3 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          Start
        </button>
      )}

      {status === "running" && (
        <>
          <button
            type="button"
            aria-label="Pause timer"
            onClick={onPause}
            className="px-8 py-3 rounded-full bg-foreground/10 text-foreground text-sm font-medium active:scale-95 transition-transform"
          >
            Pause
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            onClick={onReset}
            className="px-6 py-3 rounded-full text-foreground/40 text-sm active:scale-95 transition-transform"
          >
            Reset
          </button>
        </>
      )}

      {status === "paused" && (
        <>
          <button
            type="button"
            aria-label="Resume timer"
            onClick={onResume}
            className="px-8 py-3 rounded-full bg-foreground/10 text-foreground text-sm font-medium active:scale-95 transition-transform"
          >
            Resume
          </button>
          <button
            type="button"
            aria-label="Reset timer"
            onClick={onReset}
            className="px-6 py-3 rounded-full text-foreground/40 text-sm active:scale-95 transition-transform"
          >
            Reset
          </button>
        </>
      )}

      {status === "done" && (
        <button
          type="button"
          aria-label="Reset timer"
          onClick={onReset}
          className="px-8 py-3 rounded-full bg-foreground/10 text-foreground text-sm font-medium active:scale-95 transition-transform"
        >
          Reset
        </button>
      )}
    </div>
  );
}
