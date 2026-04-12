import { formatTime } from "@/components/art-clock/art-clock";
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

const CLOCK_UPDATE_INTERVAL_MS = 1000;

export function ClockCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("clock");
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);

  const date = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <BentoCard
      testId="widget-card-clock"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={() => expandCard("clock")}
      className="flex flex-col items-center justify-center"
    >
      <div className="text-center">
        <div className="text-5xl font-light tracking-tight text-foreground font-mono">
          <span>{hours}</span>
          <span className="animate-[pulse-colon_2s_ease-in-out_infinite]">:</span>
          <span>{minutes}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-0.5 uppercase tracking-wider">
          {period}
        </div>
      </div>
      <div className="text-sm text-muted-foreground/60 mt-3">{date}</div>
    </BentoCard>
  );
}
