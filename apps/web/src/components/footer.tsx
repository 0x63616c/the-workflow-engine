import { useBuildHash } from "@/hooks/use-build-hash";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useState } from "react";

function formatRelativeTime(isoString: string, now: Date): string {
  const deployed = new Date(isoString);
  const diffMs = now.getTime() - deployed.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes === 1) return "1 minute ago";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function formatFullTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function Footer() {
  const { data } = useBuildHash();
  const [expanded, setExpanded] = useState(false);
  const now = useCurrentTime(expanded ? 1_000 : 60_000);

  if (!data?.hash) return null;

  const deployedAt = data.deployedAt;

  return (
    <div className="absolute bottom-2 right-3 z-[60]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="font-mono text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
      >
        {expanded && deployedAt ? (
          <span>
            {formatRelativeTime(deployedAt, now)} ({formatFullTimestamp(deployedAt)})
          </span>
        ) : (
          <span>(#{data.hash})</span>
        )}
      </button>
    </div>
  );
}
