import { useThemeStore } from "@/stores/theme-store";

interface ClockColors {
  foreground: string;
  background: string;
  /** Foreground with alpha, e.g. "rgba(255,255,255,0.4)" */
  foregroundAlpha: (alpha: number) => string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

/**
 * Returns resolved foreground/background colors from the active theme palette.
 * Use for canvas/Three.js drawing where CSS vars aren't available.
 */
export function useClockColors(): ClockColors {
  const palette = useThemeStore((state) => state.palettes[state.activePaletteId]);

  const foreground = palette?.colors.foreground ?? "#ffffff";
  const background = palette?.colors.background ?? "#000000";

  const foregroundAlpha = (alpha: number): string => {
    const rgb = hexToRgb(foreground);
    if (!rgb) return foreground;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  };

  return { foreground, background, foregroundAlpha };
}
