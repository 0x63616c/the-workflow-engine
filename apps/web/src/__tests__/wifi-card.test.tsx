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
          width: 400,
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
          width: 400,
        }),
      );
    });
  });

  it("shows QR code blurred by default", async () => {
    render(<WifiCard />);
    await waitFor(() => screen.getByTestId("qr-container"));
    const qrContainer = screen.getByTestId("qr-container");
    expect(qrContainer.style.filter).toBe("blur(12px)");
  });

  it("unblurs QR on tap", async () => {
    render(<WifiCard />);
    await waitFor(() => screen.getByTestId("qr-container"));
    const card = screen.getByTestId("widget-card-wifi");
    act(() => card.click());
    const qrContainer = screen.getByTestId("qr-container");
    expect(qrContainer.style.filter).toBe("blur(0px)");
  });

  it("reblurs QR on second tap", async () => {
    render(<WifiCard />);
    await waitFor(() => screen.getByTestId("qr-container"));
    const card = screen.getByTestId("widget-card-wifi");
    act(() => card.click());
    act(() => card.click());
    const qrContainer = screen.getByTestId("qr-container");
    expect(qrContainer.style.filter).toBe("blur(12px)");
  });

  it("shows SSID in header", () => {
    render(<WifiCard />);
    expect(screen.getByText("HomeNet")).toBeInTheDocument();
  });

  it("reveals password on eye button click", async () => {
    render(<WifiCard />);
    const toggleBtn = screen.getByLabelText("Show password");
    act(() => toggleBtn.click());
    expect(screen.getByText("welcome2024")).toBeInTheDocument();
  });

  it("renders QR image with correct size class", async () => {
    render(<WifiCard />);
    await waitFor(() => screen.getByAltText("WiFi QR code for HomeNet"));
    const img = screen.getByAltText("WiFi QR code for HomeNet");
    expect(img.classList.contains("w-64")).toBe(true);
    expect(img.classList.contains("h-64")).toBe(true);
  });
});
