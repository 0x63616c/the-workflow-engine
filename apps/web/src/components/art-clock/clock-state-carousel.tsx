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
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 80;
const VELOCITY_THRESHOLD_PX_S = 300;
const SPRING_CONFIG = { stiffness: 400, damping: 40, mass: 1 } as const;

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

interface TransitionState {
  from: number;
  to: number;
  direction: 1 | -1;
}

export function ClockStateCarousel() {
  const clockStateIndex = useNavigationStore((s) => s.clockStateIndex);
  const setClockStateIndex = useNavigationStore((s) => s.setClockStateIndex);
  const dragX = useMotionValue(0);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const screenWidthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => {
      screenWidthRef.current = window.innerWidth;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const outgoingX = useTransform(dragX, (v: number) => v);
  const incomingX = useTransform(dragX, (v: number) => {
    if (!transition) return screenWidthRef.current;
    return v + transition.direction * screenWidthRef.current;
  });

  const commitTransition = useCallback(
    (newIndex: number, direction: 1 | -1) => {
      setTransition({ from: clockStateIndex, to: newIndex, direction });
      animate(dragX, -direction * screenWidthRef.current, {
        ...SPRING_CONFIG,
        onComplete: () => {
          setClockStateIndex(newIndex);
          dragX.set(0);
          setTransition(null);
        },
      });
    },
    [clockStateIndex, setClockStateIndex, dragX],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { velocity: { x: number }; offset: { x: number } }) => {
      const dx = info.offset.x;
      const vx = info.velocity.x;
      const canGoNext = clockStateIndex < CLOCK_STATE_COUNT - 1;
      const canGoPrev = clockStateIndex > 0;

      if ((dx < -DRAG_THRESHOLD_PX || vx < -VELOCITY_THRESHOLD_PX_S) && canGoNext) {
        commitTransition(clockStateIndex + 1, 1);
      } else if ((dx > DRAG_THRESHOLD_PX || vx > VELOCITY_THRESHOLD_PX_S) && canGoPrev) {
        commitTransition(clockStateIndex - 1, -1);
      } else {
        animate(dragX, 0, SPRING_CONFIG);
      }
    },
    [clockStateIndex, commitTransition, dragX],
  );

  const ActiveState = CLOCK_STATES[clockStateIndex] ?? CLOCK_STATES[0];
  const ExitingState = transition ? (CLOCK_STATES[transition.from] ?? CLOCK_STATES[0]) : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        drag="x"
        dragMomentum={false}
        onPointerDown={(e) => e.stopPropagation()}
        onDragEnd={handleDragEnd}
        style={{ x: 0 }}
      >
        {ExitingState && (
          <motion.div className="absolute inset-0" style={{ x: outgoingX }}>
            <ExitingState />
          </motion.div>
        )}
        <motion.div className="absolute inset-0" style={{ x: transition ? incomingX : 0 }}>
          <ActiveState />
        </motion.div>
      </motion.div>

      <StateIndicatorDots count={CLOCK_STATE_COUNT} activeIndex={clockStateIndex} />
    </div>
  );
}
