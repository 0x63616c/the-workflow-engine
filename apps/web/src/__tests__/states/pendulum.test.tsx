import { Pendulum } from "@/components/art-clock/states/pendulum";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("Pendulum", () => {
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
    expect(() => render(<Pendulum />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<Pendulum />);
    expect(screen.getByTestId("pendulum-canvas")).toBeInTheDocument();
  });

  it("calls requestAnimationFrame on mount", () => {
    render(<Pendulum />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("calls cancelAnimationFrame on unmount", () => {
    const { unmount } = render(<Pendulum />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("renders time overlay", () => {
    render(<Pendulum />);
    expect(screen.getByTestId("pendulum-time-overlay")).toBeInTheDocument();
  });
});
