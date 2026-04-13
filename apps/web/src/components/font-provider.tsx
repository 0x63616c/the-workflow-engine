import { useFontStore } from "@/stores/font-store";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface FontProviderProps {
  children: ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  const activeFont = useFontStore((state) => {
    const font = state.getActiveFont();
    return font;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;
    root.style.setProperty("--font-active", activeFont.family);
    return () => {
      root.style.removeProperty("--font-active");
    };
  }, [activeFont]);

  return <>{children}</>;
}
