import { ScreenBrightness } from "@capacitor-community/screen-brightness";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef } from "react";

interface ScreenDimmingOptions {
  enabled: boolean;
  dimTimeout_MS: number;
  dimBrightness: number;
}

async function setBrightness(brightness: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await ScreenBrightness.setBrightness({ brightness });
}

export function useScreenDimming({
  enabled,
  dimTimeout_MS,
  dimBrightness,
}: ScreenDimmingOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDimmedRef = useRef(false);

  const restore = useCallback(async () => {
    isDimmedRef.current = false;
    await setBrightness(1.0);
  }, []);

  const scheduleOrReset = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      isDimmedRef.current = true;
      setBrightness(dimBrightness);
    }, dimTimeout_MS);
  }, [dimTimeout_MS, dimBrightness]);

  useEffect(() => {
    if (!enabled) return;

    scheduleOrReset();

    const handleTouch = () => {
      restore();
      scheduleOrReset();
    };

    document.addEventListener("touchstart", handleTouch, { passive: true });

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener("touchstart", handleTouch);
      restore();
    };
  }, [enabled, scheduleOrReset, restore]);
}
