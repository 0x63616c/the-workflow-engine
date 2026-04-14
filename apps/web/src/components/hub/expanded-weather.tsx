import { useWeather } from "@/hooks/use-weather";
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

function getUvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export function ExpandedWeather() {
  const { temperature, condition, conditionCode, highTemp, lowTemp, uvIndex, isLoading, isError } =
    useWeather();

  const Icon = getWeatherIcon(conditionCode);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50">
        Loading weather...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50">
        Weather unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-6">
      <Icon size={64} className="text-muted-foreground/60 mb-4" />
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-7xl font-light text-foreground tabular-nums">
          {temperature !== null ? Math.round(temperature) : "--"}
        </span>
        <span className="text-2xl text-muted-foreground/50">{"\u00b0F"}</span>
      </div>
      <div className="text-xl text-muted-foreground mb-8">{condition ?? "Unknown"}</div>
      <div className="grid grid-cols-3 gap-8 text-center">
        <div>
          <div className="text-sm text-muted-foreground/50 mb-1">High</div>
          <div className="text-2xl font-light text-foreground tabular-nums">
            {highTemp !== null ? `${Math.round(highTemp)}\u00b0` : "--"}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground/50 mb-1">Low</div>
          <div className="text-2xl font-light text-foreground tabular-nums">
            {lowTemp !== null ? `${Math.round(lowTemp)}\u00b0` : "--"}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground/50 mb-1">UV Index</div>
          <div className="text-2xl font-light text-foreground tabular-nums">
            {uvIndex !== null ? Math.round(uvIndex * 10) / 10 : "--"}
          </div>
          {uvIndex !== null && (
            <div className="text-xs text-muted-foreground/40">{getUvLabel(uvIndex)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
