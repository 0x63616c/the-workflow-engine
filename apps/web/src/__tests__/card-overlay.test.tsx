import { CardOverlay } from "@/components/hub/card-overlay";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("clock overlay has no dismiss button", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);
    expect(screen.queryByTestId("clock-dismiss")).not.toBeInTheDocument();
  });

  it("tapping the clock overlay background calls contractCard", () => {
    useCardExpansionStore.setState({ expandedCardId: "clock" });
    render(<CardOverlay />);

    fireEvent.click(screen.getByTestId("card-overlay-content"));

    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });
});
