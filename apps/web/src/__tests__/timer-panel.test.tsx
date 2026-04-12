import { TimerPanel } from "@/components/timer/timer-panel";
import { useNavigationStore } from "@/stores/navigation-store";
import { useTimerStore } from "@/stores/timer-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setViewFn = vi.fn();

vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn(
    (selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
      selector({ view: "timer", setView: setViewFn }),
  ),
}));

vi.mock("@/hooks/use-swipe", () => ({
  useSwipe: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

afterEach(() => {
  cleanup();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
});

describe("TimerPanel", () => {
  it("renders back button", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("back button calls setView('hub')", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(setViewFn).toHaveBeenCalledWith("hub");
  });

  it("renders preset buttons 1m, 5m, 10m, 15m", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: "1m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15m" })).toBeInTheDocument();
  });

  it("clicking 1m preset starts timer with 60000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "1m" }));
    expect(useTimerStore.getState().duration_MS).toBe(60_000);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("clicking 5m preset starts timer with 300000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "5m" }));
    expect(useTimerStore.getState().duration_MS).toBe(300_000);
  });

  it("clicking 10m preset starts timer with 600000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "10m" }));
    expect(useTimerStore.getState().duration_MS).toBe(600_000);
  });

  it("clicking 15m preset starts timer with 900000ms", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "15m" }));
    expect(useTimerStore.getState().duration_MS).toBe(900_000);
  });

  it("start button is disabled when minutes and seconds are both 0", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /start timer/i })).toBeDisabled();
  });

  it("start button is enabled after entering non-zero seconds", () => {
    render(<TimerPanel />);
    const [, secondsInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(secondsInput, { target: { value: "30" } });
    expect(screen.getByRole("button", { name: /start timer/i })).not.toBeDisabled();
  });

  it("start button starts timer with custom time (1m30s = 90000ms)", () => {
    render(<TimerPanel />);
    const [minutesInput, secondsInput] = screen.getAllByRole("spinbutton");
    fireEvent.change(minutesInput, { target: { value: "1" } });
    fireEvent.change(secondsInput, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));
    expect(useTimerStore.getState().duration_MS).toBe(90_000);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("pause button shown when running, calls pause", () => {
    useTimerStore.setState({ status: "running", duration_MS: 60_000, remaining_MS: 60_000 });
    render(<TimerPanel />);
    const pauseBtn = screen.getByRole("button", { name: /pause timer/i });
    expect(pauseBtn).toBeInTheDocument();
    fireEvent.click(pauseBtn);
    expect(useTimerStore.getState().status).toBe("paused");
  });

  it("resume button shown when paused, calls resume", () => {
    useTimerStore.setState({ status: "paused", duration_MS: 60_000, remaining_MS: 30_000 });
    render(<TimerPanel />);
    const resumeBtn = screen.getByRole("button", { name: /resume timer/i });
    expect(resumeBtn).toBeInTheDocument();
    fireEvent.click(resumeBtn);
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("reset button shown when running, calls reset", () => {
    useTimerStore.setState({ status: "running", duration_MS: 60_000, remaining_MS: 60_000 });
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: /reset timer/i }));
    expect(useTimerStore.getState().status).toBe("idle");
  });

  it("flash overlay shown when status is done", () => {
    useTimerStore.setState({ status: "done", duration_MS: 5_000, remaining_MS: 0 });
    render(<TimerPanel />);
    expect(document.querySelector(".animate-\\[timer-flash")).toBeTruthy();
  });

  it("flash overlay not shown when status is running", () => {
    useTimerStore.setState({ status: "running", duration_MS: 60_000, remaining_MS: 60_000 });
    render(<TimerPanel />);
    expect(document.querySelector(".animate-\\[timer-flash")).toBeFalsy();
  });
});
