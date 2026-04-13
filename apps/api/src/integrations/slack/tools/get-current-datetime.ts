import { tool } from "ai";
import { z } from "zod";

const TIMEZONE = "Australia/Sydney";

export const getCurrentDateTime = tool({
  description: "Get the current date and time",
  inputSchema: z.object({}),
  execute: async () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      formatted: now.toLocaleString("en-AU", { timeZone: TIMEZONE }),
      dayOfWeek: now.toLocaleDateString("en-AU", {
        weekday: "long",
        timeZone: TIMEZONE,
      }),
      timezone: TIMEZONE,
    };
  },
});
