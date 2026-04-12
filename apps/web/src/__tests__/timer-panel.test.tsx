import { TimerPanel } from "@/components/timer/timer-panel";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { useTimerStore } from "@/stores/timer-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  useCardExpansionStore.setState({ expandedCardId: "timer" });
});

afterEach(() => {
  cleanup();
  useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  useCardExpansionStore.setState({ expandedCardId: null });
});

describe("TimerPanel", () => {
  it("renders back button", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("back button contracts card", () => {
    render(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
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
    const state = useTimerStore.getState();
    expect(state.status).toBe("running");
    expect(state.duration_MS).toBe(60_000);
  });

  it("renders Start button when idle", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("Start button is disabled when no time is set", () => {
    render(<TimerPanel />);
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
  });
});
