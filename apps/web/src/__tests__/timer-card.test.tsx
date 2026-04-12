import { TimerCard } from "@/components/hub/timer-card";
import { useNavigationStore } from "@/stores/navigation-store";
import { useTimerStore } from "@/stores/timer-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setViewFn = vi.fn();

vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn(
    (selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
      selector({ view: "hub", setView: setViewFn }),
  ),
}));

vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

afterEach(() => {
  cleanup();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

describe("TimerCard", () => {
  it('renders "No timer" when status is idle', () => {
    render(<TimerCard />);
    expect(screen.getByText("No timer")).toBeInTheDocument();
  });

  it("renders formatted countdown when status is running", () => {
    useTimerStore.setState({ status: "running", duration_MS: 65_000, remaining_MS: 65_000 });
    render(<TimerCard />);
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  it('renders "Done!" when status is done', () => {
    useTimerStore.setState({ status: "done", duration_MS: 5_000, remaining_MS: 0 });
    render(<TimerCard />);
    expect(screen.getByText("Done!")).toBeInTheDocument();
  });

  it('clicking card calls setView("timer")', () => {
    render(<TimerCard />);
    fireEvent.click(screen.getByTestId("widget-card-timer"));
    expect(setViewFn).toHaveBeenCalledWith("timer");
  });

  it('has data-testid="widget-card-timer"', () => {
    render(<TimerCard />);
    expect(screen.getByTestId("widget-card-timer")).toBeInTheDocument();
  });
});

describe("formatCountdown", () => {
  it("formats 5000ms as '0:05'", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(5_000)).toBe("0:05");
  });

  it("formats 65000ms as '1:05'", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(65_000)).toBe("1:05");
  });

  it("formats 600000ms as '10:00'", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(600_000)).toBe("10:00");
  });

  it("formats 1ms as '0:01' (ceil avoids showing 0:00 while running)", async () => {
    const { formatCountdown } = await import("@/components/hub/timer-card");
    expect(formatCountdown(1)).toBe("0:01");
  });
});
