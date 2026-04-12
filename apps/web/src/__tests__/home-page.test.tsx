import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
    useNavigationStore.setState({ view: "clock" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useNavigationStore.setState({ view: "clock" });
  });

  it("renders clock time from ArtClock", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    const clockLayer = screen.getByTestId("clock-layer");
    expect(within(clockLayer).getByText("2")).toBeInTheDocument();
    expect(within(clockLayer).getByText("23")).toBeInTheDocument();
    expect(within(clockLayer).getByText("PM")).toBeInTheDocument();
  });

  it("renders formatted date from ArtClock", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByText("SATURDAY 11 APR 26")).toBeInTheDocument();
  });
});
