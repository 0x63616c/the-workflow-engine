import { z } from "zod";
import { registerTool } from "./registry";

const MAX_DICE_COUNT = 100;
const MAX_SIDES = 100;
const MIN_SIDES = 2;

registerTool({
  name: "roll-dice",
  description: "Roll one or more dice with a given number of sides",
  inputSchema: z.object({
    count: z.number().min(1).max(MAX_DICE_COUNT).describe("Number of dice to roll"),
    sides: z.number().min(MIN_SIDES).max(MAX_SIDES).describe("Number of sides per die"),
  }),
  outputSchema: z.object({
    rolls: z.array(z.number()),
    total: z.number(),
  }),
  execute: async ({ count, sides }) => {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
  },
});
