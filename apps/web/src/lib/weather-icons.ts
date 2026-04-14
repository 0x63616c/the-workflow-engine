import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";

export function getWeatherIcon(code: number | null) {
  if (code === null) return Cloud;
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || (code >= 85 && code <= 86)) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}
