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

describe("buildMessagesFromRecords (additional cases)", () => {
  it("handles empty message array", () => {
    const result = buildMessagesFromRecords([], []);
    expect(result).toEqual([]);
  });

  it("handles user message with no userId/displayName (no prefix added)", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "anonymous message",
          userId: null,
          displayName: null,
          createdAt: new Date(),
        },
      ],
      [],
    );

    expect(result[0].content).toBe("anonymous message");
  });

  it("handles multiple images per message (all included in content array)", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "two pics",
          userId: "U1",
          displayName: "Alice",
          createdAt: new Date(),
        },
      ],
      [
        {
          id: "img_1",
          messageId: "msg_1",
          mimeType: "image/png",
          data: Buffer.from("a"),
          sizeBytes: 1,
        },
        {
          id: "img_2",
          messageId: "msg_1",
          mimeType: "image/jpeg",
          data: Buffer.from("b"),
          sizeBytes: 1,
        },
      ],
    );

    expect(result).toHaveLength(1);
    const content = result[0].content as Array<{ type: string; mimeType?: string }>;
    const imageItems = content.filter((c) => c.type === "image");
    expect(imageItems).toHaveLength(2);
    expect(imageItems[0].mimeType).toBe("image/png");
    expect(imageItems[1].mimeType).toBe("image/jpeg");
  });

  it("mixed conversation: user, assistant, user with image preserves order", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "question",
          userId: "U1",
          displayName: "Alice",
          createdAt: new Date(base.getTime()),
        },
        {
          id: "msg_2",
          role: "assistant",
          content: "answer",
          userId: null,
          displayName: null,
          createdAt: new Date(base.getTime() + 1000),
        },
        {
          id: "msg_3",
          role: "user",
          content: "follow up with image",
          userId: "U1",
          displayName: "Alice",
          createdAt: new Date(base.getTime() + 2000),
        },
      ],
      [
        {
          id: "img_1",
          messageId: "msg_3",
          mimeType: "image/png",
          data: Buffer.from("img"),
          sizeBytes: 3,
        },
      ],
    );

    expect(result).toHaveLength(3);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toBe("<U1|Alice>: question");
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toBe("answer");
    expect(result[2].role).toBe("user");
    expect(Array.isArray(result[2].content)).toBe(true);
  });

  it("images with non-matching messageId are not attached to messages", () => {
    const result = buildMessagesFromRecords(
      [
        {
          id: "msg_1",
          role: "user",
          content: "text only",
          userId: "U1",
          displayName: "Alice",
          createdAt: new Date(),
        },
      ],
      [
        {
          id: "img_wrong",
          messageId: "msg_OTHER",
          mimeType: "image/png",
          data: Buffer.from("x"),
          sizeBytes: 1,
        },
      ],
    );

    expect(typeof result[0].content).toBe("string");
  });
});
