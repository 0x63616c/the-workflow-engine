import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 900_000; // 15 minutes

export function useWeather() {
  const weather = trpc.weather.current.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: 2,
  });

  return {
    temperature: weather.data?.temperature ?? null,
    condition: weather.data?.condition ?? null,
    conditionCode: weather.data?.conditionCode ?? null,
    highTemp: weather.data?.highTemp ?? null,
    lowTemp: weather.data?.lowTemp ?? null,
    uvIndex: weather.data?.uvIndex ?? null,
    isLoading: weather.isLoading,
    isError: weather.isError,
  };
}
