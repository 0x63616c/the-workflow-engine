import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useFan } from "@/hooks/use-fan";
import { Fan } from "lucide-react";

export function FanCard() {
  const config = getCardConfig("fan");
  const { fanOn, isLoading, isError, toggle } = useFan();

  const disabled = isLoading || isError;

  return (
    <BentoCard
      testId="widget-card-fan"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={disabled ? undefined : toggle}
    >
      <div
        className={`flex flex-col justify-between h-full transition-opacity duration-300 ${!fanOn && !isLoading && !isError ? "opacity-40" : "opacity-100"}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-base text-muted-foreground">Fan</span>
          <Fan
            size={32}
            className={`transition-colors ${fanOn ? "text-cyan-400" : "text-muted-foreground/40"}`}
          />
        </div>
        <div className="flex items-end justify-end">
          <span className="text-base text-muted-foreground/50">
            {displayValue({ isLoading, isError, value: fanOn ? "ON" : "OFF" })}
          </span>
        </div>
      </div>
    </BentoCard>
  );
}
