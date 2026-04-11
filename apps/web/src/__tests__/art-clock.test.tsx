import { ArtClock, formatDate, formatTime } from "@/components/art-clock/art-clock";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("formatTime", () => {
  it("formats afternoon time correctly", () => {
    const date = new Date(2026, 3, 11, 14, 5);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "14", minutes: "05" });
  });

  it("does not add leading zero to single-digit hours", () => {
    const date = new Date(2026, 3, 11, 9, 30);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "9", minutes: "30" });
  });

  it("formats midnight as 0:00", () => {
    const date = new Date(2026, 3, 11, 0, 0);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "0", minutes: "00" });
  });

  it("pads single-digit minutes with leading zero", () => {
    const date = new Date(2026, 3, 11, 12, 3);
    const result = formatTime(date);
    expect(result).toEqual({ hours: "12", minutes: "03" });
  });
});

describe("formatDate", () => {
  it("formats date as uppercase WEEKDAY DD MON", () => {
    const date = new Date(2026, 3, 11); // Saturday April 11, 2026
    const result = formatDate(date);
    expect(result).toBe("SATURDAY 11 APR");
  });

  it("formats another date correctly", () => {
    const date = new Date(2026, 0, 1); // Thursday January 1, 2026
    const result = formatDate(date);
    expect(result).toBe("THURSDAY 1 JAN");
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
    expect(screen.getByText("14")).toBeInTheDocument();
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

  it("colon has pulse animation class", () => {
    render(<ArtClock />);
    const colon = screen.getByText(":");
    expect(colon.className).toContain("animate-[pulse-colon_2s_ease-in-out_infinite]");
  });

  it("renders formatted date", () => {
    render(<ArtClock />);
    expect(screen.getByText("SATURDAY 11 APR")).toBeInTheDocument();
  });
});
