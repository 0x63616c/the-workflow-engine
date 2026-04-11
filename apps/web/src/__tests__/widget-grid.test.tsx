import { WidgetGrid } from "@/components/hub/widget-grid";
import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
  },
}));

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

  it("renders all 7 widget cards", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("widget-card-weather")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-wifi")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-theme")).toBeInTheDocument();
  });

  it("renders weather data", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("72\u00b0")).toBeInTheDocument();
    expect(screen.getByText("Partly Cloudy")).toBeInTheDocument();
  });

  it("renders clock with current time", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
  });

  it("renders lights count", () => {
    render(<WidgetGrid />);

    expect(screen.getByText("3 of 5 on")).toBeInTheDocument();
  });

  it("has hub-container and widget-grid test IDs", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("hub-container")).toBeInTheDocument();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });
});
