import { WireframeGlobe } from "@/components/art-clock/states/wireframe-globe";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock @react-three/fiber and @react-three/drei — no WebGL in jsdom
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <canvas data-testid="three-canvas">{children}</canvas>
  ),
  useFrame: vi.fn(),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Billboard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Line: () => null,
}));

describe("WireframeGlobe", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without throwing", () => {
    expect(() => render(<WireframeGlobe />)).not.toThrow();
  });

  it("renders a canvas element", () => {
    render(<WireframeGlobe />);
    expect(screen.getByTestId("three-canvas")).toBeInTheDocument();
  });

  it("renders time overlay div", () => {
    render(<WireframeGlobe />);
    expect(screen.getByTestId("globe-time-overlay")).toBeInTheDocument();
  });
});
