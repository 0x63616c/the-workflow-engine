import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("web app", () => {
  it("can import and use shared schema validation", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: "test" });
    expect(result.success).toBe(true);
  });
});
