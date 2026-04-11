import { ThemeProvider } from "@/components/theme-provider";
import { MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import type { ThemePalette } from "@/stores/theme-store";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("ThemeProvider", () => {
  afterEach(() => {
    cleanup();
    // Reset store state
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE },
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
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe("#000000");
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
    expect(document.documentElement.style.getPropertyValue("--color-foreground")).toBe("#fafafa");
  });

  it("applies --color-muted-foreground with kebab-case", () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>,
    );
    expect(document.documentElement.style.getPropertyValue("--color-muted-foreground")).toBe(
      "#a3a3a3",
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
