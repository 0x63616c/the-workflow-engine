import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useClimate } from "@/hooks/use-climate";
import { Fan } from "lucide-react";

export function FanCard() {
  const config = getCardConfig("fan");
  const { entityId, fanEntityId, fanOn, isLoading, isError, turnFanOn, turnFanOff } = useClimate();

  const disabled = isLoading || isError || entityId == null;

  const handleToggle = () => {
    if (!entityId) return;
    if (fanOn) {
      turnFanOff(entityId, fanEntityId);
    } else {
      turnFanOn(entityId, fanEntityId);
    }
  };

  return (
    <BentoCard
      testId="widget-card-fan"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={disabled ? undefined : handleToggle}
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
          {isLoading ? "--" : isError ? "N/A" : fanOn ? "On" : "Off"}
        </div>
      </div>
    </BentoCard>
  );
}
