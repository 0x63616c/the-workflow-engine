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

describe("LightsCard", () => {
  it("shows on/total count", () => {
    render(<LightsCard />);
    expect(screen.getByText("3 of 5 on")).toBeInTheDocument();
  });

  it("renders All On and All Off buttons", () => {
    render(<LightsCard />);
    expect(screen.getByText(/all on/i, { selector: "button" })).toBeInTheDocument();
    expect(screen.getByText(/all off/i, { selector: "button" })).toBeInTheDocument();
  });

  it("calls turnOn when All On clicked", () => {
    render(<LightsCard />);
    fireEvent.click(screen.getByText(/all on/i, { selector: "button" }));
    expect(turnOnFn).toHaveBeenCalledOnce();
  });

  it("calls turnOff when All Off clicked", () => {
    render(<LightsCard />);
    fireEvent.click(screen.getByText(/all off/i, { selector: "button" }));
    expect(turnOffFn).toHaveBeenCalledOnce();
  });

  it("shows Unavailable and disables buttons on error", () => {
    setupHook({ isError: true });
    render(<LightsCard />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/all on/i, { selector: "button" })).toBeDisabled();
    expect(screen.getByText(/all off/i, { selector: "button" })).toBeDisabled();
  });

  it("shows loading state and disables buttons", () => {
    setupHook({ isLoading: true });
    render(<LightsCard />);
    expect(screen.getByText(/— of —/i)).toBeInTheDocument();
    expect(screen.getByText(/all on/i, { selector: "button" })).toBeDisabled();
    expect(screen.getByText(/all off/i, { selector: "button" })).toBeDisabled();
  });
});
