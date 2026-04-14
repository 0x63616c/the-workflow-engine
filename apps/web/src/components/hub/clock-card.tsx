import { formatDate, formatTime } from "@/components/art-clock/art-clock";
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Clock } from "lucide-react";

const CLOCK_UPDATE_INTERVAL_MS = 1_000;

export function ClockCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("clock");
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const dateStr = formatDate(now);

  return (
    <BentoCard
      testId="widget-card-clock"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("clock")}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-2xl text-muted-foreground">Clock</span>
          <Clock size={32} className="text-muted-foreground/40" />
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-baseline text-7xl font-extralight tracking-tight text-foreground tabular-nums">
            <span>{hours}</span>
            <span className="text-foreground/30 mx-1">:</span>
            <span>{minutes}</span>
            <span className="ml-2 text-3xl font-light text-foreground/60">{period}</span>
          </div>
          <div className="mt-2 text-sm font-light tracking-[0.15em] text-muted-foreground/60">
            {dateStr}
          </div>
        </div>
        <div />
      </div>
    </BentoCard>
  );
}
