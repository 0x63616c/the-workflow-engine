import { CardOverlay } from "@/components/hub/card-overlay";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toString: vi.fn().mockResolvedValue("<svg>mock-qr</svg>"),
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mock"),
  },
}));

vi.mock("@/hooks/use-build-hash", () => ({
  useBuildHash: () => ({ data: { hash: "abc1234", deployedAt: null } }),
}));

describe("CardOverlay", () => {
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

  it("renders nothing when no card expanded", () => {
    render(<CardOverlay />);
    expect(screen.queryByTestId("card-overlay")).not.toBeInTheDocument();
  });

  it("renders backdrop when a card is expanded", () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    render(<CardOverlay />);
    expect(screen.getByTestId("card-overlay-backdrop")).toBeInTheDocument();
  });

  it("backdrop click calls contractCard", () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    render(<CardOverlay />);

    fireEvent.click(screen.getByTestId("card-overlay-backdrop"));

    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("renders expanded content container when card expanded", () => {
    useCardExpansionStore.setState({ expandedCardId: "weather" });
    render(<CardOverlay />);
    expect(screen.getByTestId("card-overlay-content")).toBeInTheDocument();
  });

  it("clock expanded view is fullscreen with no backdrop", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);
    expect(screen.queryByTestId("card-overlay-backdrop")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-overlay-content")).toBeInTheDocument();
  });

  it("clock dismiss button is hidden by default (opacity 0, pointer-events none)", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);
    const btn = screen.getByTestId("clock-dismiss");
    expect(btn).toHaveStyle({ opacity: "0", pointerEvents: "none" });
  });

  it("clock dismiss button becomes visible after tapping the clock view", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);

    fireEvent.click(screen.getByTestId("card-overlay-content"));

    const btn = screen.getByTestId("clock-dismiss");
    expect(btn).toHaveStyle({ opacity: "1", pointerEvents: "auto" });
  });

  it("clock dismiss button auto-hides after 10 seconds", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);

    fireEvent.click(screen.getByTestId("card-overlay-content"));
    const btn = screen.getByTestId("clock-dismiss");
    expect(btn).toHaveStyle({ opacity: "1" });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(btn).toHaveStyle({ opacity: "0" });
  });

  it("clock dismiss button calls contractCard", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);

    fireEvent.click(screen.getByTestId("card-overlay-content"));
    fireEvent.click(screen.getByTestId("clock-dismiss"));

    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });
});
