import { CalendarCard } from "@/components/hub/calendar-card";
import { ClockCard } from "@/components/hub/clock-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { ThemeToggleCard } from "@/components/hub/theme-toggle-card";
import { WeatherCard } from "@/components/hub/weather-card";
import { WifiCard } from "@/components/hub/wifi-card";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("WeatherCard calls expandCard('weather') on click", () => {
    render(<WeatherCard temp={72} condition="Sunny" high={78} low={65} />);
    fireEvent.click(screen.getByTestId("widget-card-weather"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("weather");
  });

  it("ClockCard calls expandCard('clock') on click", () => {
    render(<ClockCard />);
    fireEvent.click(screen.getByTestId("widget-card-clock"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });

  it("LightsCard calls expandCard('lights') on click", () => {
    render(<LightsCard />);
    fireEvent.click(screen.getByTestId("widget-card-lights"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("lights");
  });

  it("MusicCard calls expandCard('music') on click", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByTestId("widget-card-music"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("music");
  });

  it("CalendarCard calls expandCard('calendar') on click", () => {
    render(<CalendarCard />);
    fireEvent.click(screen.getByTestId("widget-card-calendar"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("calendar");
  });

  it("ThemeToggleCard does NOT set expandedCardId (no expanded view)", () => {
    render(<ThemeToggleCard />);
    fireEvent.click(screen.getByTestId("widget-card-theme"));
    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("WifiCard does NOT set expandedCardId (no expanded view)", () => {
    render(<WifiCard />);
    fireEvent.click(screen.getByTestId("widget-card-wifi-front"));
    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("WeatherCard uses card-registry grid position", () => {
    render(<WeatherCard temp={72} condition="Sunny" high={78} low={65} />);
    const card = screen.getByTestId("widget-card-weather");
    expect(card.style.gridColumn).toBe("1 / 3");
    expect(card.style.gridRow).toBe("1 / 3");
  });

  it("ClockCard uses card-registry grid position", () => {
    render(<ClockCard />);
    const card = screen.getByTestId("widget-card-clock");
    expect(card.style.gridColumn).toBe("3 / 5");
    expect(card.style.gridRow).toBe("1 / 3");
  });
});
