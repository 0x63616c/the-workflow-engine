import { useEffect, useRef, useState } from "react";

interface SonosProgressBarProps {
  mediaPosition?: number;
  mediaDuration?: number;
  mediaPositionUpdatedAt?: string;
  isPlaying: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SonosProgressBar({
  mediaPosition,
  mediaDuration,
  mediaPositionUpdatedAt,
  isPlaying,
}: SonosProgressBarProps) {
  const [position, setPosition] = useState(mediaPosition ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mediaPositionUpdatedAt && mediaPosition != null) {
      const updatedAt = new Date(mediaPositionUpdatedAt).getTime();
      const elapsed = (Date.now() - updatedAt) / 1000;
      setPosition(mediaPosition + elapsed);
    } else {
      setPosition(mediaPosition ?? 0);
    }
  }, [mediaPosition, mediaPositionUpdatedAt]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mediaPosition and mediaPositionUpdatedAt are intentional deps to restart the interval from the newly synced position after a seek
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setPosition((p) => p + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, mediaPosition, mediaPositionUpdatedAt]);

  const duration = mediaDuration ?? 0;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <div className="w-full">
      <div className="relative w-full h-1 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-foreground/60 rounded-full"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-foreground/30">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
