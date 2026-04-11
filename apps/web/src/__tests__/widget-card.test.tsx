import { WidgetCard } from "@/components/hub/widget-card";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Clock } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("WidgetCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title and value", () => {
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" />);

    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" onClick={onClick} />);

    fireEvent.click(screen.getByTestId("widget-card-test"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stops propagation on click", () => {
    const parentClick = vi.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents: test wrapper only
      <div onClick={parentClick}>
        <WidgetCard id="test" icon={Clock} title="Test" value="123" />
      </div>,
    );

    fireEvent.click(screen.getByTestId("widget-card-test"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("has cursor-pointer when onClick is provided", () => {
    const onClick = vi.fn();
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" onClick={onClick} />);

    expect(screen.getByTestId("widget-card-test").className).toContain("cursor-pointer");
  });

  it("does not have cursor-pointer without onClick", () => {
    render(<WidgetCard id="test" icon={Clock} title="Test" value="123" />);

    expect(screen.getByTestId("widget-card-test").className).not.toContain("cursor-pointer");
  });
});
