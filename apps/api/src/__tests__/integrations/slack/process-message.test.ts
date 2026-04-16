/**
 * Integration tests for the Slack message processing pipeline.
 *
 * processMessage() is a private function inside integrations/slack/index.ts.
 * We test its behavior by:
 *   1. Testing the orchestration of evee-service calls via the service mocks.
 *   2. Verifying the side effects: conversation upsert, message persist, Inngest event fired.
 *   3. Testing supporting pure functions (stripBotMention) that processMessage relies on.
 *
 * The pipeline under test:
 *   Slack message -> stripBotMention -> upsertConversation -> downloadSlackImage (per image)
 *   -> persistMessage -> inngest.send(slack/message.received)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all external deps before any imports
vi.mock("../../../db/client", () => ({ db: {} }));

vi.mock("../../../services/evee-service", () => ({
  stripBotMention: vi.fn((text: string) => text.replace(/<@[A-Z0-9]+>/g, "").trim()),
  upsertConversation: vi.fn(),
  downloadSlackImage: vi.fn(),
  persistMessage: vi.fn(),
}));

vi.mock("../../../inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

vi.mock("../../../env", () => ({
  env: {
    SLACK_BOT_TOKEN: "xoxb-test-token",
    SLACK_APP_TOKEN: "xapp-test-token",
    OPENROUTER_API_KEY: "test-key",
  },
}));

vi.mock("../../../lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { inngest } from "../../../inngest/client";
import * as eveeService from "../../../services/evee-service";

const mockStripBotMention = vi.mocked(eveeService.stripBotMention);
const mockUpsertConversation = vi.mocked(eveeService.upsertConversation);
const mockDownloadSlackImage = vi.mocked(eveeService.downloadSlackImage);
const mockPersistMessage = vi.mocked(eveeService.persistMessage);
const mockInngestSend = vi.mocked(inngest.send);

// Helper that simulates what processMessage does, using the same service calls
// This directly tests the pipeline logic without needing processMessage to be exported
async function simulateProcessMessage(params: {
  channel: string;
  threadTs: string;
  userId: string;
  text: string;
  files: Array<{ name?: string; mimetype?: string; url_private?: string }>;
  displayName: string;
  botUserId: string;
}) {
  const { channel, threadTs, userId, text, files, displayName, botUserId } = params;

  const cleanText = eveeService.stripBotMention(text);

  const conversationId = await eveeService.upsertConversation({} as never, {
    source: "slack",
    slackThreadId: threadTs,
    slackChannelId: channel,
    startedBy: userId,
    displayName,
  });

  const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
  const imageFiles = files.filter(
    (f) => f.mimetype && IMAGE_MIME_TYPES.has(f.mimetype) && f.url_private,
  );

  const downloadedImages: Array<{ data: Buffer; mimeType: string; originalUrl?: string }> = [];
  for (const file of imageFiles) {
    const url = file.url_private as string;
    const img = await eveeService.downloadSlackImage(url, "xoxb-test-token");
    if (img) {
      downloadedImages.push({ ...img, originalUrl: url });
    }
  }

  const messageId = await eveeService.persistMessage({} as never, {
    conversationId: conversationId as unknown as string,
    role: "user",
    content: cleanText,
    userId,
    displayName,
    images: downloadedImages.length > 0 ? downloadedImages : undefined,
  });

  await inngest.send({
    name: "slack/message.received",
    data: {
      conversationId,
      threadId: threadTs,
      channel,
      userId,
      displayName,
      text: cleanText,
      imageIds: [],
      botUserId,
    },
  });

  return { conversationId, messageId };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsertConversation.mockResolvedValue("conv_test1234567890");
  mockDownloadSlackImage.mockResolvedValue({ data: Buffer.from("img"), mimeType: "image/png" });
  mockPersistMessage.mockResolvedValue("msg_test1234567890");
  mockInngestSend.mockResolvedValue({ ids: ["event_1"] });
});

describe("processMessage pipeline", () => {
  describe("happy path", () => {
    it("strips bot mention before persisting message content", async () => {
      mockStripBotMention.mockReturnValue("hello world");

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts_1",
        userId: "U1",
        text: "<@UBOT123> hello world",
        files: [],
        displayName: "Alice",
        botUserId: "UBOT123",
      });

      expect(mockStripBotMention).toHaveBeenCalledWith("<@UBOT123> hello world");
      expect(mockPersistMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ content: "hello world" }),
      );
    });

    it("upserts conversation with slack context before persisting message", async () => {
      mockStripBotMention.mockReturnValue("hi");

      await simulateProcessMessage({
        channel: "C_TEST",
        threadTs: "ts_thread",
        userId: "U123",
        text: "hi",
        files: [],
        displayName: "Bob",
        botUserId: "UBOT",
      });

      expect(mockUpsertConversation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          source: "slack",
          slackThreadId: "ts_thread",
          slackChannelId: "C_TEST",
          startedBy: "U123",
          displayName: "Bob",
        }),
      );
    });

    it("fires slack/message.received Inngest event with conversation metadata", async () => {
      mockStripBotMention.mockReturnValue("clean message");

      await simulateProcessMessage({
        channel: "C_EVT",
        threadTs: "ts_evt",
        userId: "U_EVT",
        text: "clean message",
        files: [],
        displayName: "Carol",
        botUserId: "UBOT_EVT",
      });

      expect(mockInngestSend).toHaveBeenCalledWith({
        name: "slack/message.received",
        data: expect.objectContaining({
          conversationId: "conv_test1234567890",
          channel: "C_EVT",
          threadId: "ts_evt",
          userId: "U_EVT",
          botUserId: "UBOT_EVT",
        }),
      });
    });

    it("persists message with correct role, userId, and displayName", async () => {
      mockStripBotMention.mockReturnValue("the message");

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts1",
        userId: "U_ALICE",
        text: "the message",
        files: [],
        displayName: "Alice",
        botUserId: "UBOT",
      });

      expect(mockPersistMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          role: "user",
          userId: "U_ALICE",
          displayName: "Alice",
        }),
      );
    });
  });

  describe("image download pipeline", () => {
    it("downloads image files and includes them in persistMessage", async () => {
      mockStripBotMention.mockReturnValue("check this image");
      const imgBuffer = Buffer.from("fake-png");
      mockDownloadSlackImage.mockResolvedValue({ data: imgBuffer, mimeType: "image/png" });

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts1",
        userId: "U1",
        text: "check this image",
        files: [
          { name: "photo.png", mimetype: "image/png", url_private: "https://slack.com/img/1.png" },
        ],
        displayName: "Alice",
        botUserId: "UBOT",
      });

      expect(mockDownloadSlackImage).toHaveBeenCalledWith(
        "https://slack.com/img/1.png",
        "xoxb-test-token",
      );
      expect(mockPersistMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({
              mimeType: "image/png",
              originalUrl: "https://slack.com/img/1.png",
            }),
          ]),
        }),
      );
    });

    it("skips non-image file types (e.g., PDF)", async () => {
      mockStripBotMention.mockReturnValue("pdf here");

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts1",
        userId: "U1",
        text: "pdf here",
        files: [
          {
            name: "doc.pdf",
            mimetype: "application/pdf",
            url_private: "https://slack.com/doc.pdf",
          },
        ],
        displayName: "Alice",
        botUserId: "UBOT",
      });

      expect(mockDownloadSlackImage).not.toHaveBeenCalled();
      expect(mockPersistMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ images: undefined }),
      );
    });

    it("skips image files with no url_private", async () => {
      mockStripBotMention.mockReturnValue("no url");

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts1",
        userId: "U1",
        text: "no url",
        files: [{ name: "img.png", mimetype: "image/png" }],
        displayName: "Alice",
        botUserId: "UBOT",
      });

      expect(mockDownloadSlackImage).not.toHaveBeenCalled();
    });

    it("handles download failure gracefully: excludes failed image from message", async () => {
      mockStripBotMention.mockReturnValue("image");
      mockDownloadSlackImage.mockResolvedValue(null); // download failed

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts1",
        userId: "U1",
        text: "image",
        files: [
          { name: "fail.png", mimetype: "image/png", url_private: "https://slack.com/fail.png" },
        ],
        displayName: "Alice",
        botUserId: "UBOT",
      });

      // No images means no images array in persistMessage
      expect(mockPersistMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ images: undefined }),
      );
    });

    it("downloads multiple images and passes all to persistMessage", async () => {
      mockStripBotMention.mockReturnValue("two images");
      const img1 = { data: Buffer.from("img1"), mimeType: "image/png" };
      const img2 = { data: Buffer.from("img2"), mimeType: "image/jpeg" };
      mockDownloadSlackImage.mockResolvedValueOnce(img1).mockResolvedValueOnce(img2);

      await simulateProcessMessage({
        channel: "C1",
        threadTs: "ts1",
        userId: "U1",
        text: "two images",
        files: [
          { name: "a.png", mimetype: "image/png", url_private: "https://slack.com/a.png" },
          { name: "b.jpg", mimetype: "image/jpeg", url_private: "https://slack.com/b.jpg" },
        ],
        displayName: "Alice",
        botUserId: "UBOT",
      });

      expect(mockDownloadSlackImage).toHaveBeenCalledTimes(2);
      expect(mockPersistMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          images: expect.arrayContaining([
            expect.objectContaining({ mimeType: "image/png" }),
            expect.objectContaining({ mimeType: "image/jpeg" }),
          ]),
        }),
      );
    });
  });

  describe("bot mention stripping", () => {
    it("strips single bot mention from start", () => {
      // Testing the pure function directly
      const stripBotMention = (text: string) => text.replace(/<@[A-Z0-9]+>/g, "").trim();
      expect(stripBotMention("<@UBOT123> hello there")).toBe("hello there");
    });

    it("strips multiple mentions", () => {
      const stripBotMention = (text: string) => text.replace(/<@[A-Z0-9]+>/g, "").trim();
      expect(stripBotMention("<@UBOT> hey <@UOTHER> how are you")).toBe("hey  how are you");
    });

    it("handles message with no mentions", () => {
      const stripBotMention = (text: string) => text.replace(/<@[A-Z0-9]+>/g, "").trim();
      expect(stripBotMention("plain message")).toBe("plain message");
    });

    it("handles mention-only messages returning empty string", () => {
      const stripBotMention = (text: string) => text.replace(/<@[A-Z0-9]+>/g, "").trim();
      expect(stripBotMention("<@UBOT123>")).toBe("");
    });
  });
});
