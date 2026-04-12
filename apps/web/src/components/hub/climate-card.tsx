import { BentoCard } from "@/components/hub/bento-card";
import { useClimate } from "@/hooks/use-climate";

export function ClimateCard() {
  const {
    entityId,
    fanEntityId,
    currentTemp,
    tempUnit,
    hvacMode,
    fanOn,
    isLoading,
    isError,
    turnFanOn,
    turnFanOff,
  } = useClimate();

  const tempLabel = isLoading
    ? `--\u00b0${tempUnit}`
    : isError || currentTemp == null
      ? "Unavailable"
      : `${Math.round(currentTemp)}\u00b0${tempUnit}`;

  const modeLabel = isLoading ? "" : isError ? "" : (hvacMode ?? "");
  const disabled = isLoading || isError || entityId == null;

  return (
    <BentoCard testId="widget-card-climate">
      <div className="flex items-center justify-between h-full">
        <div>
          <div className="text-sm text-muted-foreground mb-3">Climate</div>
          <div className="text-lg font-light text-foreground">{tempLabel}</div>
          {modeLabel && (
            <div className="text-xs text-muted-foreground mt-1 capitalize">
              {modeLabel.replace("_", " ")}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (entityId) turnFanOn(entityId, fanEntityId);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed ${
              fanOn ? "text-white bg-white/10" : "text-white/60"
            }`}
          >
            Fan On
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (entityId) turnFanOff(entityId, fanEntityId);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 active:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed ${
              !fanOn ? "text-white bg-white/10" : "text-white/60"
            }`}
          >
            Fan Off
          </button>
        </div>
      </div>
    </BentoCard>
  );
}
