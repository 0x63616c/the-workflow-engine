import {
  type CardColorTokens,
  type CardPaletteColor,
  DARK_CARD_PALETTE,
  LIGHT_CARD_PALETTE,
  SLATE_DARK,
  SLATE_LIGHT,
} from "@/lib/palette";
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
  cardColors: Record<CardPaletteColor, CardColorTokens>;
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
    background: SLATE_DARK[1],
    foreground: SLATE_DARK[12],
    muted: SLATE_DARK[3],
    mutedForeground: SLATE_DARK[11],
    border: SLATE_DARK[6],
    input: SLATE_DARK[6],
    ring: SLATE_DARK[8],
    primary: SLATE_DARK[12],
    primaryForeground: SLATE_DARK[1],
    secondary: SLATE_DARK[3],
    secondaryForeground: SLATE_DARK[12],
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: DARK_CARD_PALETTE.red.accent,
    destructiveForeground: "#ffffff",
    card: SLATE_DARK[2],
    cardForeground: SLATE_DARK[12],
    popover: SLATE_DARK[2],
    popoverForeground: SLATE_DARK[12],
  },
  cardColors: DARK_CARD_PALETTE,
};

export const DAYLIGHT_PALETTE: ThemePalette = {
  id: "daylight",
  name: "Daylight",
  colors: {
    background: SLATE_LIGHT[1],
    foreground: SLATE_LIGHT[12],
    muted: SLATE_LIGHT[3],
    mutedForeground: SLATE_LIGHT[11],
    border: SLATE_LIGHT[6],
    input: SLATE_LIGHT[6],
    ring: SLATE_LIGHT[8],
    primary: SLATE_LIGHT[12],
    primaryForeground: SLATE_LIGHT[1],
    secondary: SLATE_LIGHT[3],
    secondaryForeground: SLATE_LIGHT[12],
    accent: "#d4a574",
    accentForeground: "#1a1a1a",
    destructive: LIGHT_CARD_PALETTE.red.accent,
    destructiveForeground: "#ffffff",
    card: SLATE_LIGHT[1],
    cardForeground: SLATE_LIGHT[12],
    popover: SLATE_LIGHT[1],
    popoverForeground: SLATE_LIGHT[12],
  },
  cardColors: LIGHT_CARD_PALETTE,
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
