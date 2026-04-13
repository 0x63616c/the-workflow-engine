import { trpc } from "@/lib/trpc";
import { useState } from "react";

const POLL_INTERVAL_MS = 5_000;

export function useClimate() {
  const [subscriptionError, setSubscriptionError] = useState(false);

  const utils = trpc.useUtils();

  const climate = trpc.devices.climate.useQuery(undefined, {
    refetchInterval: subscriptionError ? POLL_INTERVAL_MS : false,
    retry: false,
  });

  trpc.devices.onStateChange.useSubscription(
    { domains: ["climate", "fan"] },
    {
      onData: () => {
        utils.devices.climate.invalidate();
      },
      onError: () => {
        setSubscriptionError(true);
      },
    },
  );

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
    targetTemp: number | null;
  };

  const state = !hasError && data ? (data as ClimateData) : null;

  return {
    entityId: state?.entityId ?? null,
    friendlyName: state?.friendlyName ?? null,
    currentTemp: state?.currentTemp ?? null,
    tempUnit: state?.tempUnit ?? "F",
    hvacMode: state?.hvacMode ?? null,
    fanOn: state?.fanOn ?? false,
    isLoading: climate.isLoading,
    isError: hasError || climate.isError,
    targetTemp: state?.targetTemp ?? null,
    turnFanOn: (entityId: string) => fanOnMutation.mutate({ entityId }),
    turnFanOff: (entityId: string) => fanOffMutation.mutate({ entityId }),
    setTemperature: (entityId: string, temperature: number) =>
      setTempMutation.mutate({ entityId, temperature }),
  };
}
