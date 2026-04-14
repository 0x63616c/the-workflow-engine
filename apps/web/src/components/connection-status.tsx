import { useBuildHash } from "@/hooks/use-build-hash";

export function ConnectionStatus() {
  const { status, failureCount } = useBuildHash();

  if (status !== "error") return null;

  // After 3 consecutive failures, show full-screen overlay instead of a small badge.
  // This prevents the "black screen" experience when the backend is completely down.
  if (failureCount >= 3) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
          <h1 className="text-2xl font-light text-foreground">Unable to connect</h1>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            The backend is not responding. Reconnecting automatically...
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-secondary px-6 py-2 text-sm text-secondary-foreground"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground shadow-lg backdrop-blur-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" />
        Disconnected
      </div>
    </div>
  );
}
