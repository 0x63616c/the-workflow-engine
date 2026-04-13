import { ThemeProvider } from "@/components/theme-provider";
import { DARK_CARD_PALETTE } from "@/lib/palette";
import { DAYLIGHT_PALETTE, MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import type { ThemePalette } from "@/stores/theme-store";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("ThemeProvider", () => {
  afterEach(() => {
    cleanup();
    // Reset store state
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE, daylight: DAYLIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
    // Clear inline styles
    document.documentElement.style.cssText = "";
  });

  it("applies --color-background CSS variable to documentElement", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe("#111113");
  });

  it("applies --color-accent CSS variable", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("#d4a574");
  });

  it("applies --color-foreground CSS variable", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--color-foreground")).toBe("#edeef0");
  });

  it("applies --color-muted-foreground with kebab-case", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--color-muted-foreground")).toBe(
      "#b0b4ba",
    );
  });

  it("applies card palette CSS variables", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--color-card-purple-accent")).toBe(
      "#8e4ec6",
    );
    expect(document.documentElement.style.getPropertyValue("--color-card-blue-border")).toBe(
      "#2870bd",
    );
  });

  it("renders children", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">hello</div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("updates CSS variables when palette changes", async () => {
    const dawnPalette: ThemePalette = {
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

    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );

    act(() => {
      useThemeStore.getState().registerPalette(dawnPalette);
      useThemeStore.getState().setActivePalette("dawn");
    });

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--color-background")).toBe("#1a1a2e");
    });
  });
});
