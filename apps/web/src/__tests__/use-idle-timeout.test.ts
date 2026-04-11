import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls callback after timeout", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000));

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not call callback before timeout", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000));

    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
  });

  it("resets timer on touchstart", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000));

    vi.advanceTimersByTime(500);
    document.dispatchEvent(new Event("touchstart"));
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", () => {
    const callback = vi.fn();
    renderHook(() => useIdleTimeout(callback, 1000, { enabled: false }));

    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(callback, 1000));

    unmount();
    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });
});
