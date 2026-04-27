import { formatDate, formatTime, greetingForHour } from "@/lib/time";
import { describe, expect, it } from "vitest";

describe("greetingForHour", () => {
  it("returns morning between 5 and 11", () => {
    expect(greetingForHour(5)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
  });
  it("returns afternoon between 12 and 16", () => {
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(16)).toBe("Good afternoon");
  });
  it("returns evening from 17 onwards and before 5", () => {
    expect(greetingForHour(17)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
    expect(greetingForHour(0)).toBe("Good evening");
    expect(greetingForHour(4)).toBe("Good evening");
  });
});

describe("formatTime", () => {
  it("formats 14:05 as 2:05 PM", () => {
    expect(formatTime(new Date(2026, 3, 26, 14, 5))).toEqual({ time: "2:05", suffix: "PM" });
  });
  it("formats 00:30 as 12:30 AM", () => {
    expect(formatTime(new Date(2026, 3, 26, 0, 30))).toEqual({ time: "12:30", suffix: "AM" });
  });
  it("formats noon as 12:00 PM", () => {
    expect(formatTime(new Date(2026, 3, 26, 12, 0))).toEqual({ time: "12:00", suffix: "PM" });
  });
});

describe("formatDate", () => {
  it("formats Sunday April 26 in uppercase", () => {
    expect(formatDate(new Date(2026, 3, 26))).toBe("SUNDAY, APRIL 26");
  });
});
