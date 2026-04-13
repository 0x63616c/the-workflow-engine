import { useClimate } from "@/hooks/use-climate";

export function useFan() {
  const { entityId, fanOn, isLoading, isError, turnFanOn, turnFanOff } = useClimate();

  return {
    entityId,
    fanOn,
    isLoading,
    isError,
    toggle: () => {
      if (!entityId) return;
      if (fanOn) {
        turnFanOff(entityId);
      } else {
        turnFanOn(entityId);
      }
    },
  };
}
