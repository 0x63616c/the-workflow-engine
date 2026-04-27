import { useEffect, useState } from "react";

const ONE_SECOND_MS = 1000;

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ONE_SECOND_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}
