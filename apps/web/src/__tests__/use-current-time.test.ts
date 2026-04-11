import { useCurrentTime } from "@/hooks/use-current-time";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useCurrentTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a Date object on initial render", () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current).toBeInstanceOf(Date);
  });

  it("returns current time on initial render", () => {
    const { result } = renderHook(() => useCurrentTime());
    expect(result.current.getHours()).toBe(14);
    expect(result.current.getMinutes()).toBe(23);
  });

  it("updates after interval elapses", () => {
    const { result } = renderHook(() => useCurrentTime());
    const initial = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.getTime()).toBeGreaterThan(initial);
  });

  it("uses custom interval", () => {
    const { result } = renderHook(() => useCurrentTime(500));
    const initial = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.getTime()).toBeGreaterThan(initial);
  });

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useCurrentTime());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
