import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useWeather } from "@/hooks/use-weather";
import { getWeatherIcon } from "@/lib/weather-icons";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

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
          <span className="text-2xl text-muted-foreground">Temp</span>
          <Icon size={32} className="text-muted-foreground/40" />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-light text-foreground tabular-nums">{tempDisplay}</span>
            {!isLoading && !isError && temperature !== null && (
              <span className="text-xl text-muted-foreground/50">{"\u00b0F"}</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground/50 mt-1">
            {displayValue({ isLoading, isError, value: condition })}
          </div>
          <div className="flex gap-3 mt-1 text-sm text-muted-foreground/50">
            <span>
              {displayValue({
                isLoading,
                isError,
                value: highTemp,
                formatter: (v) => `H ${Math.round(v as number)}\u00b0`,
              })}
            </span>
            <span>
              {displayValue({
                isLoading,
                isError,
                value: lowTemp,
                formatter: (v) => `L ${Math.round(v as number)}\u00b0`,
              })}
            </span>
            <span>
              UV{" "}
              {displayValue({
                isLoading,
                isError,
                value: uvIndex,
                formatter: (v) => String(Math.round((v as number) * 10) / 10),
              })}
            </span>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
