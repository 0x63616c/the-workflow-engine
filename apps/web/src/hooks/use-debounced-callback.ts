import { useCallback, useRef } from "react";

export function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay_MS: number,
): (...args: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay_MS);
    },
    [fn, delay_MS],
  );
}
