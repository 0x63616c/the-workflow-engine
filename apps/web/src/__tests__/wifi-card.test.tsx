import { WifiCard } from "@/components/hub/wifi-card";
import { DAYLIGHT_PALETTE, MIDNIGHT_PALETTE, useThemeStore } from "@/stores/theme-store";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const QRCodeMock = vi.hoisted(() => ({
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake"),
}));

vi.mock("qrcode", () => ({ default: QRCodeMock }));

describe("WifiCard", () => {
  afterEach(() => {
    cleanup();
    useThemeStore.setState({
      palettes: { midnight: MIDNIGHT_PALETTE, daylight: DAYLIGHT_PALETTE },
      activePaletteId: "midnight",
      transitionDuration_MS: 0,
    });
    vi.clearAllMocks();
  });

  it("renders QR with light modules on transparent in dark mode", async () => {
    useThemeStore.setState({ activePaletteId: "midnight" });
    render(<WifiCard />);
    await waitFor(() => {
      expect(QRCodeMock.toDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          color: { dark: "#ffffffFF", light: "#00000000" },
        }),
      );
    });
  });

  it("renders QR with dark modules on transparent in light mode", async () => {
    useThemeStore.setState({ activePaletteId: "daylight" });
    render(<WifiCard />);
    await waitFor(() => {
      expect(QRCodeMock.toDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          color: { dark: "#000000FF", light: "#ffffff00" },
        }),
      );
    });
  });

  it("renders SSID text", () => {
    render(<WifiCard />);
    expect(screen.getByText("HomeNet")).toBeInTheDocument();
  });

  it("renders QR image when data URL available", async () => {
    render(<WifiCard />);
    await waitFor(() => {
      const img = screen.getByAltText("WiFi QR code for HomeNet");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "data:image/png;base64,fake");
    });
  });

  it("shows password dots by default, reveals on toggle", async () => {
    render(<WifiCard />);
    const toggleBtn = screen.getByLabelText("Show password");
    expect(screen.getByText("\u2022".repeat(11))).toBeInTheDocument();
    act(() => toggleBtn.click());
    expect(screen.getByText("welcome2024")).toBeInTheDocument();
  });
});
