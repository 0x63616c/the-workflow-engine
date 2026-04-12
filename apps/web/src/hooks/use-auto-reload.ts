import { useBuildHash } from "@/hooks/use-build-hash";
import { useEffect, useRef } from "react";

const STORAGE_KEY = "wfe:build-hash";

export function useAutoReload() {
  const knownHash = useRef<string | null>(null);
  const { data } = useBuildHash();

  useEffect(() => {
    if (!data?.hash) return;

    // Keep localStorage in sync for the pre-React version check
    try {
      localStorage.setItem(STORAGE_KEY, data.hash);
    } catch {
      // Storage may be unavailable
    }

    if (knownHash.current === null) {
      knownHash.current = data.hash;
      return;
    }

    if (data.hash !== knownHash.current) {
      console.warn("[WFE] Build hash changed, reloading...", knownHash.current, "->", data.hash);
      window.location.reload();
    }
  }, [data?.hash]);
}
