import { ConstellationMap } from "@/components/art-clock/states/constellation-map";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCtx = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  fillStyle: "",
  font: "",
  textAlign: "left" as CanvasTextAlign,
  letterSpacing: "",
};

describe("ConstellationMap", () => {
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
    expect(() => render(<ConstellationMap />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<ConstellationMap />);
    expect(screen.getByTestId("constellation-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<ConstellationMap />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<ConstellationMap />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<ConstellationMap />);
    expect(screen.getByTestId("constellation-time-overlay")).toBeInTheDocument();
  });
});
