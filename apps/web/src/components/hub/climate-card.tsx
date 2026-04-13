import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useClimate } from "@/hooks/use-climate";
import { cardColorVar } from "@/lib/palette";
import { ChevronDown, ChevronUp, Thermometer } from "lucide-react";

const TEMP_STEP_DEGREES = 1;

export function ClimateCard() {
  const config = getCardConfig("climate");
  const {
    entityId,
    currentTemp,
    targetTemp,
    tempUnit,
    hvacMode,
    isLoading,
    isError,
    setTemperature,
  } = useClimate();

  const disabled = isLoading || isError || entityId == null;
  const displayTemp = displayValue({
    isLoading,
    isError,
    value: currentTemp,
    formatter: (v) => `${Math.round(v as number)}`,
  });

  const handleTempUp = () => {
    if (!entityId || targetTemp == null) return;
    setTemperature(entityId, targetTemp + TEMP_STEP_DEGREES);
  };

  const handleTempDown = () => {
    if (!entityId || targetTemp == null) return;
    setTemperature(entityId, targetTemp - TEMP_STEP_DEGREES);
  };

  return (
    <div
      data-testid="widget-card-climate"
      className="rounded-2xl overflow-hidden transition-all duration-150 ease-out border"
      style={{
        ...(config?.gridColumn ? { gridColumn: config.gridColumn } : {}),
        ...(config?.gridRow ? { gridRow: config.gridRow } : {}),
        borderColor: config ? cardColorVar(config.colorScheme.color, "border") : undefined,
        backgroundColor: config ? cardColorVar(config.colorScheme.color, "tint") : undefined,
      }}
    >
      <div className="flex flex-col h-full">
        {/* Top half - tap to increase */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: touch target for temp control */}
        <div
          className={`flex-1 flex flex-col justify-center items-center p-3 ${disabled ? "opacity-40" : "cursor-pointer active:bg-foreground/5"}`}
          onClick={disabled ? undefined : handleTempUp}
        >
          <ChevronUp size={20} className="text-muted-foreground/40" />
        </div>

        {/* Center display */}
        <div className="flex items-center justify-center gap-1 px-3">
          <Thermometer size={24} className="text-muted-foreground/40" />
          <span className="text-5xl font-light text-foreground tabular-nums">{displayTemp}</span>
          <span className="text-xl text-muted-foreground/50">{`\u00b0${tempUnit}`}</span>
        </div>

        {/* Bottom half - tap to decrease */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: touch target for temp control */}
        <div
          className={`flex-1 flex flex-col justify-center items-center p-3 relative ${disabled ? "opacity-40" : "cursor-pointer active:bg-foreground/5"}`}
          onClick={disabled ? undefined : handleTempDown}
        >
          <ChevronDown size={20} className="text-muted-foreground/40" />
          <span className="absolute bottom-3 right-4 text-xl text-muted-foreground/50">
            {displayValue({ isLoading, isError, value: hvacMode === "off" ? "OFF" : "ON" })}
          </span>
        </div>
      </div>
    </div>
  );
}
