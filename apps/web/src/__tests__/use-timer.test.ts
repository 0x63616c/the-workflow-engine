import { useTimer } from "@/hooks/use-timer";
import { useTimerStore } from "@/stores/timer-store";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("use-timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  });

  it("interval is started when status is running", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(10_000);
    });

    expect(useTimerStore.getState().status).toBe("running");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(useTimerStore.getState().remaining_MS).toBeLessThan(10_000);
  });

  it("interval is cleared when status changes to paused", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(10_000);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const afterOneTick = useTimerStore.getState().remaining_MS;

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(useTimerStore.getState().remaining_MS).toBe(afterOneTick);
  });

  it("interval is cleared when status changes to done", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(150);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(useTimerStore.getState().status).toBe("done");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(useTimerStore.getState().remaining_MS).toBe(0);
  });

  it("tick fires with elapsed time (uses Date.now() delta, not fixed 100ms)", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start(10_000);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 3 ticks at ~100ms each
    expect(useTimerStore.getState().remaining_MS).toBeLessThanOrEqual(9_700);
    expect(useTimerStore.getState().remaining_MS).toBeGreaterThan(9_500);
  });
});
