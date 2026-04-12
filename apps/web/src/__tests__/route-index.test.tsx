import { useNavigationStore } from "@/stores/navigation-store";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/stores/navigation-store");
vi.mock("@/components/art-clock/art-clock", () => ({
  ArtClock: () => <div data-testid="art-clock" />,
}));
vi.mock("@/components/hub/widget-grid", () => ({
  WidgetGrid: () => <div data-testid="widget-grid" />,
}));
vi.mock("@/components/sonos/sonos-panel", () => ({
  SonosPanel: () => <div data-testid="sonos-panel" />,
}));

type View = "clock" | "hub" | "sonos";

const mockUseNavigationStore = vi.mocked(useNavigationStore);

function setupStore(view: View) {
  mockUseNavigationStore.mockImplementation(
    (selector: (s: { view: View; setView: () => void }) => unknown) =>
      selector({ view, setView: vi.fn() }) as never,
  );
}

afterEach(() => {
  cleanup();
});

describe("route index — sonos layer", () => {
  it("sonos layer is in DOM", async () => {
    setupStore("clock");
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    const { container } = render(<HomePage />);
    expect(container.querySelector("[data-testid='sonos-layer']")).toBeInTheDocument();
  });

  it("sonos layer has opacity 1 and pointer-events auto when view is sonos", async () => {
    setupStore("sonos");
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    const { container } = render(<HomePage />);
    const layer = container.querySelector("[data-testid='sonos-layer']") as HTMLElement;
    expect(layer.style.opacity).toBe("1");
    expect(layer.style.pointerEvents).toBe("auto");
  });

  it("sonos layer has opacity 0 and pointer-events none when view is hub", async () => {
    setupStore("hub");
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    const { container } = render(<HomePage />);
    const layer = container.querySelector("[data-testid='sonos-layer']") as HTMLElement;
    expect(layer.style.opacity).toBe("0");
    expect(layer.style.pointerEvents).toBe("none");
  });
});
