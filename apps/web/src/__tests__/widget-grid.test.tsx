import { WidgetGrid } from "@/components/hub/widget-grid";
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("WidgetGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useNavigationStore.setState({ view: "hub" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useNavigationStore.setState({ view: "clock" });
  });

  it("renders all 6 widget cards", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-weather")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-notifications")).toBeInTheDocument();
  });

  it("renders placeholder values", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("72\u00b0F")).toBeInTheDocument();
    expect(screen.getByText("3 on")).toBeInTheDocument();
    expect(screen.getByText("Not playing")).toBeInTheDocument();
    expect(screen.getByText("No events")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("renders clock widget with current time", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("2:23 PM")).toBeInTheDocument();
  });

  it("has hub-container and widget-grid test IDs", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("hub-container")).toBeInTheDocument();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });
});
