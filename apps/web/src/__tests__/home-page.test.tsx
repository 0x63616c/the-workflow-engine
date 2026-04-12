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
    onCount: 0,
    totalCount: 0,
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
    fanEntityId: null,
    friendlyName: "Living Room AC",
    currentTemp: 72,
    tempUnit: "F",
    hvacMode: "cool",
    fanOn: false,
    isLoading: false,
    isError: false,
    targetTemp: 72,
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

describe("HomePage", () => {
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

  it("renders widget grid", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });

  it("renders clock time in clock card", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    const clock = screen.getByTestId("widget-card-clock");
    expect(clock).toBeInTheDocument();
    expect(clock.textContent).toContain("PM");
  });
});
