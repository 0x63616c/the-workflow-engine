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
    foreground: "#fafafa",
    muted: "#262626",
    mutedForeground: "#a3a3a3",
    border: "#262626",
    input: "#262626",
    ring: "#d4d4d4",
    primary: "#fafafa",
    primaryForeground: "#0a0a0a",
    secondary: "#262626",
    secondaryForeground: "#fafafa",
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: "#ef4444",
    destructiveForeground: "#fafafa",
    card: "#0a0a0a",
    cardForeground: "#fafafa",
    popover: "#0a0a0a",
    popoverForeground: "#fafafa",
  },
};

export const DAYLIGHT_PALETTE: ThemePalette = {
  id: "daylight",
  name: "Daylight",
  colors: {
    background: "#f5f2ee",
    foreground: "#1a1a1a",
    muted: "#e8e5e0",
    mutedForeground: "#737068",
    border: "#e0dcd6",
    input: "#e0dcd6",
    ring: "#8a8580",
    primary: "#1a1a1a",
    primaryForeground: "#f5f2ee",
    secondary: "#e8e5e0",
    secondaryForeground: "#1a1a1a",
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: "#ef4444",
    destructiveForeground: "#fafafa",
    card: "#ffffff",
    cardForeground: "#1a1a1a",
    popover: "#ffffff",
    popoverForeground: "#1a1a1a",
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
