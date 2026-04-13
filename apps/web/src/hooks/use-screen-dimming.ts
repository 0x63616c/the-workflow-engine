import { ScreenBrightness } from "@capacitor-community/screen-brightness";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef } from "react";

interface ScreenDimmingOptions {
  enabled: boolean;
  dimTimeout_MS: number;
  dimBrightness: number;
}

const FADE_STEPS = 20;
const FADE_DURATION_MS = 1000;
const FADE_INTERVAL_MS = FADE_DURATION_MS / FADE_STEPS;

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
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDimmedRef = useRef(false);

  const cancelFade = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const restore = useCallback(async () => {
    cancelFade();
    isDimmedRef.current = false;
    await setBrightness(1.0);
  }, [cancelFade]);

  const startFade = useCallback(
    (targetBrightness: number) => {
      cancelFade();
      const startBrightness = 1.0;
      const delta = (startBrightness - targetBrightness) / FADE_STEPS;
      let step = 0;

      fadeIntervalRef.current = setInterval(() => {
        step += 1;
        const brightness = Math.max(targetBrightness, startBrightness - delta * step);
        setBrightness(brightness);
        if (step >= FADE_STEPS) {
          cancelFade();
        }
      }, FADE_INTERVAL_MS);
    },
    [cancelFade],
  );

  const scheduleOrReset = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      isDimmedRef.current = true;
      startFade(dimBrightness);
    }, dimTimeout_MS);
  }, [dimTimeout_MS, dimBrightness, startFade]);

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
      cancelFade();
      restore();
    };
  }, [enabled, scheduleOrReset, restore, cancelFade]);
}
