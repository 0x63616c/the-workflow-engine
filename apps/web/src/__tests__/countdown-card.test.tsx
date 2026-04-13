import { CountdownCardMini } from "@/components/hub/countdown-card";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function makeEvent(id: number, title: string, date: string) {
  return { id, title, date, createdAt: "", updatedAt: "" };
}

describe("CountdownCardMini", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows next event title and days remaining", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(<CountdownCardMini events={[makeEvent(1, "Coachella W2", "2026-04-16")]} />);

    expect(screen.getByText("Coachella W2")).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows 'No events' when events array is empty", () => {
    render(<CountdownCardMini events={[]} />);
    expect(screen.getByText("No events")).toBeInTheDocument();
  });

  it("shows 'Today' when event is today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(<CountdownCardMini events={[makeEvent(1, "Today Event", "2026-04-11")]} />);

    expect(screen.getByText("today")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows '1 day' for tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(<CountdownCardMini events={[makeEvent(1, "Tomorrow Event", "2026-04-12")]} />);

    expect(screen.getByText("1 day")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows up to 4 events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11));

    render(
      <CountdownCardMini
        events={[
          makeEvent(1, "Event A", "2026-04-12"),
          makeEvent(2, "Event B", "2026-04-15"),
          makeEvent(3, "Event C", "2026-04-20"),
          makeEvent(4, "Event D", "2026-05-01"),
          makeEvent(5, "Event E", "2026-06-01"),
        ]}
      />,
    );

    expect(screen.getByText("Event A")).toBeInTheDocument();
    expect(screen.getByText("Event B")).toBeInTheDocument();
    expect(screen.getByText("Event C")).toBeInTheDocument();
    expect(screen.getByText("Event D")).toBeInTheDocument();
    expect(screen.queryByText("Event E")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
