import { useEffect, useState } from "react";

export function useCurrentTime(interval_MS = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, interval_MS);

    return () => clearInterval(id);
  }, [interval_MS]);

  return now;
}
