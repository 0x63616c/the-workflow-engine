import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 10_000;

export function useAutoReload() {
  const knownHash = useRef<string | null>(null);

  const { data } = trpc.health.buildHash.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!data?.hash) return;

    if (knownHash.current === null) {
      knownHash.current = data.hash;
      return;
    }

    if (data.hash !== knownHash.current) {
      window.location.reload();
    }
  }, [data?.hash]);
}
