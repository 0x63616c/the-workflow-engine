import "@/components/hub/register-cards";
import { ClockCard } from "@/components/hub/clock-card";
import { MusicCard } from "@/components/hub/music-card";
import { WifiCard } from "@/components/hub/wifi-card";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/art-clock/clock-state-carousel", () => ({
  ClockStateCarousel: () => null,
}));

vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn(
    (
      selector: (s: { activePaletteId: string; setActivePalette: (id: string) => void }) => unknown,
    ) => selector({ activePaletteId: "midnight", setActivePalette: () => {} }),
  ),
}));

vi.mock("@/hooks/use-current-time", () => ({
  useCurrentTime: () => new Date(2026, 3, 11, 14, 30, 0),
}));

vi.mock("@/components/art-clock/art-clock", () => ({
  formatTime: () => ({ hours: "02", minutes: "30", period: "PM" }),
}));

vi.mock("qrcode", () => ({
  default: { toString: vi.fn().mockResolvedValue("<svg></svg>") },
}));

vi.mock("@/hooks/use-sonos", () => ({
  useSonos: () => ({
    players: [],
    activeSpeaker: null,
    isLoading: false,
    isError: false,
    sendCommand: vi.fn(),
    setVolume: vi.fn(),
  }),
}));

describe("Card expansion behavior", () => {
  beforeEach(() => {
    useCardExpansionStore.setState({ expandedCardId: null });
    globalThis.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  afterEach(cleanup);

  it("ClockCard calls expandCard('clock') on click", () => {
    render(<ClockCard />);
    fireEvent.click(screen.getByTestId("widget-card-clock"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });

  it("MusicCard calls expandCard('music') on click", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByTestId("widget-card-music"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("music");
  });

  it("WifiCard does NOT set expandedCardId (no expanded view)", () => {
    render(<WifiCard />);
    fireEvent.click(screen.getByTestId("widget-card-wifi-front"));
    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("ClockCard uses card-registry grid position", () => {
    render(<ClockCard />);
    const card = screen.getByTestId("widget-card-clock");
    expect(card.style.gridColumn).toBe("1 / 4");
    expect(card.style.gridRow).toBe("1 / 3");
  });
});
