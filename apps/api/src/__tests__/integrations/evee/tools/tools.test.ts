import { describe, expect, it } from "vitest";
import { executeTool, getTool } from "../../../../integrations/evee/tools";

describe("get-current-date-time", () => {
  it("is registered", () => {
    expect(getTool("get-current-date-time")).toBeDefined();
  });

  it("returns current date/time info", async () => {
    const result = (await executeTool("get-current-date-time", {})) as {
      iso: string;
      utc: string;
      dayOfWeek: string;
      timezone: string;
    };
    expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.timezone).toBe("UTC");
  });
});

describe("roll-dice", () => {
  it("is registered", () => {
    expect(getTool("roll-dice")).toBeDefined();
  });

  it("rolls the correct number of dice", async () => {
    const result = (await executeTool("roll-dice", { count: 3, sides: 6 })) as {
      rolls: number[];
      total: number;
    };
    expect(result.rolls).toHaveLength(3);
    expect(result.rolls.every((r) => r >= 1 && r <= 6)).toBe(true);
    expect(result.total).toBe(result.rolls.reduce((a, b) => a + b, 0));
  });

  it("rejects invalid input", async () => {
    await expect(executeTool("roll-dice", { count: 0, sides: 6 })).rejects.toThrow();
  });
});
