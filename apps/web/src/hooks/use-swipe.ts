import { useEffect, useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number;
  enabled?: boolean;
}

const DEFAULT_THRESHOLD_PX = 50;

export function useSwipe(
  ref: React.RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  options: SwipeOptions = {},
) {
  const { threshold = DEFAULT_THRESHOLD_PX, enabled = true } = options;
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
    }

    function handleTouchEnd(e: TouchEvent) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX < threshold && absDeltaY < threshold) return;

      if (absDeltaX > absDeltaY) {
        if (deltaX > 0) handlers.onSwipeRight?.();
        else handlers.onSwipeLeft?.();
      } else {
        if (deltaY > 0) handlers.onSwipeDown?.();
        else handlers.onSwipeUp?.();
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, handlers, threshold, enabled]);
}
