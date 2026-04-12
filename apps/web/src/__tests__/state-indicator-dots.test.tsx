import { StateIndicatorDots } from "@/components/art-clock/state-indicator-dots";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("StateIndicatorDots", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders count dot elements", () => {
    render(<StateIndicatorDots count={9} activeIndex={0} />);
    const dots = screen.getAllByTestId(/^state-dot-/);
    expect(dots).toHaveLength(9);
  });

  it("active dot has opacity-100 style", () => {
    render(<StateIndicatorDots count={9} activeIndex={3} />);
    const activeDot = screen.getByTestId("state-dot-3");
    expect(activeDot).toHaveStyle({ opacity: "1" });
  });

  it("inactive dots have opacity 0.2", () => {
    render(<StateIndicatorDots count={9} activeIndex={0} />);
    const inactiveDot = screen.getByTestId("state-dot-1");
    expect(inactiveDot).toHaveStyle({ opacity: "0.2" });
  });

  it("only the active dot has full opacity", () => {
    render(<StateIndicatorDots count={9} activeIndex={4} />);
    const allDots = screen.getAllByTestId(/^state-dot-/);
    const fullOpacityDots = allDots.filter((d) => d.getAttribute("style")?.includes("opacity: 1"));
    expect(fullOpacityDots).toHaveLength(1);
  });

  it("8 inactive dots have reduced opacity when activeIndex is 4", () => {
    render(<StateIndicatorDots count={9} activeIndex={4} />);
    const allDots = screen.getAllByTestId(/^state-dot-/);
    const reducedDots = allDots.filter((d) => d.getAttribute("style")?.includes("opacity: 0.2"));
    expect(reducedDots).toHaveLength(8);
  });
});
