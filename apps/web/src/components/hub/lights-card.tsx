import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useLights } from "@/hooks/use-lights";
import { Lightbulb } from "lucide-react";

export function LightsCard() {
  const config = getCardConfig("lights");
  const { onCount, totalCount, isLoading, isError, turnOn, turnOff } = useLights();

  const allOn = onCount === totalCount && totalCount > 0;
  const disabled = isLoading || isError;
  const countLabel = displayValue({ isLoading, isError, value: `${onCount}/${totalCount}` });

  const handleToggle = () => {
    if (disabled) return;
    if (allOn) {
      turnOff();
    } else {
      turnOn();
    }
  };

  return (
    <BentoCard
      testId="widget-card-lights"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={disabled ? undefined : handleToggle}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-base text-muted-foreground">Lights</span>
          <Lightbulb
            size={32}
            className={`transition-colors ${onCount === 0 ? "text-muted-foreground/40" : "text-amber-400"}`}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-light text-foreground">{countLabel}</span>
          <span className="text-base text-muted-foreground/50">{allOn ? "All Off" : "All On"}</span>
        </div>
      </div>
    </BentoCard>
  );
}
