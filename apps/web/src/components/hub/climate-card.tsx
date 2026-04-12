import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useClimate } from "@/hooks/use-climate";
import { useThemeStore } from "@/stores/theme-store";
import { ChevronDown, ChevronUp, Thermometer } from "lucide-react";

const TEMP_STEP_DEGREES = 1;

export function ClimateCard() {
  const config = getCardConfig("climate");
  const isDark = useThemeStore((s) => s.activePaletteId === "midnight");
  const { entityId, currentTemp, targetTemp, tempUnit, isLoading, isError, setTemperature } =
    useClimate();

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
      className={`
        rounded-2xl overflow-hidden transition-all duration-150 ease-out border
        ${config?.colorScheme.bg ?? ""}
        ${config?.colorScheme.border ?? ""}
      `}
      style={{
        ...(config?.gridColumn ? { gridColumn: config.gridColumn } : {}),
        ...(config?.gridRow ? { gridRow: config.gridRow } : {}),
        borderColor: config?.colorScheme.border
          ? undefined
          : isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex flex-col h-full">
        {/* Top half - tap to increase */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: touch target for temp control */}
        <div
          className={`flex-1 flex flex-col justify-center items-center p-3 ${disabled ? "opacity-40" : "cursor-pointer active:bg-white/5"}`}
          onClick={disabled ? undefined : handleTempUp}
        >
          <ChevronUp size={14} className="text-muted-foreground/40" />
        </div>

        {/* Center display */}
        <div className="flex items-center justify-center gap-1 px-3">
          <Thermometer size={12} className="text-muted-foreground/40" />
          <span className="text-2xl font-light text-foreground tabular-nums">{displayTemp}</span>
          <span className="text-xs text-muted-foreground/50">{`\u00b0${tempUnit}`}</span>
        </div>

        {/* Bottom half - tap to decrease */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: touch target for temp control */}
        <div
          className={`flex-1 flex flex-col justify-center items-center p-3 ${disabled ? "opacity-40" : "cursor-pointer active:bg-white/5"}`}
          onClick={disabled ? undefined : handleTempDown}
        >
          <ChevronDown size={14} className="text-muted-foreground/40" />
        </div>
      </div>
    </div>
  );
}
