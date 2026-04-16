import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eveePersistToolCall } from "../../inngest/functions/evee-persist-tool-call";

vi.mock("../../db/client", () => ({ db: {} }));

vi.mock("../../services/evee-service", () => ({
  persistToolCall: vi.fn(),
}));

import * as eveeService from "../../services/evee-service";
const mockPersistToolCall = vi.mocked(eveeService.persistToolCall);

const BASE_EVENT = {
  name: "evee/tool-call.completed" as const,
  data: {
    conversationId: "conv_test1234567890",
    llmCallId: "llm_test1234567890123",
    callId: "tc_test1234567890123",
    toolName: "rollDice",
    input: { sides: 6 },
    output: { value: 4 },
    error: null as string | null,
    durationMs: 42,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPersistToolCall.mockResolvedValue("tc_persisted1234567");
});

describe("eveePersistToolCall function", () => {
  it("save step runs and calls persistToolCall service with event data", async () => {
    const t = new InngestTestEngine({ function: eveePersistToolCall });

    // executeStep runs the real step code, so the service mock will be called
    const { result } = await t.executeStep("save", {
      events: [BASE_EVENT],
    });

    expect(mockPersistToolCall).toHaveBeenCalledWith(
      expect.anything(), // db
      expect.objectContaining({
        conversationId: "conv_test1234567890",
        llmCallId: "llm_test1234567890123",
        callId: "tc_test1234567890123",
        toolName: "rollDice",
        input: { sides: 6 },
        output: { value: 4 },
        error: null,
        durationMs: 42,
      }),
    );
  });

  it("persists error string when tool call failed", async () => {
    const errorEvent = {
      ...BASE_EVENT,
      data: {
        ...BASE_EVENT.data,
        output: null,
        error: "Tool failed with timeout",
      },
    };

    const t = new InngestTestEngine({ function: eveePersistToolCall });

    await t.executeStep("save", {
      events: [errorEvent],
    });

    expect(mockPersistToolCall).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        error: "Tool failed with timeout",
        output: null,
      }),
    );
  });

  it("step runs once per invocation (not duplicated)", async () => {
    const t = new InngestTestEngine({ function: eveePersistToolCall });

    await t.executeStep("save", {
      events: [BASE_EVENT],
    });

    expect(mockPersistToolCall).toHaveBeenCalledTimes(1);
  });

  it("full function execution completes without error", async () => {
    const t = new InngestTestEngine({ function: eveePersistToolCall });

    const { result } = await t.execute({
      events: [BASE_EVENT],
      steps: [{ id: "save", handler: () => undefined }],
    });

    expect(result).toBeDefined();
  });
});
