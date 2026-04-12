import { useCallback, useEffect, useRef, useState } from "react";

interface IdleTimeoutOptions {
  enabled?: boolean;
}

interface IdleTimeoutResult {
  remainingSeconds: number;
}

export function useIdleTimeout(
  callback: () => void,
  timeout_MS: number,
  options: IdleTimeoutOptions = {},
): IdleTimeoutResult {
  const { enabled = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const [remainingSeconds, setRemainingSeconds] = useState(
    enabled ? Math.ceil(timeout_MS / 1000) : 0,
  );

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    deadlineRef.current = Date.now() + timeout_MS;
    setRemainingSeconds(Math.ceil(timeout_MS / 1000));
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, timeout_MS);
  }, [timeout_MS]);

  useEffect(() => {
    if (!enabled) {
      setRemainingSeconds(0);
      return;
    }

    resetTimer();

    const handleTouch = () => {
      resetTimer();
    };

    tickRef.current = setInterval(() => {
      const ms = deadlineRef.current - Date.now();
      setRemainingSeconds(Math.max(0, Math.ceil(ms / 1000)));
    }, 1000);

    document.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      if (tickRef.current !== null) {
        clearInterval(tickRef.current);
      }
      document.removeEventListener("touchstart", handleTouch);
    };
  }, [enabled, resetTimer]);

  return { remainingSeconds };
}
