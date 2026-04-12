import { TopographicContours } from "@/components/art-clock/states/topographic-contours";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("simplex-noise", () => ({
  createNoise3D: () => () => 0,
}));

const mockCtx = {
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
};

describe("TopographicContours", () => {
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
    expect(() => render(<TopographicContours />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<TopographicContours />);
    expect(screen.getByTestId("contours-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<TopographicContours />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<TopographicContours />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<TopographicContours />);
    expect(screen.getByTestId("contours-time-overlay")).toBeInTheDocument();
  });
});
