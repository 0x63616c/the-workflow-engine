import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useLights } from "@/hooks/use-lights";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Lightbulb } from "lucide-react";

export function LightsCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("lights");
  const { onCount, totalCount, isLoading, isError, turnOn, turnOff } = useLights();

  const allOn = onCount === totalCount && totalCount > 0;
  const allOff = onCount === 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allOn) {
      turnOff();
    } else {
      turnOn();
    }
  };

  const countLabel = isLoading ? "--" : isError ? "N/A" : `${onCount}/${totalCount}`;
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
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lights</span>
          <Lightbulb
            size={16}
            className={`transition-colors ${allOff ? "text-muted-foreground/40" : "text-amber-400"}`}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-light text-foreground">{countLabel}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={handleToggle}
            className={`rounded-lg px-3 py-1 text-xs font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              allOn
                ? "border-amber-400/30 text-amber-400 hover:bg-amber-400/10"
                : "border-white/10 text-white/60 hover:bg-white/10"
            }`}
          >
            {allOn ? "All Off" : "All On"}
          </button>
        </div>
      </div>
    </BentoCard>
  );
}
