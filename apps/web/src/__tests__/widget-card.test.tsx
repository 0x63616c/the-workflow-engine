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

  it("sets gridColumn and gridRow styles", () => {
    render(
      <BentoCard testId="test-card" gridColumn="1 / 3" gridRow="1 / 3">
        Content
      </BentoCard>,
    );
    const el = screen.getByTestId("test-card");
    expect(el.style.gridColumn).toBe("1 / 3");
    expect(el.style.gridRow).toBe("1 / 3");
  });

  it("applies colorScheme bg and border classes", () => {
    render(
      <BentoCard
        testId="test-card"
        colorScheme={{
          bg: "bg-gradient-to-br from-sky-500/15",
          border: "border-sky-500/10",
        }}
      >
        Content
      </BentoCard>,
    );
    const el = screen.getByTestId("test-card");
    expect(el.className).toContain("bg-gradient-to-br");
    expect(el.className).toContain("border-sky-500/10");
  });

  it("applies custom borderRadius class", () => {
    render(
      <BentoCard testId="test-card" borderRadius="rounded-3xl">
        Content
      </BentoCard>,
    );
    const el = screen.getByTestId("test-card");
    expect(el.className).toContain("rounded-3xl");
  });

  it("uses default rounded-2xl when no borderRadius override", () => {
    render(<BentoCard testId="test-card">Content</BentoCard>);
    const el = screen.getByTestId("test-card");
    expect(el.className).toContain("rounded-2xl");
  });
});
