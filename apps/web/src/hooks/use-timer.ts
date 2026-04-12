import { useTimerStore } from "@/stores/timer-store";
import { useEffect } from "react";

const TICK_INTERVAL_MS = 100;

export function useTimer() {
  const status = useTimerStore((s) => s.status);
  const tick = useTimerStore((s) => s.tick);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const remaining_MS = useTimerStore((s) => s.remaining_MS);
  const duration_MS = useTimerStore((s) => s.duration_MS);

  useEffect(() => {
    if (status !== "running") return;

    let lastTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed_MS = now - lastTime;
      lastTime = now;
      tick(elapsed_MS);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, tick]);

  return { status, remaining_MS, duration_MS, start, pause, resume, reset };
}
