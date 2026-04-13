import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useLights } from "@/hooks/use-lights";
import { Lightbulb } from "lucide-react";

export function LightsCard() {
  const config = getCardConfig("lights");
  const { onCount, totalCount, isLoading, isError, turnOn, turnOff } = useLights();

  const majorityOn = totalCount > 0 && onCount > totalCount / 2;
  const disabled = isLoading || isError;
  const stateLabel = displayValue({ isLoading, isError, value: majorityOn ? "ON" : "OFF" });

  const handleToggle = () => {
    if (disabled) return;
    if (majorityOn) {
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
            className={`transition-colors ${majorityOn ? "text-amber-400" : "text-muted-foreground/40"}`}
          />
        </div>
        <div className="flex items-end justify-end">
          <span className="text-base text-muted-foreground/50">{stateLabel}</span>
        </div>
      </div>
    </BentoCard>
  );
}
