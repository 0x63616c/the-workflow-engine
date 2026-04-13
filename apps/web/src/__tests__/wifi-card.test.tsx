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

  it("renders front face with SSID and tap prompt", () => {
    render(<WifiCard />);
    expect(screen.getByTestId("widget-card-wifi-front")).toBeInTheDocument();
    expect(screen.getByText("tap to share")).toBeInTheDocument();
  });

  it("flips to back on click, shows QR and password", async () => {
    render(<WifiCard />);
    const front = screen.getByTestId("widget-card-wifi-front");
    act(() => front.click());
    await waitFor(() => {
      const img = screen.getByAltText("WiFi QR code for HomeNet");
      expect(img).toBeInTheDocument();
    });
  });

  it("reveals password on eye button click after flip", async () => {
    render(<WifiCard />);
    act(() => screen.getByTestId("widget-card-wifi-front").click());
    const toggleBtn = screen.getByLabelText("Show password");
    act(() => toggleBtn.click());
    expect(screen.getByText("welcome2024")).toBeInTheDocument();
  });
});
