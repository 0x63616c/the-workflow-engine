import { useClimate } from "@/hooks/use-climate";

export function useFan() {
  const { entityId, fanEntityId, fanOn, isLoading, isError, turnFanOn, turnFanOff } = useClimate();

  return {
    entityId,
    fanEntityId,
    fanOn,
    isLoading,
    isError,
    toggle: () => {
      if (!entityId) return;
      if (fanOn) {
        turnFanOff(entityId, fanEntityId);
      } else {
        turnFanOn(entityId, fanEntityId);
      }
    },
  };
}
