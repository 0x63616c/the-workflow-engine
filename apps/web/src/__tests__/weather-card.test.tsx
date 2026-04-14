import { WeatherCard } from "@/components/hub/weather-card";
import * as useWeatherModule from "@/hooks/use-weather";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-weather");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseWeather = vi.mocked(useWeatherModule.useWeather);

function setupHook(overrides = {}) {
  mockUseWeather.mockReturnValue({
    temperature: 75,
    condition: "Partly cloudy",
    conditionCode: 2,
    highTemp: 82,
    lowTemp: 68,
    uvIndex: 6.2,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe("WeatherCard", () => {
  it("renders current temperature", () => {
    render(<WeatherCard />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("renders condition text", () => {
    render(<WeatherCard />);
    expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  });

  it("renders high and low temps", () => {
    render(<WeatherCard />);
    expect(screen.getByText(/82/)).toBeInTheDocument();
    expect(screen.getByText(/68/)).toBeInTheDocument();
  });

  it("renders UV index", () => {
    render(<WeatherCard />);
    expect(screen.getByText(/6\.2/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    setupHook({ isLoading: true });
    render(<WeatherCard />);
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
