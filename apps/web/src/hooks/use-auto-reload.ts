import { useBuildHash } from "@/hooks/use-build-hash";
import { useEffect, useRef } from "react";

export function useAutoReload() {
  const knownHash = useRef<string | null>(null);
  const { data } = useBuildHash();

  useEffect(() => {
    if (!data?.hash) return;

    if (knownHash.current === null) {
      knownHash.current = data.hash;
      return;
    }

    if (data.hash !== knownHash.current) {
      window.location.reload();
    }
  }, [data?.hash]);
}
