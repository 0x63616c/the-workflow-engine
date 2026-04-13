import { describe, expect, it, vi } from "vitest";

vi.mock("../../../integrations/slack/llm", () => ({
  chatCompletion: vi.fn().mockResolvedValue("**Hello** friend!"),
}));

vi.mock("../../../integrations/slack/format", () => ({
  toSlackMrkdwn: vi.fn((text: string) => text.replace(/\*\*(.*?)\*\*/g, "*$1*")),
}));

vi.mock("../../../lib/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { handleConversation } from "../../../integrations/slack/handler";
import { chatCompletion } from "../../../integrations/slack/llm";

describe("handleConversation", () => {
  const mockReply = vi.fn();
  const mockSetStatus = vi.fn();
  const context = { threadTs: "123.456", channel: "C001", userId: "U001" };

  it("sets status, gets response, formats, and replies", async () => {
    await handleConversation({
      messages: [{ role: "user", content: "hi" }],
      reply: mockReply,
      setStatus: mockSetStatus,
      context,
    });

    expect(mockSetStatus).toHaveBeenCalledWith("is thinking...");
    expect(chatCompletion).toHaveBeenCalled();
    expect(mockReply).toHaveBeenCalledWith("*Hello* friend!");
  });

  it("replies with error message on failure", async () => {
    vi.mocked(chatCompletion).mockRejectedValueOnce(new Error("LLM down"));

    await handleConversation({
      messages: [{ role: "user", content: "hi" }],
      reply: mockReply,
      setStatus: mockSetStatus,
      context,
    });

    expect(mockReply).toHaveBeenCalledWith(
      "Sorry, I'm having trouble right now. Try again in a bit.",
    );
  });
});
