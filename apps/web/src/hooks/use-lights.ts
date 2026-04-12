import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5_000;

export function useLights() {
  const lights = trpc.devices.lights.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
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
