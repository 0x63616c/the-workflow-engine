import { create } from "zustand";

export interface ThemePalette {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    input: string;
    ring: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
  };
}

export interface ThemeState {
  palettes: Record<string, ThemePalette>;
  activePaletteId: string;
  transitionDuration_MS: number;
}

export interface ThemeActions {
  setActivePalette: (id: string) => void;
  registerPalette: (palette: ThemePalette) => void;
  getActivePalette: () => ThemePalette;
}

export const MIDNIGHT_PALETTE: ThemePalette = {
  id: "midnight",
  name: "Midnight",
  colors: {
    background: "#000000",
    foreground: "#ffffff",
    muted: "#262626",
    mutedForeground: "#a3a3a3",
    border: "#262626",
    input: "#262626",
    ring: "#d4d4d4",
    primary: "#ffffff",
    primaryForeground: "#000000",
    secondary: "#262626",
    secondaryForeground: "#ffffff",
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    card: "#000000",
    cardForeground: "#ffffff",
    popover: "#000000",
    popoverForeground: "#ffffff",
  },
};

export const DAYLIGHT_PALETTE: ThemePalette = {
  id: "daylight",
  name: "Daylight",
  colors: {
    background: "#ffffff",
    foreground: "#000000",
    muted: "#f0f0f0",
    mutedForeground: "#6b6b6b",
    border: "#e5e5e5",
    input: "#e5e5e5",
    ring: "#8a8a8a",
    primary: "#000000",
    primaryForeground: "#ffffff",
    secondary: "#f0f0f0",
    secondaryForeground: "#000000",
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    card: "#ffffff",
    cardForeground: "#000000",
    popover: "#ffffff",
    popoverForeground: "#000000",
  },
};

function getInitialPaletteId(): string {
  try {
    return globalThis.localStorage?.getItem("theme-mode") ?? "midnight";
  } catch {
    return "midnight";
  }
}

export const useThemeStore = create<ThemeState & ThemeActions>((set, get) => ({
  palettes: { midnight: MIDNIGHT_PALETTE, daylight: DAYLIGHT_PALETTE },
  activePaletteId: getInitialPaletteId(),
  transitionDuration_MS: 0,

  setActivePalette: (id: string) => {
    const { palettes } = get();
    if (!palettes[id]) {
      console.warn(`Theme palette "${id}" not found, keeping current palette`);
      return;
    }
    try {
      globalThis.localStorage?.setItem("theme-mode", id);
    } catch {
      // ignore storage errors
    }
    set({ activePaletteId: id });
  },

  registerPalette: (palette: ThemePalette) => {
    set((state) => ({
      palettes: { ...state.palettes, [palette.id]: palette },
    }));
  },

  getActivePalette: () => {
    const { palettes, activePaletteId } = get();
    return palettes[activePaletteId] ?? MIDNIGHT_PALETTE;
  },
}));
