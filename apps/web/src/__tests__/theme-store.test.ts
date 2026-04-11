import { MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import type { ThemePalette } from "@/stores/theme-store";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("theme-store", () => {
  afterEach(() => {
    // Reset store to initial state between tests
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
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

  it("midnight palette has correct background and foreground", () => {
    const palette = useThemeStore.getState().getActivePalette();
    expect(palette.colors.background).toBe("#000000");
    expect(palette.colors.foreground).toBe("#fafafa");
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
});
