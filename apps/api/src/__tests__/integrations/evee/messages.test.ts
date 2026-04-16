import { describe, expect, it } from "vitest";
import { buildMessagesFromRecords } from "../../../integrations/evee/messages";

describe("buildMessagesFromRecords", () => {
  it("builds user message with display name prefix", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "hello",
          userId: "U123",
          displayName: "Calum",
          createdAt: new Date(),
        },
      ],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("<U123|Calum>: hello");
  });

  it("builds assistant message without prefix", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "assistant",
          content: "hi there!",
          userId: null,
          displayName: null,
          createdAt: new Date(),
        },
      ],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("assistant");
    expect(result[0].content).toBe("hi there!");
  });

  it("builds multimodal message when images exist for a user message", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "check this out",
          userId: "U123",
          displayName: "Calum",
          createdAt: new Date(),
        },
      ],
      [
        {
          id: "img_1",
          messageId: "msg_1",
          mimeType: "image/png",
          data: Buffer.from("fakepng"),
          sizeBytes: 7,
        },
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
    expect(Array.isArray(result[0].content)).toBe(true);

    const content = result[0].content as Array<{ type: string }>;
    expect(content[0]).toEqual({ type: "text", text: "<U123|Calum>: check this out" });
    expect(content[1]).toMatchObject({ type: "image", mimeType: "image/png" });
  });

  it("preserves message order by createdAt", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_2",
          role: "assistant",
          content: "hi!",
          userId: null,
          displayName: null,
          createdAt: new Date("2026-01-01T00:01:00Z"),
        },
        {
          id: "msg_1",
          role: "user",
          content: "hey",
          userId: "U1",
          displayName: "A",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ],
      [],
    );

    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("ignores images with no messageId", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "text only",
          userId: "U1",
          displayName: "A",
          createdAt: new Date(),
        },
      ],
      [
        {
          id: "img_1",
          messageId: null,
          mimeType: "image/png",
          data: Buffer.from("orphan"),
          sizeBytes: 6,
        },
      ],
    );

    expect(result).toHaveLength(1);
    expect(typeof result[0].content).toBe("string");
  });
});
