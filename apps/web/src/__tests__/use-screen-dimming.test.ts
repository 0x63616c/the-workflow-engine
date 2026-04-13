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

  it("dims screen after timeout when enabled", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalledWith({ brightness: 0.2 });
  });

  it("does not dim before timeout", () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(999);

    expect(mockSetBrightness).not.toHaveBeenCalled();
  });

  it("does not dim when disabled", async () => {
    renderHook(() => useScreenDimming({ enabled: false, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).not.toHaveBeenCalled();
  });

  it("restores brightness to 1.0 on touchstart", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    mockSetBrightness.mockClear();

    document.dispatchEvent(new Event("touchstart"));
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).toHaveBeenCalledWith({ brightness: 1.0 });
  });

  it("resets dim timer on touchstart", async () => {
    renderHook(() => useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }));

    vi.advanceTimersByTime(500);
    document.dispatchEvent(new Event("touchstart"));
    mockSetBrightness.mockClear();

    // 999ms after touch — timer not yet elapsed
    vi.advanceTimersByTime(999);
    expect(mockSetBrightness).not.toHaveBeenCalledWith({ brightness: 0.2 });

    // 1ms more — now the full 1000ms has elapsed since touch
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();
    expect(mockSetBrightness).toHaveBeenCalledWith({ brightness: 0.2 });
  });

  it("restores brightness to 1.0 on unmount", async () => {
    const { unmount } = renderHook(() =>
      useScreenDimming({ enabled: true, dimTimeout_MS: 1000, dimBrightness: 0.2 }),
    );

    // Dim first
    vi.advanceTimersByTime(1000);
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

    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(mockSetBrightness).not.toHaveBeenCalled();

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });
});
