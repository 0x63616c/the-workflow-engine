import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useClimate } from "@/hooks/use-climate";
import { ChevronDown, ChevronUp, Thermometer } from "lucide-react";

const TEMP_STEP_DEGREES = 1;

export function ClimateCard() {
  const config = getCardConfig("climate");
  const { entityId, currentTemp, targetTemp, tempUnit, isLoading, isError, setTemperature } =
    useClimate();

  const disabled = isLoading || isError || entityId == null;
  const displayTemp = isLoading
    ? "--"
    : isError || currentTemp == null
      ? "N/A"
      : `${Math.round(currentTemp)}`;

  const handleTempUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entityId || targetTemp == null) return;
    setTemperature(entityId, targetTemp + TEMP_STEP_DEGREES);
  };

  const handleTempDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entityId || targetTemp == null) return;
    setTemperature(entityId, targetTemp - TEMP_STEP_DEGREES);
  };

  return (
    <BentoCard
      testId="widget-card-climate"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Temp</span>
          <Thermometer size={16} className="text-muted-foreground/40" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-light text-foreground tabular-nums">{displayTemp}</span>
            <span className="text-sm text-muted-foreground/50 ml-0.5">{`\u00b0${tempUnit}`}</span>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={handleTempUp}
              className="p-1 rounded-md border border-white/10 text-muted-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleTempDown}
              className="p-1 rounded-md border border-white/10 text-muted-foreground hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
