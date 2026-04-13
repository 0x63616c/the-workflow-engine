import { formatTime } from "@/components/art-clock/art-clock";
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

const CLOCK_UPDATE_INTERVAL_MS = 1_000;

export function ClockCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("clock");
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <BentoCard
      testId="widget-card-clock"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("clock")}
      className="flex flex-col items-center justify-center"
    >
      <div className="text-center">
        <div
          className="font-extralight tracking-tight text-foreground tabular-nums"
          style={{ fontSize: "9rem", lineHeight: 1 }}
        >
          {hours}
          <span className="text-foreground/30 mx-1">:</span>
          {minutes}
          <span className="text-3xl font-light text-muted-foreground/60 ml-3 tracking-wide align-baseline">
            {period}
          </span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="text-3xl font-light text-foreground/70">{dayName}</div>
        <div className="text-2xl text-muted-foreground/50 mt-0.5">{monthDay}</div>
      </div>
    </BentoCard>
  );
}
