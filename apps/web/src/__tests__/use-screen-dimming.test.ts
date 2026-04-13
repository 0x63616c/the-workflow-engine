import { useScreenDimming } from "@/hooks/use-screen-dimming";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSetBrightness = vi.fn().mockResolvedValue(undefined);

vi.mock("@capacitor-community/screen-brightness", () => ({
  ScreenBrightness: {
    setBrightness: (...args: unknown[]) => mockSetBrightness(...args),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(true),
  },
}));

describe("useScreenDimming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetBrightness.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts fading screen after timeout when enabled", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    // Before timeout: no calls
    vi.advanceTimersByTime(999);
    expect(mockSetBrightness).not.toHaveBeenCalled();

    // Trigger the dim timeout
    vi.advanceTimersByTime(1);

    // After one fade interval, first step fires
    vi.advanceTimersByTime(50);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalled();
    const firstCall = mockSetBrightness.mock.calls[0][0] as { brightness: number };
    expect(firstCall.brightness).toBeLessThan(1.0);
    expect(firstCall.brightness).toBeGreaterThan(0.2);
  });

  it("reaches target brightness after full fade duration", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    // Trigger dim timeout
    vi.advanceTimersByTime(1000);
    // Run all fade steps (20 steps * 50ms = 1000ms)
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    const calls = mockSetBrightness.mock.calls.map(
      (c) => (c[0] as { brightness: number }).brightness,
    );
    expect(calls[calls.length - 1]).toBeCloseTo(0.2, 5);
  });

  it("does not dim before timeout", () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(999);

    expect(mockSetBrightness).not.toHaveBeenCalled();
  });

  it("does not dim when disabled", async () => {
    renderHook(() => useScreenDimming({ enabled: false, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).not.toHaveBeenCalled();
  });

  it("restores brightness to 1.0 instantly on touchstart", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    // Trigger dim and let fade complete
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
    mockSetBrightness.mockClear();

    document.dispatchEvent(new Event("touchstart"));
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalledWith({ brightness: 1.0 });
  });

  it("cancels fade mid-animation and restores instantly on touchstart", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    // Trigger dim timeout
    vi.advanceTimersByTime(1000);
    // Advance partway through fade (5 of 20 steps)
    vi.advanceTimersByTime(250);
    await vi.runAllTimersAsync();

    mockSetBrightness.mockClear();

    // Touch during fade — should snap to 1.0, no more fade steps
    document.dispatchEvent(new Event("touchstart"));
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalledWith({ brightness: 1.0 });

    // Advance remaining fade time — no more fade calls should happen
    mockSetBrightness.mockClear();
    vi.advanceTimersByTime(750);
    await vi.runAllTimersAsync();

    const fadeCalls = mockSetBrightness.mock.calls.filter(
      (c) => (c[0] as { brightness: number }).brightness < 1.0,
    );
    expect(fadeCalls).toHaveLength(0);
  });

  it("resets dim timer on touchstart", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    // Partway through initial timer, touch resets it
    vi.advanceTimersByTime(500);
    document.dispatchEvent(new Event("touchstart"));
    mockSetBrightness.mockClear();

    // 999ms after touch — dim timeout not yet elapsed, no fade steps
    vi.advanceTimersByTime(999);
    expect(mockSetBrightness).not.toHaveBeenCalled();

    // 1ms more — dim timeout fires; 50ms more — first fade interval fires
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalled();
    const firstCall = mockSetBrightness.mock.calls[0][0] as { brightness: number };
    expect(firstCall.brightness).toBeLessThan(1.0);
    expect(firstCall.brightness).toBeGreaterThan(0.2);
  });

  it("restores brightness to 1.0 on unmount", async () => {
    const { unmount } = renderHook(() =>
      useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }),
    );

    // Dim first
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();
    mockSetBrightness.mockClear();

    unmount();
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalledWith({ brightness: 1.0 });
  });

  it("does not call setBrightness when not native platform", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).not.toHaveBeenCalled();

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });
});
