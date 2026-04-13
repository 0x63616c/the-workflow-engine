import { describe, expect, it } from "vitest";
import { getCurrentDateTime } from "../../../../integrations/slack/tools/get-current-datetime";

describe("getCurrentDateTime tool", () => {
  it("has correct description", () => {
    expect(getCurrentDateTime.description).toBe("Get the current date and time");
  });

  it("returns valid date fields", async () => {
    const result = (await getCurrentDateTime.execute?.(
      {},
      {
        toolCallId: "test",
        messages: [],
        abortSignal: AbortSignal.timeout(5000),
      },
    )) as { iso: string; formatted: string; dayOfWeek: string; timezone: string };

    expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.formatted).toBeTruthy();
    expect(result.dayOfWeek).toMatch(
      /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/,
    );
    expect(result.timezone).toBe("Australia/Sydney");
  });
});
