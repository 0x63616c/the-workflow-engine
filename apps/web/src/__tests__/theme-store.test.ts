import { DARK_CARD_PALETTE, LIGHT_CARD_PALETTE } from "@/lib/palette";
import { DAYLIGHT_PALETTE, MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import type { ThemePalette } from "@/stores/theme-store";
import { afterEach, describe, expect, it, vi } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe("theme-store", () => {
  afterEach(() => {
    // Reset store to initial state between tests
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE, daylight: DAYLIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
    localStorageMock.clear();
  });

  it("initializes with midnight palette as active", () => {
    const state = useThemeStore.getState();
    expect(state.activePaletteId).toBe("midnight");
    expect(state.palettes.midnight).toBeDefined();
  });

  it("getActivePalette returns the midnight palette", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.id).toBe("midnight");
    expect(palette.name).toBe("Midnight");
  });

  it("midnight palette has correct accent color", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.colors.accent).toBe("#d4a574");
    expect(palette.colors.accentForeground).toBe("#1a1a1a");
  });

  it("midnight palette has Radix Slate dark background and foreground", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.colors.background).toBe("#111113");
    expect(palette.colors.foreground).toBe("#edeef0");
  });

  it("midnight palette has pure black card and popover surfaces", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.colors.card).toBe("#000000");
    expect(palette.colors.popover).toBe("#000000");
    expect(palette.colors.cardForeground).toBe("#edeef0");
    expect(palette.colors.popoverForeground).toBe("#edeef0");
  });

  it("midnight palette has dark card palette colors", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.cardColors).toBe(DARK_CARD_PALETTE);
    expect(palette.cardColors.purple.accent).toBe("#8e4ec6");
  });

  it("registerPalette adds a new palette", () => {
    const testPalette: ThemePalette = {
      id: "dawn",
      name: "Dawn",
      colors: {
        background: "#1a1a2e",
        foreground: "#eaeaea",
        muted: "#2d2d44",
        mutedForeground: "#9999aa",
        border: "#2d2d44",
        input: "#2d2d44",
        ring: "#ccccdd",
        primary: "#eaeaea",
        primaryForeground: "#1a1a2e",
        secondary: "#2d2d44",
        secondaryForeground: "#eaeaea",
        accent: "#e8a87c",
        accentForeground: "#1a1a2e",
        destructive: "#ef4444",
        destructiveForeground: "#fafafa",
        card: "#1a1a2e",
        cardForeground: "#eaeaea",
        popover: "#1a1a2e",
        popoverForeground: "#eaeaea",
      },
      cardColors: DARK_CARD_PALETTE,
    };
    useThemeStore.getState().registerPalette(testPalette);
    expect(useThemeStore.getState().palettes.dawn).toEqual(testPalette);
  });

  it("registerPalette overwrites existing palette with same ID", () => {
    const updated: ThemePalette = {
      ...MIDNIGHT_PALETTE,
      name: "Midnight V2",
    };
    useThemeStore.getState().registerPalette(updated);
    expect(useThemeStore.getState().palettes.midnight.name).toBe("Midnight V2");
  });

  it("setActivePalette switches active palette ID", () => {
    const testPalette: ThemePalette = {
      id: "dawn",
      name: "Dawn",
      colors: { ...MIDNIGHT_PALETTE.colors },
      cardColors: DARK_CARD_PALETTE,
    };
    useThemeStore.getState().registerPalette(testPalette);
    useThemeStore.getState().setActivePalette("dawn");
    expect(useThemeStore.getState().activePaletteId).toBe("dawn");
  });

  it("setActivePalette with invalid ID does not change active palette", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    useThemeStore.getState().setActivePalette("nonexistent");
    expect(useThemeStore.getState().activePaletteId).toBe("midnight");
    expect(warnSpy).toHaveBeenCalledWith(
      'Theme palette "nonexistent" not found, keeping current palette',
    );
    warnSpy.mockRestore();
  });

  it("has correct transitionDuration_MS default", () => {
    expect(useThemeStore.getState().transitionDuration_MS).toBe(0);
  });

  describe("daylight palette", () => {
    it("has Radix Slate light background and foreground", () => {
      expect(DAYLIGHT_PALETTE.colors.background).toBe("#fcfcfd");
      expect(DAYLIGHT_PALETTE.colors.foreground).toBe("#1c2024");
    });

    it("has Radix Slate light card and popover surfaces", () => {
      expect(DAYLIGHT_PALETTE.colors.card).toBe("#fcfcfd");
      expect(DAYLIGHT_PALETTE.colors.popover).toBe("#fcfcfd");
      expect(DAYLIGHT_PALETTE.colors.cardForeground).toBe("#1c2024");
      expect(DAYLIGHT_PALETTE.colors.popoverForeground).toBe("#1c2024");
    });

    it("has Radix Slate dark primary color", () => {
      expect(DAYLIGHT_PALETTE.colors.primary).toBe("#1c2024");
      expect(DAYLIGHT_PALETTE.colors.primaryForeground).toBe("#fcfcfd");
    });

    it("has light card palette colors", () => {
      expect(DAYLIGHT_PALETTE.cardColors).toBe(LIGHT_CARD_PALETTE);
      expect(DAYLIGHT_PALETTE.cardColors.purple.accent).toBe("#8e4ec6");
    });

    it("is registered in the store by default", () => {
      expect(useThemeStore.getState().palettes.daylight).toBeDefined();
      expect(useThemeStore.getState().palettes.daylight.id).toBe("daylight");
    });
  });

  describe("localStorage persistence", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      localStorageMock.clear();
    });

    it("setActivePalette persists the palette ID to localStorage", () => {
      vi.stubGlobal("localStorage", localStorageMock);
      useThemeStore.getState().setActivePalette("daylight");
      expect(localStorageMock.getItem("theme-mode")).toBe("daylight");
    });

    it("setActivePalette persists when switching back to midnight", () => {
      vi.stubGlobal("localStorage", localStorageMock);
      useThemeStore.getState().setActivePalette("daylight");
      useThemeStore.getState().setActivePalette("midnight");
      expect(localStorageMock.getItem("theme-mode")).toBe("midnight");
    });

    it("setActivePalette does not persist when palette ID is invalid", () => {
      vi.stubGlobal("localStorage", localStorageMock);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useThemeStore.getState().setActivePalette("nonexistent");
      expect(localStorageMock.getItem("theme-mode")).toBeNull();
      warnSpy.mockRestore();
    });
  });
});
