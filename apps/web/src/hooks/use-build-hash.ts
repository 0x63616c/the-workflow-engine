import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 1_000;

export function useBuildHash() {
  return trpc.health.buildHash.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
}
