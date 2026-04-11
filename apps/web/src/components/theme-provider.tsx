import { MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const activePaletteId = useThemeStore((state) => state.activePaletteId);
  const palettes = useThemeStore((state) => state.palettes);
  const palette = palettes[activePaletteId] ?? MIDNIGHT_PALETTE;

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    const keys: string[] = [];

    for (const [key, value] of Object.entries(palette.colors)) {
      const cssVarName = `--color-${camelToKebab(key)}`;
      root.style.setProperty(cssVarName, value);
      keys.push(cssVarName);
    }

    return () => {
      for (const key of keys) {
        root.style.removeProperty(key);
      }
    };
  }, [palette]);

  return <>{children}</>;
}
