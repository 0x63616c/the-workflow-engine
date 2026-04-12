import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5_000;

export function useBuildHash() {
  return trpc.health.buildHash.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
