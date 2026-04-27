import { useNow } from "@/hooks/use-now";
import { formatDate, formatTime, greetingForHour } from "@/lib/time";

export function Header() {
  const now = useNow();
  const greeting = greetingForHour(now.getHours());
  const { time, suffix } = formatTime(now);
  const date = formatDate(now);

  return (
    <header className="flex items-start justify-between bg-background px-9 py-6">
      <div>
        <h1 className="font-semibold text-5xl text-foreground tracking-tight">{greeting}.</h1>
        <p className="mt-1 font-mono text-foreground-muted text-xs tracking-widest uppercase">
          Los Angeles · 72&deg;F Clear
        </p>
      </div>
      <div className="flex items-start gap-1">
        <div className="flex flex-col items-end leading-none">
          <div className="font-semibold text-5xl text-foreground leading-none tabular-nums tracking-tight">
            {time}
          </div>
          <p className="mt-1 font-mono text-foreground-muted text-xs tracking-widest uppercase">
            {date}
          </p>
        </div>
        <div className="mt-[3px] font-mono text-foreground-muted text-2xl leading-none">
          {suffix}
        </div>
      </div>
    </header>
  );
}
