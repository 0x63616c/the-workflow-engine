import { describe, expect, it } from "vitest";
import { toSlackMrkdwn } from "../../../integrations/slack/format";

describe("toSlackMrkdwn", () => {
  it("converts bold markdown to slack mrkdwn", () => {
    expect(toSlackMrkdwn("This is **bold** text")).toContain("*bold*");
  });

  it("converts links to slack format", () => {
    const result = toSlackMrkdwn("Check [this link](https://example.com)");
    expect(result).toContain("<https://example.com|this link>");
  });

  it("preserves inline code", () => {
    const result = toSlackMrkdwn("Use `console.log` for debugging");
    expect(result).toContain("`console.log`");
  });

  it("handles plain text unchanged", () => {
    expect(toSlackMrkdwn("Just plain text")).toBe("Just plain text\n");
  });

  it("handles mixed content", () => {
    const result = toSlackMrkdwn(
      "Hey **friend**, check [this](https://example.com) and use `code`",
    );
    expect(result).toContain("*friend*");
    expect(result).toContain("<https://example.com|this>");
    expect(result).toContain("`code`");
  });
});
