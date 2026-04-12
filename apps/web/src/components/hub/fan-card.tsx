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
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={disabled ? undefined : toggle}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Fan</span>
          <Fan
            size={16}
            className={`transition-colors ${fanOn ? "text-cyan-400" : "text-muted-foreground/40"}`}
          />
        </div>
        <div className="text-lg font-light text-foreground">
          {displayValue({ isLoading, isError, value: fanOn ? "On" : "Off" })}
        </div>
      </div>
    </BentoCard>
  );
}
