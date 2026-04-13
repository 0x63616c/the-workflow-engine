import { CountdownCardMini } from "@/components/hub/countdown-card";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("CountdownCardMini", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows next event title and days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        nextEvent={{
          id: 1,
          title: "Coachella W2",
          date: "2026-04-16",
          createdAt: "",
          updatedAt: "",
        }}
      />,
    );

    expect(screen.getByText("Coachella W2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows 'No events' when nextEvent is null", () => {
    render(<CountdownCardMini nextEvent={null} />);
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("shows 'Today' when event is today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        nextEvent={{
          id: 1,
          title: "Today Event",
          date: "2026-04-11",
          createdAt: "",
          updatedAt: "",
        }}
      />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("today")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows '1 day' for tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        nextEvent={{
          id: 1,
          title: "Tomorrow Event",
          date: "2026-04-12",
          createdAt: "",
          updatedAt: "",
        }}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
