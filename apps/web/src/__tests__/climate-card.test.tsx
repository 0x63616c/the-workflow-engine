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

  it("shows temp label", () => {
    render(<ClimateCard />);
    expect(screen.getByText("Temp")).toBeInTheDocument();
  });

  it("calls setTemperature with +1 when up button clicked", () => {
    render(<ClimateCard />);
    const buttons = screen.getAllByRole("button");
    // First button is up (ChevronUp)
    fireEvent.click(buttons[0]);
    expect(setTemperatureFn).toHaveBeenCalledWith("climate.living_room", 73);
  });

  it("calls setTemperature with -1 when down button clicked", () => {
    render(<ClimateCard />);
    const buttons = screen.getAllByRole("button");
    // Second button is down (ChevronDown)
    fireEvent.click(buttons[1]);
    expect(setTemperatureFn).toHaveBeenCalledWith("climate.living_room", 71);
  });

  it("shows N/A on error", () => {
    setupHook({ isError: true });
    render(<ClimateCard />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows -- when loading", () => {
    setupHook({ isLoading: true });
    render(<ClimateCard />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("disables buttons when loading", () => {
    setupHook({ isLoading: true });
    render(<ClimateCard />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
