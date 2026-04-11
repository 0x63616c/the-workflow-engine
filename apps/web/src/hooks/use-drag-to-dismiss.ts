import { useCallback, useEffect, useRef } from "react";

const DISMISS_THRESHOLD_RATIO = 0.3;

interface DragToDismissOptions {
  enabled?: boolean;
  onDismiss: () => void;
}

export function useDragToDismiss(
  ref: React.RefObject<HTMLElement | null>,
  options: DragToDismissOptions,
) {
  const { enabled = true, onDismiss } = options;
  const startX = useRef(0);
  const isDragging = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const resetTransform = useCallback((el: HTMLElement) => {
    el.style.transition = "transform 300ms ease-out";
    el.style.transform = "translateX(0)";
    const cleanup = () => {
      el.style.transition = "";
    };
    el.addEventListener("transitionend", cleanup, { once: true });
  }, []);

  const dismissTransform = useCallback((el: HTMLElement) => {
    el.style.transition = "transform 300ms ease-out";
    el.style.transform = "translateX(100%)";
    const cleanup = () => {
      el.style.transition = "";
      onDismissRef.current();
    };
    el.addEventListener("transitionend", cleanup, { once: true });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      isDragging.current = false;
      if (el) {
        el.style.transition = "";
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!el) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX.current;

      if (deltaX > 0) {
        isDragging.current = true;
        el.style.transform = `translateX(${deltaX}px)`;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!el || !isDragging.current) return;
      isDragging.current = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX.current;
      const screenWidth = window.innerWidth;

      if (deltaX > screenWidth * DISMISS_THRESHOLD_RATIO) {
        dismissTransform(el);
      } else {
        resetTransform(el);
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, enabled, resetTransform, dismissTransform]);
}
