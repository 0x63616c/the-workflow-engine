import { LightsCard } from "@/components/hub/lights-card";
import * as useLightsModule from "@/hooks/use-lights";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-lights");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseLights = vi.mocked(useLightsModule.useLights);

const turnOnFn = vi.fn();
const turnOffFn = vi.fn();

function setupHook(overrides = {}) {
  mockUseLights.mockReturnValue({
    onCount: 3,
    totalCount: 5,
    isLoading: false,
    isError: false,
    turnOn: turnOnFn,
    turnOff: turnOffFn,
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

function getToggleButton() {
  return screen.getByText(/all (on|off)/i).closest("button") as HTMLButtonElement;
}

describe("LightsCard", () => {
  it("shows on/total count", () => {
    render(<LightsCard />);
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("shows All On button when not all lights on", () => {
    render(<LightsCard />);
    expect(getToggleButton().textContent).toBe("All On");
  });

  it("shows All Off button when all lights on", () => {
    setupHook({ onCount: 5, totalCount: 5 });
    render(<LightsCard />);
    expect(getToggleButton().textContent).toBe("All Off");
  });

  it("calls turnOn when All On clicked", () => {
    render(<LightsCard />);
    fireEvent.click(getToggleButton());
    expect(turnOnFn).toHaveBeenCalledOnce();
  });

  it("calls turnOff when All Off clicked", () => {
    setupHook({ onCount: 5, totalCount: 5 });
    render(<LightsCard />);
    fireEvent.click(getToggleButton());
    expect(turnOffFn).toHaveBeenCalledOnce();
  });

  it("shows N/A on error", () => {
    setupHook({ isError: true });
    render(<LightsCard />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows -- when loading", () => {
    setupHook({ isLoading: true });
    render(<LightsCard />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("disables toggle button on error", () => {
    setupHook({ isError: true });
    render(<LightsCard />);
    expect(getToggleButton()).toBeDisabled();
  });
});
