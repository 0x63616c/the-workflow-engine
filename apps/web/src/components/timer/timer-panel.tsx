import { TimerControls } from "@/components/timer/timer-controls";
import { TimerFlash } from "@/components/timer/timer-flash";
import { TimerRing } from "@/components/timer/timer-ring";
import { useTimer } from "@/hooks/use-timer";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

const PRESETS = [
  { label: "1m", minutes: 1 },
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
  { label: "15m", minutes: 15 },
];

export function TimerPanel() {
  const contractCard = useCardExpansionStore((s) => s.contractCard);
  const { status, remaining_MS, duration_MS, start, pause, resume, reset } = useTimer();

  const [localMinutes, setLocalMinutes] = useState(0);
  const [localSeconds, setLocalSeconds] = useState(0);

  const showCustomInput = status === "idle" || status === "done";
  const startDisabled = localMinutes === 0 && localSeconds === 0;

  function handleStart() {
    start((localMinutes * 60 + localSeconds) * 1_000);
  }

  function handlePreset(minutes: number) {
    start(minutes * 60_000);
  }

  return (
    <div className="relative h-full bg-background flex flex-col px-8 pt-6 pb-8">
      <TimerFlash active={status === "done"} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          aria-label="Back"
          onClick={() => contractCard()}
          className="text-white/60 active:text-white"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-sm text-muted-foreground">Timer</span>
        <div className="w-6" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        <TimerRing
          remaining_MS={remaining_MS}
          duration_MS={duration_MS}
          status={status}
          className="w-72 h-72"
        />

        {/* Presets */}
        <div className="flex gap-3">
          {PRESETS.map(({ label, minutes }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => handlePreset(minutes)}
              className="px-5 py-2 rounded-full bg-white/10 text-white text-sm active:scale-95 transition-transform"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom time input */}
        {showCustomInput && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={localMinutes}
              onChange={(e) => setLocalMinutes(Math.min(99, Math.max(0, Number(e.target.value))))}
              className="w-16 bg-transparent text-white text-3xl font-[200] text-center tabular-nums border-b border-white/20 focus:outline-none focus:border-white/60"
            />
            <span className="text-white/60 text-3xl font-[200]">:</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={localSeconds}
              onChange={(e) => setLocalSeconds(Math.min(59, Math.max(0, Number(e.target.value))))}
              className="w-16 bg-transparent text-white text-3xl font-[200] text-center tabular-nums border-b border-white/20 focus:outline-none focus:border-white/60"
            />
          </div>
        )}

        <TimerControls
          status={status}
          remaining_MS={remaining_MS}
          onStart={handleStart}
          onPause={pause}
          onResume={resume}
          onReset={reset}
          startDisabled={startDisabled}
        />
      </div>
    </div>
  );
}
