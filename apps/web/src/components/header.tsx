import { useNow } from "@/hooks/use-now";
import { formatDate, formatTime, greetingForHour } from "@/lib/time";

export function Header() {
  const now = useNow();
  const greeting = greetingForHour(now.getHours());
  const { time, suffix } = formatTime(now);
  const date = formatDate(now);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-background px-9 pt-8 pb-6">
      <div>
        <h1 className="font-semibold text-5xl text-foreground tracking-tight">{greeting}</h1>
        <p className="mt-2 font-mono text-foreground-muted text-xs tracking-widest uppercase">
          Los Angeles · 72&deg;F Clear
        </p>
      </div>
      <div className="grid grid-cols-[auto_auto] items-start gap-x-1 leading-none">
        <span className="font-semibold text-5xl text-foreground tabular-nums tracking-tight">
          {time}
        </span>
        <span className="font-mono text-foreground-muted text-xs">{suffix}</span>
        <p className="mt-2 text-right font-mono text-foreground-muted text-xs tracking-widest uppercase">
          {date}
        </p>
      </div>
    </header>
  );
}
