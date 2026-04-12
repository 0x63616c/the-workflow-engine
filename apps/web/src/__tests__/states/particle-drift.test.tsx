import { ParticleDrift } from "@/components/art-clock/states/particle-drift";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCtx = {
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  fillStyle: "",
};

describe("ParticleDrift", () => {
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
    expect(() => render(<ParticleDrift />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<ParticleDrift />);
    expect(screen.getByTestId("particle-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<ParticleDrift />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<ParticleDrift />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<ParticleDrift />);
    expect(screen.getByTestId("particle-time-overlay")).toBeInTheDocument();
  });
});
