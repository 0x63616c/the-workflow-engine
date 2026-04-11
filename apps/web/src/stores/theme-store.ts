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

interface ThemeState {
  palettes: Record<string, ThemePalette>;
  activePaletteId: string;
  transitionDuration_MS: number;
}

interface ThemeActions {
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

export const useThemeStore = create<ThemeState & ThemeActions>((set, get) => ({
  palettes: { midnight: MIDNIGHT_PALETTE },
  activePaletteId: "midnight",
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
