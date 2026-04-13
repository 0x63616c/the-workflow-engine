import { ClimateCard } from "@/components/hub/climate-card";
import * as useClimateModule from "@/hooks/use-climate";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-climate");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseClimate = vi.mocked(useClimateModule.useClimate);

const setTemperatureFn = vi.fn();

function setupHook(overrides = {}) {
  mockUseClimate.mockReturnValue({
    entityId: "climate.living_room",
    fanEntityId: null,
    friendlyName: "Living Room AC",
    currentTemp: 72,
    targetTemp: 72,
    tempUnit: "F" as const,
    hvacMode: "cool",
    fanOn: false,
    isLoading: false,
    isError: false,
    turnFanOn: vi.fn(),
    turnFanOff: vi.fn(),
    setTemperature: setTemperatureFn,
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

describe("ClimateCard", () => {
  it("shows current temperature", () => {
    render(<ClimateCard />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("calls setTemperature with +1 when top half clicked", () => {
    render(<ClimateCard />);
    // Top half contains ChevronUp SVG
    const card = screen.getByTestId("widget-card-climate");
    const divs = card.querySelectorAll(":scope > div > div");
    // First div is top half (up), second is center, third is bottom half (down)
    fireEvent.click(divs[0]);
    expect(setTemperatureFn).toHaveBeenCalledWith("climate.living_room", 73);
  });

  it("calls setTemperature with -1 when bottom half clicked", () => {
    render(<ClimateCard />);
    const card = screen.getByTestId("widget-card-climate");
    const divs = card.querySelectorAll(":scope > div > div");
    fireEvent.click(divs[2]);
    expect(setTemperatureFn).toHaveBeenCalledWith("climate.living_room", 71);
  });

  it("shows N/A on error", () => {
    setupHook({ isError: true });
    render(<ClimateCard />);
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(1);
  });

  it("shows -- when loading", () => {
    setupHook({ isLoading: true });
    render(<ClimateCard />);
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(1);
  });

  it("does not call setTemperature when disabled", () => {
    setupHook({ isLoading: true });
    render(<ClimateCard />);
    const card = screen.getByTestId("widget-card-climate");
    const topHalf = card.querySelector("div > div > div:first-child") as HTMLElement;
    fireEvent.click(topHalf);
    expect(setTemperatureFn).not.toHaveBeenCalled();
  });
});
