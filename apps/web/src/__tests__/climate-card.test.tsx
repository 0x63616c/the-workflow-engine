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

const turnFanOnFn = vi.fn();
const turnFanOffFn = vi.fn();

function setupHook(overrides = {}) {
  mockUseClimate.mockReturnValue({
    entityId: "climate.living_room",
    fanEntityId: null,
    friendlyName: "Living Room AC",
    currentTemp: 72,
    tempUnit: "F" as const,
    hvacMode: "cool",
    fanOn: false,
    isLoading: false,
    isError: false,
    turnFanOn: turnFanOnFn,
    turnFanOff: turnFanOffFn,
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
    expect(screen.getByText("72\u00b0F")).toBeInTheDocument();
  });

  it("shows hvac mode", () => {
    render(<ClimateCard />);
    expect(screen.getByText("cool")).toBeInTheDocument();
  });

  it("renders Fan On and Fan Off buttons", () => {
    render(<ClimateCard />);
    expect(screen.getByRole("button", { name: /fan on/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fan off/i })).toBeInTheDocument();
  });

  it("calls turnFanOn when Fan On clicked", () => {
    render(<ClimateCard />);
    fireEvent.click(screen.getByRole("button", { name: /fan on/i }));
    expect(turnFanOnFn).toHaveBeenCalledWith("climate.living_room", null);
  });

  it("calls turnFanOff when Fan Off clicked", () => {
    render(<ClimateCard />);
    fireEvent.click(screen.getByRole("button", { name: /fan off/i }));
    expect(turnFanOffFn).toHaveBeenCalledWith("climate.living_room", null);
  });

  it("highlights Fan On button when fan is on", () => {
    setupHook({ fanOn: true });
    render(<ClimateCard />);
    const fanOnBtn = screen.getByRole("button", { name: /fan on/i });
    expect(fanOnBtn.className).toContain("bg-white/10");
  });

  it("highlights Fan Off button when fan is off", () => {
    setupHook({ fanOn: false });
    render(<ClimateCard />);
    const fanOffBtn = screen.getByRole("button", { name: /fan off/i });
    expect(fanOffBtn.className).toContain("bg-white/10");
  });

  it("shows Unavailable and disables buttons on error", () => {
    setupHook({ isError: true });
    render(<ClimateCard />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fan on/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fan off/i })).toBeDisabled();
  });

  it("shows loading state and disables buttons", () => {
    setupHook({ isLoading: true });
    render(<ClimateCard />);
    expect(screen.getByText("--\u00b0F")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fan on/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fan off/i })).toBeDisabled();
  });
});
