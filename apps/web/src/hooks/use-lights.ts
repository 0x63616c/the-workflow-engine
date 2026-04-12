import { trpc } from "@/lib/trpc";
import { useState } from "react";

const POLL_INTERVAL_MS = 5_000;

export function useLights() {
  const [subscriptionError, setSubscriptionError] = useState(false);

  const utils = trpc.useUtils();

  const lights = trpc.devices.lights.useQuery(undefined, {
    refetchInterval: subscriptionError ? POLL_INTERVAL_MS : false,
    retry: false,
  });

  trpc.devices.onStateChange.useSubscription(
    { domains: ["light"] },
    {
      onData: () => {
        utils.devices.lights.invalidate();
      },
      onError: () => {
        setSubscriptionError(true);
      },
    },
  );

  const lightsOnMutation = trpc.devices.lightsOn.useMutation();
  const lightsOffMutation = trpc.devices.lightsOff.useMutation();

  const data = lights.data;
  const hasError = "error" in (data ?? {});

  return {
    onCount: !hasError && data ? (data as { onCount: number }).onCount : 0,
    totalCount: !hasError && data ? (data as { totalCount: number }).totalCount : 0,
    isLoading: lights.isLoading,
    isError: hasError || lights.isError,
    turnOn: () => lightsOnMutation.mutate(undefined),
    turnOff: () => lightsOffMutation.mutate(undefined),
  };
}
