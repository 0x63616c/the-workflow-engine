import { tool } from "ai";
import { z } from "zod";

export const getCurrentDateTime = tool({
  description: "Get the current date and time in UTC. Convert to the user's timezone if known.",
  inputSchema: z.object({}),
  execute: async () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      utc: now.toUTCString(),
      dayOfWeek: now.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }),
      timezone: "UTC",
    };
  },
});
