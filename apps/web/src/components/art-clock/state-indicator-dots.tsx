import { CLOCK_STATE_COUNT } from "@/stores/navigation-store";

const DOT_INDICES = Array.from({ length: CLOCK_STATE_COUNT }, (_, i) => i);
const CONTROLS_FADE_DURATION_MS = 300;

interface StateIndicatorDotsProps {
  count: number;
  activeIndex: number;
  onDotClick?: (index: number) => void;
  visible?: boolean;
}

export function StateIndicatorDots({
  count,
  activeIndex,
  onDotClick,
  visible = true,
}: StateIndicatorDotsProps) {
  const dots = DOT_INDICES.slice(0, count);
  return (
    <div
      className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${CONTROLS_FADE_DURATION_MS}ms ease`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {dots.map((dotIndex) => (
        <button
          key={dotIndex}
          type="button"
          data-testid={`state-dot-${dotIndex}`}
          className="h-px w-3 bg-white p-0 border-0 cursor-pointer"
          style={{ opacity: dotIndex === activeIndex ? 1 : 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
            onDotClick?.(dotIndex);
          }}
        />
      ))}
    </div>
  );
}
