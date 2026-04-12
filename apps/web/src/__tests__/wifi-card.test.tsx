import { WifiCard } from "@/components/hub/wifi-card";
import { DAYLIGHT_PALETTE, MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const QRCodeMock = vi.hoisted(() => ({
  toString: vi.fn().mockResolvedValue('<svg data-testid="qr-svg"></svg>'),
}));

vi.mock("qrcode", () => ({ default: QRCodeMock }));

describe("WifiCard QR code theme", () => {
  afterEach(() => {
    cleanup();
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE, daylight: DAYLIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
    vi.clearAllMocks();
  });

  it("renders QR with white modules on black in dark (midnight) mode", async () => {
    useThemeStore.setState({ activePaletteId: "midnight" });
    render(<WifiCard />);
    await waitFor(() => {
      expect(QRCodeMock.toString).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          color: { dark: "#ffffff", light: "#000000" },
        }),
      );
    });
  });

  it("renders QR with black modules on white in light (daylight) mode", async () => {
    useThemeStore.setState({ activePaletteId: "daylight" });
    render(<WifiCard />);
    await waitFor(() => {
      expect(QRCodeMock.toString).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          color: { dark: "#000000", light: "#ffffff" },
        }),
      );
    });
  });

  it("renders QR container with dark background in dark mode", async () => {
    useThemeStore.setState({ activePaletteId: "midnight" });
    render(<WifiCard />);
    // Click front to flip to back to reveal QR
    const front = screen.getByTestId("widget-card-wifi-front");
    act(() => front.click());
    await waitFor(() => {
      const container = screen.getByTestId("qr-container");
      expect(container.className).toContain("bg-black");
    });
  });

  it("renders QR container with white background in light mode", async () => {
    useThemeStore.setState({ activePaletteId: "daylight" });
    render(<WifiCard />);
    const front = screen.getByTestId("widget-card-wifi-front");
    act(() => front.click());
    await waitFor(() => {
      const container = screen.getByTestId("qr-container");
      expect(container.className).toContain("bg-white");
    });
  });
});
