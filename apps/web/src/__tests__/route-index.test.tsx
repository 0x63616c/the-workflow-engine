import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hub/widget-grid", () => ({
  WidgetGrid: () => <div data-testid="widget-grid" />,
}));
vi.mock("@/components/hub/card-overlay", () => ({
  CardOverlay: () => <div data-testid="card-overlay-mock" />,
}));

beforeEach(() => {
  useCardExpansionStore.setState({ expandedCardId: null });
});

afterEach(() => {
  cleanup();
});

describe("route index", () => {
  it("renders WidgetGrid and CardOverlay", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");
    render(<HomePage />);
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
    expect(screen.getByTestId("card-overlay-mock")).toBeInTheDocument();
  });
});
