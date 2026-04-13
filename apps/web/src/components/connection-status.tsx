import { useBuildHash } from "@/hooks/use-build-hash";

export function ConnectionStatus() {
  const { status } = useBuildHash();

  if (status !== "error") return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground shadow-lg backdrop-blur-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" />
        Disconnected
      </div>
    </div>
  );
}
