import { type CardPaletteColor, getCardColorVar } from "@/lib/palette";
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
  const palette = useThemeStore(
    (state) => state.palettes[state.activePaletteId] ?? MIDNIGHT_PALETTE,
  );

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    const keys: string[] = [];

    for (const [key, value] of Object.entries(palette.colors)) {
      const cssVarName = `--color-${camelToKebab(key)}`;
      root.style.setProperty(cssVarName, value);
      keys.push(cssVarName);
    }

    for (const [colorName, tokens] of Object.entries(palette.cardColors)) {
      for (const [token, value] of Object.entries(tokens)) {
        const cssVarName = getCardColorVar(
          colorName as CardPaletteColor,
          token as keyof typeof tokens,
        );
        root.style.setProperty(cssVarName, value);
        keys.push(cssVarName);
      }
    }

    return () => {
      for (const key of keys) {
        root.style.removeProperty(key);
      }
    };
  }, [palette]);

  return <>{children}</>;
}
