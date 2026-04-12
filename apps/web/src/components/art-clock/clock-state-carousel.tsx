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
import { Component, type ErrorInfo, type ReactNode, useCallback } from "react";

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

interface ClockStateBoundaryProps {
  children: ReactNode;
  stateIndex: number;
}

interface ClockStateBoundaryState {
  hasError: boolean;
}

class ClockStateBoundary extends Component<ClockStateBoundaryProps, ClockStateBoundaryState> {
  state: ClockStateBoundaryState = { hasError: false };

  static getDerivedStateFromError(): Partial<ClockStateBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ClockState ${this.props.stateIndex}] crashed:`, error, info.componentStack);
  }

  componentDidUpdate(prevProps: ClockStateBoundaryProps) {
    if (prevProps.stateIndex !== this.props.stateIndex) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <p className="text-white/40 text-sm">This clock state failed to load</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const CONTROLS_FADE_DURATION_MS = 300;

interface ClockStateCarouselProps {
  controlsVisible?: boolean;
}

export function ClockStateCarousel({ controlsVisible = true }: ClockStateCarouselProps) {
  const clockStateIndex = useNavigationStore((s) => s.clockStateIndex);
  const setClockStateIndex = useNavigationStore((s) => s.setClockStateIndex);

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setClockStateIndex((clockStateIndex + 1) % CLOCK_STATE_COUNT);
    },
    [clockStateIndex, setClockStateIndex],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setClockStateIndex((clockStateIndex - 1 + CLOCK_STATE_COUNT) % CLOCK_STATE_COUNT);
    },
    [clockStateIndex, setClockStateIndex],
  );

  const controlStyle = {
    opacity: controlsVisible ? 1 : 0,
    transition: `opacity ${CONTROLS_FADE_DURATION_MS}ms ease`,
    pointerEvents: (controlsVisible ? "auto" : "none") as React.CSSProperties["pointerEvents"],
  };

  const ActiveState = CLOCK_STATES[clockStateIndex] ?? CLOCK_STATES[0];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <ClockStateBoundary stateIndex={clockStateIndex}>
        <ActiveState />
      </ClockStateBoundary>

      <button
        type="button"
        data-testid="clock-prev"
        onClick={goPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        style={controlStyle}
      >
        <ChevronLeft className="w-6 h-6 text-white/60" />
      </button>

      <button
        type="button"
        data-testid="clock-next"
        onClick={goNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        style={controlStyle}
      >
        <ChevronRight className="w-6 h-6 text-white/60" />
      </button>

      <StateIndicatorDots
        count={CLOCK_STATE_COUNT}
        activeIndex={clockStateIndex}
        onDotClick={setClockStateIndex}
        visible={controlsVisible}
      />
    </div>
  );
}
