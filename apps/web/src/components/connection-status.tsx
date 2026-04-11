import { trpc } from "@/lib/trpc";

const HEALTH_POLL_INTERVAL_MS = 15_000;

export function ConnectionStatus() {
  const { status } = trpc.health.buildHash.useQuery(undefined, {
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    retry: false,
  });

  if (status !== "error") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground shadow-lg backdrop-blur-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" />
        Disconnected
      </div>
    </div>
  );
}
