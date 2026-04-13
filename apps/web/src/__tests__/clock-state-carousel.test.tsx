import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock all state components so they render identifiable divs without canvas/WebGL
vi.mock("@/components/art-clock/art-clock", () => ({
  ArtClock: () => <div data-testid="state-default-clock" />,
}));
vi.mock("@/components/art-clock/states/constellation-map", () => ({
  ConstellationMap: () => <div data-testid="state-constellation-map" />,
}));
vi.mock("@/components/art-clock/states/waveform-pulse", () => ({
  WaveformPulse: () => <div data-testid="state-waveform-pulse" />,
}));
vi.mock("@/components/art-clock/states/particle-drift", () => ({
  ParticleDrift: () => <div data-testid="state-particle-drift" />,
}));
vi.mock("@/components/art-clock/states/solar-system", () => ({
  SolarSystem: () => <div data-testid="state-solar-system" />,
}));
vi.mock("@/components/art-clock/states/earth-moon", () => ({
  EarthMoon: () => <div data-testid="state-earth-moon" />,
}));
vi.mock("@/components/art-clock/states/pixel-art", () => ({
  PixelArt: () => <div data-testid="state-pixel-art" />,
}));
vi.mock("@/components/art-clock/states/game-of-life", () => ({
  GameOfLife: () => <div data-testid="state-game-of-life" />,
}));
vi.mock("@/components/art-clock/states/flow-field", () => ({
  FlowField: () => <div data-testid="state-flow-field" />,
}));
vi.mock("@/components/art-clock/states/lissajous", () => ({
  Lissajous: () => <div data-testid="state-lissajous" />,
}));

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      onPointerDown,
      ...props
    }: React.ComponentPropsWithRef<"div"> & { onDragEnd?: unknown }) => (
      <div {...props} onPointerDown={onPointerDown as React.PointerEventHandler}>
        {children}
      </div>
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: (_mv: unknown, _fn: unknown) => ({ get: () => 0 }),
  animate: vi.fn(),
}));

describe("ClockStateCarousel", () => {
  beforeEach(() => {
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  afterEach(() => {
    cleanup();
    useNavigationStore.setState({ view: "clock", clockStateIndex: 0 });
  });

  it("renders state-default-clock when clockStateIndex is 0", () => {
    render(<ClockStateCarousel />);
    expect(screen.getByTestId("state-default-clock")).toBeInTheDocument();
  });

  it("renders state-constellation-map when clockStateIndex is 1", () => {
    useNavigationStore.setState({ clockStateIndex: 1 });
    render(<ClockStateCarousel />);
    expect(screen.getByTestId("state-constellation-map")).toBeInTheDocument();
  });

  it("renders state-solar-system when clockStateIndex is 4", () => {
    useNavigationStore.setState({ clockStateIndex: 4 });
    render(<ClockStateCarousel />);
    expect(screen.getByTestId("state-solar-system")).toBeInTheDocument();
  });

  it("renders StateIndicatorDots with matching activeIndex", () => {
    useNavigationStore.setState({ clockStateIndex: 5 });
    render(<ClockStateCarousel />);
    const activeDot = screen.getByTestId("state-dot-5");
    const indicator = activeDot.querySelector("span");
    expect(indicator).toHaveStyle({ opacity: "1" });
  });

  it("renders 10 indicator dots", () => {
    render(<ClockStateCarousel />);
    const dots = screen.getAllByTestId(/^state-dot-/);
    expect(dots).toHaveLength(10);
  });
});
