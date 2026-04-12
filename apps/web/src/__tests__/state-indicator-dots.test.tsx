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

  it("active dot indicator has opacity-100 style", () => {
    render(<StateIndicatorDots count={9} activeIndex={3} />);
    const activeDot = screen.getByTestId("state-dot-3");
    const indicator = activeDot.querySelector("span");
    expect(indicator).toHaveStyle({ opacity: "1" });
  });

  it("inactive dot indicators have opacity 0.2", () => {
    render(<StateIndicatorDots count={9} activeIndex={0} />);
    const inactiveDot = screen.getByTestId("state-dot-1");
    const indicator = inactiveDot.querySelector("span");
    expect(indicator).toHaveStyle({ opacity: "0.2" });
  });

  it("only the active dot indicator has full opacity", () => {
    render(<StateIndicatorDots count={9} activeIndex={4} />);
    const allDots = screen.getAllByTestId(/^state-dot-/);
    const fullOpacityDots = allDots.filter((d) =>
      d.querySelector("span")?.getAttribute("style")?.includes("opacity: 1"),
    );
    expect(fullOpacityDots).toHaveLength(1);
  });

  it("8 inactive dot indicators have reduced opacity when activeIndex is 4", () => {
    render(<StateIndicatorDots count={9} activeIndex={4} />);
    const allDots = screen.getAllByTestId(/^state-dot-/);
    const reducedDots = allDots.filter((d) =>
      d.querySelector("span")?.getAttribute("style")?.includes("opacity: 0.2"),
    );
    expect(reducedDots).toHaveLength(8);
  });
});
