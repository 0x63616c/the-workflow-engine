import { useCurrentTime } from "@/hooks/use-current-time";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

export function formatTime(date: Date): { hours: string; minutes: string } {
  const hours = String(date.getHours());
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { hours, minutes };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date).toUpperCase();
}

export function ArtClock() {
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes } = formatTime(now);
  const dateStr = formatDate(now);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex items-baseline text-[12rem] font-[100] leading-none tracking-tight text-foreground">
        <span>{hours}</span>
        <span className="animate-[pulse-colon_2s_ease-in-out_infinite]">:</span>
        <span>{minutes}</span>
      </div>
      <div className="mt-4 text-lg font-[300] tracking-[0.25em] text-muted-foreground">
        {dateStr}
      </div>
    </div>
  );
}
