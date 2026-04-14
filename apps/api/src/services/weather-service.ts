// Kurve Wilshire, Los Angeles, CA
const LATITUDE = 34.0617;
const LONGITUDE = -118.2836;

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export interface WeatherData {
  temperature: number;
  condition: string;
  conditionCode: number;
  highTemp: number;
  lowTemp: number;
  uvIndex: number;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    uv_index: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function getCurrentWeather(): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  return {
    temperature: data.current.temperature_2m,
    condition: WEATHER_CODES[data.current.weather_code] ?? "Unknown",
    conditionCode: data.current.weather_code,
    highTemp: data.daily.temperature_2m_max[0],
    lowTemp: data.daily.temperature_2m_min[0],
    uvIndex: data.current.uv_index,
  };
}
