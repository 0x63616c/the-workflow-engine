import { describe, expect, it, vi } from "vitest";
import {
  type BuildThreadOptions,
  type SlackThreadMessage,
  buildThreadMessages,
  resolveUserNames,
  stripMentions,
} from "../../../integrations/slack/thread";

const BOT_USER_ID = "UBOT123";

const mockOptions: BuildThreadOptions = {
  lookupUser: vi.fn(async (userId: string) => {
    const names: Record<string, string> = {
      U001: "Alice",
      U002: "Bob",
      [BOT_USER_ID]: "Evee",
    };
    return names[userId] ?? userId;
  }),
  downloadFile: vi.fn(async () => ({
    base64: "aW1hZ2VkYXRh",
    mimeType: "image/png",
  })),
};

describe("stripMentions", () => {
  it("removes @mentions from text", () => {
    expect(stripMentions("Hey <@U001> what do you think?")).toBe("Hey  what do you think?");
  });

  it("removes multiple mentions", () => {
    expect(stripMentions("<@U001> <@U002> hello")).toBe("hello");
  });

  it("returns empty for mention-only messages", () => {
    expect(stripMentions("<@UBOT123>")).toBe("");
  });
});

describe("resolveUserNames", () => {
  it("resolves unique user IDs", async () => {
    const messages: SlackThreadMessage[] = [
      { user: "U001", text: "hi" },
      { user: "U002", text: "hey" },
      { user: "U001", text: "again" },
    ];

    const names = await resolveUserNames(messages, mockOptions.lookupUser);

    expect(names.get("U001")).toBe("Alice");
    expect(names.get("U002")).toBe("Bob");
    expect(mockOptions.lookupUser).toHaveBeenCalledTimes(2);
  });
});

describe("buildThreadMessages", () => {
  it("builds messages with user display names", async () => {
    const raw: SlackThreadMessage[] = [{ user: "U001", text: "Hey <@UBOT123> what time is it?" }];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("<U001|Alice>: Hey  what time is it?");
  });

  it("maps bot messages to assistant role without prefix", async () => {
    const raw: SlackThreadMessage[] = [
      { user: "U001", text: "hello" },
      { user: BOT_USER_ID, text: "Hi there!" },
      { user: "U001", text: "thanks" },
    ];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("user");
    expect(messages[1]).toEqual({ role: "assistant", content: "Hi there!" });
    expect(messages[2].role).toBe("user");
  });

  it("filters out empty messages", async () => {
    const raw: SlackThreadMessage[] = [
      { user: "U001", text: "<@UBOT123>" },
      { user: "U001", text: "real message" },
    ];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("<U001|Alice>: real message");
  });

  it("handles multi-user threads", async () => {
    const raw: SlackThreadMessage[] = [
      { user: "U001", text: "what do you think?" },
      { user: "U002", text: "I agree" },
      { user: "U001", text: "<@UBOT123> help us decide" },
    ];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(3);
    expect(messages[0].content).toContain("<U001|Alice>");
    expect(messages[1].content).toContain("<U002|Bob>");
    expect(messages[2].content).toContain("<U001|Alice>");
  });

  it("handles image attachments", async () => {
    const raw: SlackThreadMessage[] = [
      {
        user: "U001",
        text: "check this out",
        files: [
          {
            name: "photo.png",
            mimetype: "image/png",
            url_private: "https://files.slack.com/photo.png",
          },
        ],
      },
    ];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(Array.isArray(messages[0].content)).toBe(true);

    const content = messages[0].content as Array<{ type: string }>;
    expect(content).toHaveLength(2);
    expect(content[0]).toEqual({
      type: "text",
      text: "<U001|Alice>: check this out",
    });
    expect(content[1]).toEqual({
      type: "image",
      image: "aW1hZ2VkYXRh",
      mimeType: "image/png",
    });
  });

  it("handles non-image files as text notes", async () => {
    const raw: SlackThreadMessage[] = [
      {
        user: "U001",
        text: "here's the report",
        files: [
          {
            name: "report.pdf",
            mimetype: "application/pdf",
            url_private: "https://files.slack.com/report.pdf",
          },
        ],
      },
    ];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("<U001|Alice>: here's the report\n[attached: report.pdf]");
  });

  it("handles mixed image and non-image files", async () => {
    const raw: SlackThreadMessage[] = [
      {
        user: "U001",
        text: "files",
        files: [
          {
            name: "photo.png",
            mimetype: "image/png",
            url_private: "https://files.slack.com/photo.png",
          },
          {
            name: "doc.pdf",
            mimetype: "application/pdf",
            url_private: "https://files.slack.com/doc.pdf",
          },
        ],
      },
    ];

    const messages = await buildThreadMessages(raw, BOT_USER_ID, mockOptions);

    expect(messages).toHaveLength(1);
    const content = messages[0].content as Array<{ type: string }>;
    expect(Array.isArray(content)).toBe(true);

    const textPart = content.find((c) => c.type === "text") as {
      type: string;
      text: string;
    };
    expect(textPart.text).toContain("[attached: doc.pdf]");

    const imagePart = content.find((c) => c.type === "image");
    expect(imagePart).toBeDefined();
  });
});
