import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders clock time from ArtClock", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
  });

  it("renders formatted date from ArtClock", async () => {
    const { Route } = await import("@/routes/index");
    const HomePage = Route.options.component;
    if (!HomePage) throw new Error("HomePage component not found on route");

    render(<HomePage />);

    expect(screen.getByText("SATURDAY, 11 APR 26")).toBeInTheDocument();
  });
});
