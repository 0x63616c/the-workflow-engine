import { BentoCard } from "@/components/hub/bento-card";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("BentoCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children", () => {
    render(<BentoCard testId="test-card">Hello</BentoCard>);

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <BentoCard testId="test-card" onClick={onClick}>
        Content
      </BentoCard>,
    );

    fireEvent.click(screen.getByTestId("test-card"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stops propagation on click", () => {
    const parentClick = vi.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents: test wrapper only
      <div onClick={parentClick}>
        <BentoCard testId="test-card">Content</BentoCard>
      </div>,
    );

    fireEvent.click(screen.getByTestId("test-card"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("has cursor-pointer when onClick is provided", () => {
    const onClick = vi.fn();
    render(
      <BentoCard testId="test-card" onClick={onClick}>
        Content
      </BentoCard>,
    );

    expect(screen.getByTestId("test-card").className).toContain("cursor-pointer");
  });

  it("does not have cursor-pointer without onClick", () => {
    render(<BentoCard testId="test-card">Content</BentoCard>);

    expect(screen.getByTestId("test-card").className).not.toContain("cursor-pointer");
  });

  it("sets grid area style when gridArea is provided", () => {
    render(
      <BentoCard testId="test-card" gridArea="weather">
        Content
      </BentoCard>,
    );

    expect(screen.getByTestId("test-card").style.gridArea).toBe("weather");
  });
});
