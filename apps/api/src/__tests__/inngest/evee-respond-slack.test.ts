import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eveeRespondSlack } from "../../inngest/functions/evee-respond-slack";

vi.mock("../../services/evee-service", () => ({
  sendSlackResponse: vi.fn(),
}));

vi.mock("../../env", () => ({
  env: {
    SLACK_BOT_TOKEN: "xoxb-test-token",
  },
}));

import * as eveeService from "../../services/evee-service";
const mockSendSlackResponse = vi.mocked(eveeService.sendSlackResponse);

const BASE_EVENT = {
  name: "evee/response.ready" as const,
  data: {
    response: "Hello from Evee!",
    channel: "C_CHANNEL001",
    threadId: "thread_ts_001",
    conversationId: "conv_test1234567890",
    llmCalls: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSendSlackResponse.mockResolvedValue(undefined);
});

describe("eveeRespondSlack function", () => {
  it("post step calls sendSlackResponse with token, channel, threadId, and response", async () => {
    const t = new InngestTestEngine({ function: eveeRespondSlack });

    // executeStep runs real step code, so the mock is invoked
    await t.executeStep("post", {
      events: [BASE_EVENT],
    });

    expect(mockSendSlackResponse).toHaveBeenCalledWith(
      "xoxb-test-token",
      "C_CHANNEL001",
      "thread_ts_001",
      "Hello from Evee!",
    );
  });

  it("uses SLACK_BOT_TOKEN from env for authentication", async () => {
    const t = new InngestTestEngine({ function: eveeRespondSlack });

    await t.executeStep("post", {
      events: [BASE_EVENT],
    });

    const firstArg = mockSendSlackResponse.mock.calls[0]?.[0];
    expect(firstArg).toBe("xoxb-test-token");
  });

  it("passes channel and threadId from event data to sendSlackResponse", async () => {
    const customEvent = {
      ...BASE_EVENT,
      data: {
        ...BASE_EVENT.data,
        response: "Custom response",
        channel: "C_DIFFERENT001",
        threadId: "thread_different",
      },
    };

    const t = new InngestTestEngine({ function: eveeRespondSlack });

    await t.executeStep("post", {
      events: [customEvent],
    });

    expect(mockSendSlackResponse).toHaveBeenCalledWith(
      expect.any(String),
      "C_DIFFERENT001",
      "thread_different",
      "Custom response",
    );
  });

  it("full function execution completes without error", async () => {
    const t = new InngestTestEngine({ function: eveeRespondSlack });

    const { result } = await t.execute({
      events: [BASE_EVENT],
      steps: [{ id: "post", handler: () => undefined }],
    });

    expect(result).toBeDefined();
  });
});
