import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useLights } from "@/hooks/use-lights";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

export function LightsCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("lights");
  const { onCount, totalCount, isLoading, isError, turnOn, turnOff } = useLights();

  const countLabel = isLoading
    ? "— of —"
    : isError
      ? "Unavailable"
      : `${onCount} of ${totalCount} on`;
  const disabled = isLoading || isError;

  return (
    <BentoCard
      testId="widget-card-lights"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={() => expandCard("lights")}
    >
      <div className="flex items-center justify-between h-full">
        <div>
          <div className="text-base text-muted-foreground mb-3">Lights</div>
          <div className="text-xl font-light text-foreground">{countLabel}</div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              turnOn();
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium border border-white/10 text-white/60 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            All On
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              turnOff();
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium border border-white/10 text-white/60 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            All Off
          </button>
        </div>
      </div>
    </BentoCard>
  );
}
