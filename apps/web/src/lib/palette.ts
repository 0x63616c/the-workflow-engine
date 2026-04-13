/**
 * Centralized color palette based on Radix Colors.
 *
 * Radix 12-step scale usage:
 *   Step 3  - Subtle card background tint
 *   Step 9  - Solid accent (titles, icons, highlights)
 *   Step 10 - Slightly darker accent (borders in light mode)
 *   Step 8  - Slightly darker accent (borders in dark mode)
 *   Step 11 - Low-contrast colored text
 *
 * Every card color must come from this palette. No raw hex values in components.
 */

export const CARD_PALETTE_COLORS = [
  "purple",
  "blue",
  "cyan",
  "teal",
  "green",
  "amber",
  "orange",
  "red",
  "pink",
  "iris",
  "crimson",
  "slate",
] as const;

export type CardPaletteColor = (typeof CARD_PALETTE_COLORS)[number];

export interface CardColorTokens {
  tint: string;
  accent: string;
  border: string;
  text: string;
}

interface PaletteMode {
  tint: string; // step 3
  accent: string; // step 9
  border: string; // step 10 (light) or step 8 (dark)
  text: string; // step 11
}

type PaletteDefinition = Record<CardPaletteColor, PaletteMode>;

export const LIGHT_CARD_PALETTE: PaletteDefinition = {
  purple: {
    tint: "#f7edfe",
    accent: "#8e4ec6",
    border: "#8347b9",
    text: "#8145b5",
  },
  blue: {
    tint: "#e6f4fe",
    accent: "#0090ff",
    border: "#0588f0",
    text: "#0d74ce",
  },
  cyan: {
    tint: "#def7f9",
    accent: "#00a2c7",
    border: "#3db9cf",
    text: "#107d98",
  },
  teal: {
    tint: "#e0f8f3",
    accent: "#12a594",
    border: "#0d9b8a",
    text: "#008573",
  },
  green: {
    tint: "#e6f6eb",
    accent: "#30a46c",
    border: "#2b9a66",
    text: "#218358",
  },
  amber: {
    tint: "#fff7c2",
    accent: "#ffc53d",
    border: "#e2a336",
    text: "#ab6400",
  },
  orange: {
    tint: "#ffefd6",
    accent: "#f76b15",
    border: "#ec9455",
    text: "#cc4e00",
  },
  red: {
    tint: "#feebec",
    accent: "#e5484d",
    border: "#dc3e42",
    text: "#ce2c31",
  },
  pink: {
    tint: "#fee9f5",
    accent: "#d6409f",
    border: "#cf3897",
    text: "#c2298a",
  },
  iris: {
    tint: "#f0f1fe",
    accent: "#5b5bd6",
    border: "#5151cd",
    text: "#5753c6",
  },
  crimson: {
    tint: "#ffe9f0",
    accent: "#e93d82",
    border: "#df3478",
    text: "#cb1d63",
  },
  slate: {
    tint: "#f0f0f3",
    accent: "#8b8d98",
    border: "#80838d",
    text: "#60646c",
  },
};

export const DARK_CARD_PALETTE: PaletteDefinition = {
  purple: {
    tint: "#301c3b",
    accent: "#8e4ec6",
    border: "#8457aa",
    text: "#d19dff",
  },
  blue: {
    tint: "#0d2847",
    accent: "#0090ff",
    border: "#2870bd",
    text: "#70b8ff",
  },
  cyan: {
    tint: "#082c36",
    accent: "#00a2c7",
    border: "#11809c",
    text: "#4ccce6",
  },
  teal: {
    tint: "#0d2d2a",
    accent: "#12a594",
    border: "#207e73",
    text: "#0bd8b6",
  },
  green: {
    tint: "#132d21",
    accent: "#30a46c",
    border: "#2f7c57",
    text: "#3dd68c",
  },
  amber: {
    tint: "#302008",
    accent: "#ffc53d",
    border: "#8f6424",
    text: "#ffca16",
  },
  orange: {
    tint: "#331e0b",
    accent: "#f76b15",
    border: "#a35829",
    text: "#ffa057",
  },
  red: {
    tint: "#3b1219",
    accent: "#e5484d",
    border: "#b54548",
    text: "#ff9592",
  },
  pink: {
    tint: "#37172f",
    accent: "#d6409f",
    border: "#a84885",
    text: "#ff8dcc",
  },
  iris: {
    tint: "#202248",
    accent: "#5b5bd6",
    border: "#5958b1",
    text: "#b1a9ff",
  },
  crimson: {
    tint: "#381525",
    accent: "#e93d82",
    border: "#b0436e",
    text: "#ff92ad",
  },
  slate: {
    tint: "#212225",
    accent: "#696e77",
    border: "#5a6169",
    text: "#b0b4ba",
  },
};

/** Gray scale for semantic theme colors (Radix Slate) */
export const SLATE_LIGHT = {
  1: "#fcfcfd",
  2: "#f9f9fb",
  3: "#f0f0f3",
  4: "#e8e8ec",
  5: "#e0e1e6",
  6: "#d9d9e0",
  7: "#cdced6",
  8: "#b9bbc6",
  9: "#8b8d98",
  10: "#80838d",
  11: "#60646c",
  12: "#1c2024",
};

export const SLATE_DARK = {
  1: "#111113",
  2: "#18191b",
  3: "#212225",
  4: "#272a2d",
  5: "#2e3135",
  6: "#363a3f",
  7: "#43484e",
  8: "#5a6169",
  9: "#696e77",
  10: "#777b84",
  11: "#b0b4ba",
  12: "#edeef0",
};

/**
 * Get CSS variable name for a card palette color token.
 * Used by ThemeProvider to set vars on :root.
 */
export function getCardColorVar(color: CardPaletteColor, token: keyof CardColorTokens): string {
  return `--color-card-${color}-${token}`;
}

/**
 * Get CSS var() reference for use in inline styles.
 */
export function cardColorVar(color: CardPaletteColor, token: keyof CardColorTokens): string {
  return `var(${getCardColorVar(color, token)})`;
}

/**
 * Validate that a string is a valid CardPaletteColor.
 */
export function isCardPaletteColor(value: string): value is CardPaletteColor {
  return CARD_PALETTE_COLORS.includes(value as CardPaletteColor);
}
