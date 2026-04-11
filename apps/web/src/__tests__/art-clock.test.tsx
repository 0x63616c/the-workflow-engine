import { ArtClock, formatDate, formatTime } from "@/components/art-clock/art-clock";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("formatTime", () => {
  it("formats afternoon time as 12h with PM", () => {
    const date = new Date(2026, 3, 11, 14, 5);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "2", minutes: "05", period: "PM" });
  });

  it("formats morning time with AM", () => {
    const date = new Date(2026, 3, 11, 9, 30);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "9", minutes: "30", period: "AM" });
  });

  it("formats midnight as 12:00 AM", () => {
    const date = new Date(2026, 3, 11, 0, 0);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "12", minutes: "00", period: "AM" });
  });

  it("formats noon as 12:03 PM", () => {
    const date = new Date(2026, 3, 11, 12, 3);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "12", minutes: "03", period: "PM" });
  });
});

describe("formatDate", () => {
  it("formats date as uppercase WEEKDAY, DD MON YY", () => {
    const date = new Date(2026, 3, 11); // Saturday April 11, 2026
    const result = formatDate(date);
    expect(result).toBe("SATURDAY, 11 APR 26");
  });

  it("formats another date correctly", () => {
    const date = new Date(2026, 0, 1); // Thursday January 1, 2026
    const result = formatDate(date);
    expect(result).toBe("THURSDAY, 1 JAN 26");
  });
});

describe("ArtClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders hours", () => {
    render(<ArtClock />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders AM/PM period", () => {
    render(<ArtClock />);
    expect(screen.getByText("PM")).toBeInTheDocument();
  });

  it("renders minutes", () => {
    render(<ArtClock />);
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("renders the colon separator", () => {
    render(<ArtClock />);
    const colon = screen.getByText(":");
    expect(colon).toBeInTheDocument();
  });

  it("renders minute progress bar", () => {
    render(<ArtClock />);
    const bar = document.querySelector(".origin-left.bg-foreground");
    expect(bar).toBeInTheDocument();
    expect((bar as HTMLElement).style.transform).toBe("scaleX(0)");
  });

  it("progress bar advances with seconds", () => {
    vi.setSystemTime(new Date(2026, 3, 11, 14, 23, 30));
    render(<ArtClock />);
    const bar = document.querySelector(".origin-left.bg-foreground");
    expect((bar as HTMLElement).style.transform).toBe("scaleX(0.5)");
  });

  it("renders formatted date", () => {
    render(<ArtClock />);
    expect(screen.getByText("SATURDAY, 11 APR 26")).toBeInTheDocument();
  });
});
