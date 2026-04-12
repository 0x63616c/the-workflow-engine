import { WaveformPulse } from "@/components/art-clock/states/waveform-pulse";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCtx = {
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  fillStyle: "",
};

describe("WaveformPulse", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx as never);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders without throwing", () => {
    expect(() => render(<WaveformPulse />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<WaveformPulse />);
    expect(screen.getByTestId("waveform-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<WaveformPulse />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<WaveformPulse />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<WaveformPulse />);
    expect(screen.getByTestId("waveform-time-overlay")).toBeInTheDocument();
  });
});
