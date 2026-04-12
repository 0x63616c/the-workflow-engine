import { WidgetGrid } from "@/components/hub/widget-grid";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    countdownEvents: {
      listUpcoming: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
  },
}));

vi.mock("@/hooks/use-lights", () => ({
  useLights: () => ({
    onCount: 3,
    totalCount: 5,
    isLoading: false,
    isError: false,
    turnOn: vi.fn(),
    turnOff: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-sonos", () => ({
  useSonos: () => ({
    players: [],
    activeSpeaker: null,
    isLoading: false,
    isError: false,
    sendCommand: vi.fn(),
    setVolume: vi.fn(),
  }),
}));

describe("WidgetGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("renders all 12 widget cards", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("widget-card-weather")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-countdown")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-photo")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-wifi")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-email")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-system")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-quote")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-theme")).toBeInTheDocument();
  });

  it("uses 6-column grid layout", () => {
    render(<WidgetGrid />);

    const grid = screen.getByTestId("widget-grid");
    expect(grid.style.gridTemplateColumns).toBe("repeat(6, 1fr)");
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

  it("has hub-container and widget-grid test IDs", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("hub-container")).toBeInTheDocument();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });
});
