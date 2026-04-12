import { useNavigationStore } from "@/stores/navigation-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

describe("HomePage hub integration", () => {
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

  async function renderHomePage() {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    return render(<HomePage />);
  }

  it("initially shows clock visible and hub hidden", async () => {
    await renderHomePage();

    const clockLayer = screen.getByTestId("clock-layer");
    const hubLayer = screen.getByTestId("hub-layer");
    expect(clockLayer.style.opacity).toBe("1");
    expect(hubLayer.style.opacity).toBe("0");
  });

  it("initially has pointer-events auto on clock, none on hub", async () => {
    await renderHomePage();

    const clockLayer = screen.getByTestId("clock-layer");
    const hubLayer = screen.getByTestId("hub-layer");
    expect(clockLayer.style.pointerEvents).toBe("auto");
    expect(hubLayer.style.pointerEvents).toBe("none");
  });

  it("tap clock opens hub", async () => {
    await renderHomePage();

    fireEvent.click(screen.getByTestId("clock-layer"));

    const hubLayer = screen.getByTestId("hub-layer");
    expect(hubLayer.style.opacity).toBe("1");
    expect(hubLayer.style.pointerEvents).toBe("auto");
  });

  it("tap hub-container returns to clock", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    fireEvent.click(screen.getByTestId("hub-container"));

    expect(useNavigationStore.getState().view).toBe("clock");
  });

  it("widget card tap does NOT return to clock", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    fireEvent.click(screen.getByTestId("widget-card-weather"));

    expect(useNavigationStore.getState().view).toBe("hub");
  });

  it("auto-returns to clock after idle timeout", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });

    expect(useNavigationStore.getState().view).toBe("clock");
  });

  it("clock widget tap returns to clock", async () => {
    useNavigationStore.setState({ view: "hub" });
    await renderHomePage();

    fireEvent.click(screen.getByTestId("widget-card-clock"));

    expect(useNavigationStore.getState().view).toBe("clock");
  });
});
