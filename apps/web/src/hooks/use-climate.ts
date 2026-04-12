import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5_000;

export function useClimate() {
  const climate = trpc.devices.climate.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const utils = trpc.useUtils();
  const fanOnMutation = trpc.devices.fanOn.useMutation();
  const fanOffMutation = trpc.devices.fanOff.useMutation();
  const setTempMutation = trpc.devices.setTemperature.useMutation({
    onSuccess: () => utils.devices.climate.invalidate(),
  });

  const data = climate.data;
  const hasError = "error" in (data ?? {});

  type ClimateData = {
    entityId: string;
    friendlyName: string;
    currentTemp: number | null;
    tempUnit: "F" | "C";
    hvacMode: string;
    hvacAction: string | null;
    fanOn: boolean;
    fanEntityId: string | null;
    targetTemp: number | null;
  };

  const state = !hasError && data ? (data as ClimateData) : null;

  return {
    entityId: state?.entityId ?? null,
    fanEntityId: state?.fanEntityId ?? null,
    friendlyName: state?.friendlyName ?? null,
    currentTemp: state?.currentTemp ?? null,
    tempUnit: state?.tempUnit ?? "F",
    hvacMode: state?.hvacMode ?? null,
    fanOn: state?.fanOn ?? false,
    isLoading: climate.isLoading,
    isError: hasError || climate.isError,
    targetTemp: state?.targetTemp ?? null,
    turnFanOn: (entityId: string, fanEntityId?: string | null) =>
      fanOnMutation.mutate({ entityId, fanEntityId }),
    turnFanOff: (entityId: string, fanEntityId?: string | null) =>
      fanOffMutation.mutate({ entityId, fanEntityId }),
    setTemperature: (entityId: string, temperature: number) =>
      setTempMutation.mutate({ entityId, temperature }),
  };
}
