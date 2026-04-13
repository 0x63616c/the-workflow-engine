import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/hooks/use-build-hash", () => ({
  useBuildHash: () => ({ data: { hash: "abc1234", deployedAt: null } }),
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

describe("HomePage hub integration", () => {
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

  async function renderHomePage() {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    return render(<HomePage />);
  }

  it("shows grid on initial render", async () => {
    await renderHomePage();
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
  });

  it("no overlay initially", async () => {
    await renderHomePage();
    expect(screen.queryByTestId("card-overlay")).not.toBeInTheDocument();
  });

  it("tapping clock card opens overlay", async () => {
    await renderHomePage();

    fireEvent.click(screen.getByTestId("widget-card-clock"));

    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });

  it("auto-expands clock after idle timeout", async () => {
    await renderHomePage();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });

  it("idle timer only active when no card is expanded", async () => {
    useCardExpansionStore.setState({ expandedCardId: "lights" });
    await renderHomePage();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(useCardExpansionStore.getState().expandedCardId).toBe("lights");
  });
});
