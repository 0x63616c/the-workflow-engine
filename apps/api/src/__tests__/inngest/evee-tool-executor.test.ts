import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eveeToolExecutor } from "../../inngest/functions/evee-tool-executor";

vi.mock("../../services/evee-service", () => ({
  executeTool: vi.fn(),
}));

import * as eveeService from "../../services/evee-service";
const mockExecuteTool = vi.mocked(eveeService.executeTool);

const BASE_EVENT = {
  name: "evee/tool-call.requested" as const,
  data: {
    callId: "tc_test1234567890123",
    conversationId: "conv_test1234567890",
    toolName: "rollDice",
    input: { sides: 6 },
    llmCallId: "llm_test1234567890123",
  },
};

function makeEngine() {
  const sendEvent = vi.fn().mockResolvedValue({ ids: [] });
  const engine = new InngestTestEngine({
    function: eveeToolExecutor,
    transformCtx: (ctx) => ({ ...ctx, step: { ...ctx.step, sendEvent } }),
  });
  return { engine, sendEvent };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("eveeToolExecutor function", () => {
  it("executes tool and emits evee/tool-call.completed with output", async () => {
    mockExecuteTool.mockResolvedValue({
      toolName: "rollDice",
      output: { value: 4 },
      error: null,
      durationMs: 10,
    });

    const { engine, sendEvent } = makeEngine();

    await engine.execute({
      events: [BASE_EVENT],
      steps: [
        {
          id: "execute",
          handler: () => ({
            output: { value: 4 },
            error: null,
            durationMs: 10,
          }),
        },
      ],
    });

    expect(sendEvent).toHaveBeenCalledWith(
      "emit-result",
      expect.objectContaining({
        name: "evee/tool-call.completed",
        data: expect.objectContaining({
          callId: "tc_test1234567890123",
          conversationId: "conv_test1234567890",
          toolName: "rollDice",
          output: { value: 4 },
          error: null,
        }),
      }),
    );
  });

  it("captures tool error in output event without rethrowing", async () => {
    mockExecuteTool.mockResolvedValue({
      toolName: "rollDice",
      output: null,
      error: "Tool exploded",
      durationMs: 5,
    });

    const { engine, sendEvent } = makeEngine();

    await engine.execute({
      events: [BASE_EVENT],
      steps: [
        {
          id: "execute",
          handler: () => ({
            output: null,
            error: "Tool exploded",
            durationMs: 5,
          }),
        },
      ],
    });

    expect(sendEvent).toHaveBeenCalledWith(
      "emit-result",
      expect.objectContaining({
        data: expect.objectContaining({
          error: "Tool exploded",
          output: null,
        }),
      }),
    );
  });

  it("includes callId, conversationId, toolName, and llmCallId in emitted event", async () => {
    const { engine, sendEvent } = makeEngine();

    await engine.execute({
      events: [BASE_EVENT],
      steps: [
        {
          id: "execute",
          handler: () => ({ output: "ok", error: null, durationMs: 1 }),
        },
      ],
    });

    expect(sendEvent).toHaveBeenCalledWith(
      "emit-result",
      expect.objectContaining({
        data: expect.objectContaining({
          callId: "tc_test1234567890123",
          conversationId: "conv_test1234567890",
          toolName: "rollDice",
          input: { sides: 6 },
          llmCallId: "llm_test1234567890123",
        }),
      }),
    );
  });

  it("includes durationMs in the emitted completion event", async () => {
    const { engine, sendEvent } = makeEngine();

    await engine.execute({
      events: [BASE_EVENT],
      steps: [
        {
          id: "execute",
          handler: () => ({ output: { result: 3 }, error: null, durationMs: 42 }),
        },
      ],
    });

    expect(sendEvent).toHaveBeenCalledWith(
      "emit-result",
      expect.objectContaining({
        data: expect.objectContaining({ durationMs: 42 }),
      }),
    );
  });

  describe("executeStep: execute step", () => {
    it("execute step runs tool and returns output", async () => {
      mockExecuteTool.mockResolvedValue({
        toolName: "rollDice",
        output: { value: 6 },
        error: null,
        durationMs: 5,
      });

      const { engine } = makeEngine();

      const { result } = await engine.executeStep("execute", {
        events: [BASE_EVENT],
      });

      expect(result).toBeDefined();
    });
  });
});
