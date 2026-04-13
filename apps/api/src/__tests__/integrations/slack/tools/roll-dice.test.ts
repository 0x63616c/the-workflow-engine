import { describe, expect, it } from "vitest";
import { rollDice } from "../../../../integrations/slack/tools/roll-dice";

type RollResult = { rolls: number[]; total: number };
const execOpts = {
  toolCallId: "test",
  messages: [] as never[],
  abortSignal: AbortSignal.timeout(5000),
};

describe("rollDice tool", () => {
  it("has correct description", () => {
    expect(rollDice.description).toBe("Roll one or more dice with a given number of sides");
  });

  it("rolls the correct number of dice", async () => {
    const result = (await rollDice.execute?.({ count: 3, sides: 6 }, execOpts)) as RollResult;

    expect(result.rolls).toHaveLength(3);
    expect(result.total).toBe(result.rolls.reduce((a, b) => a + b, 0));
  });

  it("returns values within valid range", async () => {
    const result = (await rollDice.execute?.({ count: 100, sides: 6 }, execOpts)) as RollResult;

    for (const roll of result.rolls) {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });

  it("handles d20", async () => {
    const result = (await rollDice.execute?.({ count: 1, sides: 20 }, execOpts)) as RollResult;

    expect(result.rolls).toHaveLength(1);
    expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
    expect(result.rolls[0]).toBeLessThanOrEqual(20);
    expect(result.total).toBe(result.rolls[0]);
  });
});
