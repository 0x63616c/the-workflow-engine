import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useWeather } from "@/hooks/use-weather";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";

function getWeatherIcon(code: number | null) {
  if (code === null) return Cloud;
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || (code >= 85 && code <= 86)) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function WeatherCard() {
  const config = getCardConfig("weather");
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const { temperature, condition, conditionCode, highTemp, lowTemp, uvIndex, isLoading, isError } =
    useWeather();

  const Icon = getWeatherIcon(conditionCode);
  const tempDisplay = displayValue({
    isLoading,
    isError,
    value: temperature,
    formatter: (v) => `${Math.round(v as number)}`,
  });

  return (
    <BentoCard
      testId="widget-card-weather"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("weather")}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-lg text-muted-foreground">Weather</span>
          <Icon size={24} className="text-muted-foreground/60" />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-4xl font-light text-foreground tabular-nums">
                {tempDisplay}
              </span>
              {!isLoading && !isError && temperature !== null && (
                <span className="text-lg text-muted-foreground/50">{"\u00b0F"}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              {displayValue({ isLoading, isError, value: condition })}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground/50 space-y-0.5">
            <div>
              H:{" "}
              {displayValue({
                isLoading,
                isError,
                value: highTemp,
                formatter: (v) => `${Math.round(v as number)}\u00b0`,
              })}
              {"  "}L:{" "}
              {displayValue({
                isLoading,
                isError,
                value: lowTemp,
                formatter: (v) => `${Math.round(v as number)}\u00b0`,
              })}
            </div>
            <div>
              UV{" "}
              {displayValue({
                isLoading,
                isError,
                value: uvIndex,
                formatter: (v) => String(Math.round((v as number) * 10) / 10),
              })}
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
