import { BentoCard } from "@/components/hub/bento-card";
import { CardErrorBoundary } from "@/components/hub/card-error-boundary";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function ThrowingWidget({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Widget crashed");
  }
  return <span>Working widget</span>;
}

function StableWidget() {
  return <span>Stable widget</span>;
}

describe("CardErrorBoundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders children when no error", () => {
    render(
      <CardErrorBoundary>
        <span>Hello</span>
      </CardErrorBoundary>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows recovering state when child throws", () => {
    render(
      <CardErrorBoundary>
        <ThrowingWidget />
      </CardErrorBoundary>,
    );
    expect(screen.getByText("Recovering...")).toBeInTheDocument();
    expect(screen.queryByText("Working widget")).not.toBeInTheDocument();
  });

  it("auto-retries after delay", () => {
    render(
      <CardErrorBoundary>
        <ThrowingWidget />
      </CardErrorBoundary>,
    );
    expect(screen.getByText("Recovering...")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Still recovering because throw happens again on re-render
    expect(screen.getByText("Recovering...")).toBeInTheDocument();
  });

  it("shows unavailable after exhausting retries", () => {
    render(
      <CardErrorBoundary>
        <ThrowingWidget />
      </CardErrorBoundary>,
    );

    // Exhaust all 3 auto-retries
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }

    expect(screen.getByText("Widget unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("manual retry resets error state", () => {
    render(
      <CardErrorBoundary>
        <ThrowingWidget />
      </CardErrorBoundary>,
    );

    // Exhaust auto-retries
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    // Re-throws, so back to recovering with reset count
    expect(screen.getByText("Recovering...")).toBeInTheDocument();
  });

  it("does not affect sibling cards when one crashes", () => {
    render(
      <div>
        <BentoCard testId="crashing-card">
          <ThrowingWidget />
        </BentoCard>
        <BentoCard testId="stable-card">
          <StableWidget />
        </BentoCard>
      </div>,
    );

    expect(screen.getByText("Recovering...")).toBeInTheDocument();
    expect(screen.getByText("Stable widget")).toBeInTheDocument();
    expect(screen.getByTestId("stable-card")).toBeInTheDocument();
  });

  it("logs error to console", () => {
    render(
      <CardErrorBoundary>
        <ThrowingWidget />
      </CardErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      "[CardErrorBoundary] Widget crash:",
      expect.any(Error),
      expect.any(String),
    );
  });
});
