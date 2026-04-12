import { ArtClock } from "@/components/art-clock/art-clock";
import { StateIndicatorDots } from "@/components/art-clock/state-indicator-dots";
import { BlackHole } from "@/components/art-clock/states/black-hole";
import { ConstellationMap } from "@/components/art-clock/states/constellation-map";
import { ParticleDrift } from "@/components/art-clock/states/particle-drift";
import { Pendulum } from "@/components/art-clock/states/pendulum";
import { Radar } from "@/components/art-clock/states/radar";
import { TopographicContours } from "@/components/art-clock/states/topographic-contours";
import { WaveformPulse } from "@/components/art-clock/states/waveform-pulse";
import { WireframeGlobe } from "@/components/art-clock/states/wireframe-globe";
import { CLOCK_STATE_COUNT, useNavigationStore } from "@/stores/navigation-store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";

type StateComponent = React.ComponentType;

const CLOCK_STATES: StateComponent[] = [
  ArtClock,
  WireframeGlobe,
  ConstellationMap,
  TopographicContours,
  Pendulum,
  WaveformPulse,
  ParticleDrift,
  BlackHole,
  Radar,
];

export function ClockStateCarousel() {
  const clockStateIndex = useNavigationStore((s) => s.clockStateIndex);
  const setClockStateIndex = useNavigationStore((s) => s.setClockStateIndex);

  const canGoPrev = clockStateIndex > 0;
  const canGoNext = clockStateIndex < CLOCK_STATE_COUNT - 1;

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canGoNext) setClockStateIndex(clockStateIndex + 1);
    },
    [clockStateIndex, canGoNext, setClockStateIndex],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canGoPrev) setClockStateIndex(clockStateIndex - 1);
    },
    [clockStateIndex, canGoPrev, setClockStateIndex],
  );

  const ActiveState = CLOCK_STATES[clockStateIndex] ?? CLOCK_STATES[0];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <ActiveState />

      {canGoPrev && (
        <button
          type="button"
          data-testid="clock-prev"
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white/60" />
        </button>
      )}

      {canGoNext && (
        <button
          type="button"
          data-testid="clock-next"
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white/60" />
        </button>
      )}

      <StateIndicatorDots
        count={CLOCK_STATE_COUNT}
        activeIndex={clockStateIndex}
        onDotClick={setClockStateIndex}
      />
    </div>
  );
}
