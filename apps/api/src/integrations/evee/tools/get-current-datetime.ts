import { z } from "zod";
import { registerTool } from "./registry";

registerTool({
  name: "get-current-datetime",
  description: "Get the current date and time in UTC. Convert to the user's timezone if known.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    iso: z.string(),
    utc: z.string(),
    dayOfWeek: z.string(),
    timezone: z.string(),
  }),
  execute: async () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      utc: now.toUTCString(),
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
      timezone: "UTC",
    };
  },
});
