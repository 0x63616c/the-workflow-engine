import { BentoCard } from "@/components/hub/bento-card";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { useTimerStore } from "@/stores/timer-store";

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerCard() {
  const status = useTimerStore((s) => s.status);
  const remaining_MS = useTimerStore((s) => s.remaining_MS);
  const expandCard = useCardExpansionStore((s) => s.expandCard);

  const value = (() => {
    if (status === "idle") return "No timer";
    if (status === "done") return "Done!";
    return formatCountdown(remaining_MS);
  })();

  return (
    <BentoCard testId="widget-card-timer" onClick={() => expandCard("timer")}>
      <div className="flex flex-col justify-between h-full">
        <div className="text-base text-muted-foreground">Timer</div>
        <div className="text-3xl font-[200] text-foreground tabular-nums">{value}</div>
      </div>
    </BentoCard>
  );
}
