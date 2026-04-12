import { useCurrentTime } from "@/hooks/use-current-time";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

export function formatTime(date: Date): { hours: string; minutes: string; period: string } {
  const h = date.getHours();
  const hours = String(h === 0 ? 12 : h > 12 ? h - 12 : h);
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = h < 12 ? "AM" : "PM";
  return { hours, minutes, period };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "2-digit",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date).replace(",", "").toUpperCase();
}

export function ArtClock() {
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex items-baseline text-[14rem] font-[100] leading-none tracking-tight text-foreground">
        <span>{hours}</span>
        <span>:</span>
        <span>{minutes}</span>
        <span className="ml-2 text-[7rem] font-[200] text-foreground">{period}</span>
      </div>
      <div className="mt-4 text-xl font-[300] tracking-[0.25em] text-foreground">{dateStr}</div>
    </div>
  );
}
