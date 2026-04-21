import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eveeToolExecutor } from "../../inngest/functions/evee-tool-executor";

vi.mock("../../db/client", () => ({ db: {} }));

vi.mock("../../services/evee-service", () => ({
  executeTool: vi.fn(),
  persistToolCall: vi.fn(),
}));

import * as eveeService from "../../services/evee-service";
const mockExecuteTool = vi.mocked(eveeService.executeTool);
const mockPersistToolCall = vi.mocked(eveeService.persistToolCall);

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
  const engine = new InngestTestEngine({
    function: eveeToolExecutor,
  });
  return { engine };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPersistToolCall.mockResolvedValue("tc_persisted1234567" as never);
});

describe("eveeToolExecutor function", () => {
  it("executes tool and returns output in the function return value", async () => {
    mockExecuteTool.mockResolvedValue({
      toolName: "rollDice",
      output: { value: 4 },
      error: null,
      durationMs: 10,
    });

    const { engine } = makeEngine();

    const { result } = await engine.execute({
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
        {
          id: "persist",
          handler: () => undefined,
        },
      ],
    });

    expect(result).toMatchObject({
      callId: "tc_test1234567890123",
      output: { value: 4 },
      error: null,
      durationMs: 10,
    });
  });

  it("captures tool error in the function return value without rethrowing", async () => {
    mockExecuteTool.mockResolvedValue({
      toolName: "rollDice",
      output: null,
      error: "Tool exploded",
      durationMs: 5,
    });

    const { engine } = makeEngine();

    const { result } = await engine.execute({
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
        {
          id: "persist",
          handler: () => undefined,
        },
      ],
    });

    expect(result).toMatchObject({
      callId: "tc_test1234567890123",
      error: "Tool exploded",
      output: null,
    });
  });

  it("includes callId, output, error, and durationMs in returned object", async () => {
    const { engine } = makeEngine();

    const { result } = await engine.execute({
      events: [BASE_EVENT],
      steps: [
        {
          id: "execute",
          handler: () => ({ output: "ok", error: null, durationMs: 1 }),
        },
        {
          id: "persist",
          handler: () => undefined,
        },
      ],
    });

    expect(result).toMatchObject({
      callId: "tc_test1234567890123",
      output: "ok",
      error: null,
      durationMs: 1,
    });
  });

  it("includes durationMs in the returned object", async () => {
    const { engine } = makeEngine();

    const { result } = await engine.execute({
      events: [BASE_EVENT],
      steps: [
        {
          id: "execute",
          handler: () => ({ output: { result: 3 }, error: null, durationMs: 42 }),
        },
        {
          id: "persist",
          handler: () => undefined,
        },
      ],
    });

    expect(result).toMatchObject({ durationMs: 42 });
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

  describe("executeStep: persist step", () => {
    it("persist step calls persistToolCall with correct data", async () => {
      const { engine } = makeEngine();

      await engine.executeStep("persist", {
        events: [BASE_EVENT],
        steps: [
          {
            id: "execute",
            handler: () => ({ output: { value: 4 }, error: null, durationMs: 10 }),
          },
        ],
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
          durationMs: 10,
        }),
      );
    });
  });
});
