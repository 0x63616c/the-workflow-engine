import { useCallback, useEffect, useRef } from "react";

interface IdleTimeoutOptions {
  enabled?: boolean;
}

export function useIdleTimeout(
  callback: () => void,
  timeout_MS: number,
  options: IdleTimeoutOptions = {},
): void {
  const { enabled = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, timeout_MS);
  }, [timeout_MS]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handleTouch = () => {
      resetTimer();
    };

    document.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      document.removeEventListener("touchstart", handleTouch);
    };
  }, [enabled, resetTimer]);
}
