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
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
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

vi.mock("@/hooks/use-climate", () => ({
  useClimate: () => ({
    entityId: "climate.living_room",
    friendlyName: "Living Room AC",
    currentTemp: 72,
    targetTemp: 72,
    tempUnit: "F",
    hvacMode: "cool",
    fanOn: false,
    isLoading: false,
    isError: false,
    turnFanOn: vi.fn(),
    turnFanOff: vi.fn(),
    setTemperature: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-app-config", () => ({
  useAppConfig: () => ({
    get: () => null,
    set: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-weather", () => ({
  useWeather: () => ({
    temperature: 72,
    condition: "Clear sky",
    conditionCode: 0,
    highTemp: 80,
    lowTemp: 65,
    uvIndex: 4,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/use-stocks", () => ({
  useStocks: () => ({
    stocks: [],
    crypto: [],
    isLoading: false,
    isError: false,
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

  it("renders all widget cards", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("widget-card-clock")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-countdown")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-music")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-lights")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-fan")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-climate")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-wifi")).toBeInTheDocument();
    expect(screen.getByTestId("widget-card-settings")).toBeInTheDocument();
  });

  it("uses 6-column grid layout", () => {
    render(<WidgetGrid />);

    const grid = screen.getByTestId("widget-grid");
    expect(grid.style.gridTemplateColumns).toBe("repeat(6, 1fr)");
  });

  it("renders clock card", () => {
    render(<WidgetGrid />);

    const clock = screen.getByTestId("widget-card-clock");
    expect(clock).toBeInTheDocument();
    expect(clock.textContent).toContain("PM");
  });

  it("has hub-container and widget-grid test IDs", () => {
    render(<WidgetGrid />);

    expect(screen.getByTestId("hub-container")).toBeInTheDocument();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });

  it("renders 60 placeholder background cells (6 cols x 10 rows)", () => {
    render(<WidgetGrid />);
    const placeholders = screen.getAllByTestId(/^grid-placeholder-/);
    expect(placeholders).toHaveLength(60);
  });

  it("placeholder cells are aria-hidden", () => {
    render(<WidgetGrid />);

    const placeholders = screen.getAllByTestId(/^grid-placeholder-/);
    for (const cell of placeholders) {
      expect(cell).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("hub-container fills available space", () => {
    render(<WidgetGrid />);
    const hub = screen.getByTestId("hub-container");
    expect(hub).toBeInTheDocument();
    expect(hub.className).toContain("bg-background");
  });

  it("does not use static gridTemplateRows", () => {
    render(<WidgetGrid />);

    const grid = screen.getByTestId("widget-grid");
    expect(grid.style.gridTemplateRows).not.toBe("repeat(4, 1fr)");
  });
});
