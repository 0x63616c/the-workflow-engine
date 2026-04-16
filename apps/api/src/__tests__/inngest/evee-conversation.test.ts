import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eveeConversation } from "../../inngest/functions/evee-conversation";

// Mock the db client (avoids real DB connection)
vi.mock("../../db/client", () => ({ db: {} }));

// Mock evee-service: all the pipeline calls the orchestrator makes
vi.mock("../../services/evee-service", () => ({
  buildLlmContext: vi.fn(),
  runLlmCall: vi.fn(),
  persistLlmCall: vi.fn(),
  persistMessage: vi.fn(),
}));

import * as eveeService from "../../services/evee-service";

const mockBuildLlmContext = vi.mocked(eveeService.buildLlmContext);
const mockRunLlmCall = vi.mocked(eveeService.runLlmCall);
const mockPersistLlmCall = vi.mocked(eveeService.persistLlmCall);
const mockPersistMessage = vi.mocked(eveeService.persistMessage);

const BASE_EVENT = {
  name: "slack/message.received" as const,
  data: {
    conversationId: "conv_test1234567890",
    botUserId: "UBOT123",
    threadId: "thread_ts_001",
    channel: "C_CHANNEL001",
  },
};

const CONTEXT = {
  conversationId: "conv_test1234567890",
  messages: [{ role: "user" as const, content: "hi" }],
  botUserId: "UBOT123",
};

// Create a fresh engine per test by using a factory to avoid shared mock cache
function makeEngine() {
  const sendEvent = vi.fn().mockResolvedValue({ ids: [] });
  const waitForEvent = vi.fn().mockResolvedValue(null);

  const engine = new InngestTestEngine({
    function: eveeConversation,
    transformCtx: (ctx) => ({
      ...ctx,
      step: {
        ...ctx.step,
        sendEvent,
        waitForEvent,
      },
    }),
  });

  return { engine, sendEvent, waitForEvent };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildLlmContext.mockResolvedValue(CONTEXT);
  mockRunLlmCall.mockResolvedValue({
    text: "Hello there!",
    finishReason: "stop",
    toolCalls: [],
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    providerMetadata: undefined,
  });
  mockPersistLlmCall.mockResolvedValue("llm_abc1234567890123");
  mockPersistMessage.mockResolvedValue("msg_abc1234567890123");
});

describe("eveeConversation function", () => {
  describe("happy path: message -> LLM stop -> response", () => {
    it("runs to completion when LLM returns stop finish reason", async () => {
      const { engine } = makeEngine();

      const { result } = await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_abc1234567890123",
              text: "Hello there!",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      expect(result).toBeDefined();
    });

    it("sends evee/response.ready event with correct response and metadata", async () => {
      const { engine, sendEvent } = makeEngine();

      await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_abc1234567890123",
              text: "My response text",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      expect(sendEvent).toHaveBeenCalledWith(
        "emit-response",
        expect.objectContaining({
          name: "evee/response.ready",
          data: expect.objectContaining({
            conversationId: "conv_test1234567890",
            response: "My response text",
            channel: "C_CHANNEL001",
            threadId: "thread_ts_001",
          }),
        }),
      );
    });

    it("uses fallback text 'I'm not sure what to say.' when LLM returns empty string", async () => {
      const { engine, sendEvent } = makeEngine();

      await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_empty",
              text: "",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 5, outputTokens: 0, totalTokens: 5 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      expect(sendEvent).toHaveBeenCalledWith(
        "emit-response",
        expect.objectContaining({
          data: expect.objectContaining({
            response: "I'm not sure what to say.",
          }),
        }),
      );
    });

    it("includes llmCalls summary in the response event", async () => {
      const { engine, sendEvent } = makeEngine();

      await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_abc1234567890123",
              text: "response",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      expect(sendEvent).toHaveBeenCalledWith(
        "emit-response",
        expect.objectContaining({
          data: expect.objectContaining({
            llmCalls: expect.arrayContaining([
              expect.objectContaining({
                id: "llm_abc1234567890123",
                stepName: "llm-call-1",
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe("tool call round-trip", () => {
    it("sends evee/tool-call.requested events when LLM returns tool-calls", async () => {
      const { engine, sendEvent } = makeEngine();

      await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_round1",
              text: "",
              finishReason: "tool-calls",
              toolCalls: [
                { toolCallId: "tc_roll1234567890", toolName: "rollDice", args: { sides: 6 } },
              ],
              usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            }),
          },
          {
            id: "await-tc_roll1234567890",
            handler: () => ({
              data: { callId: "tc_roll1234567890", output: { value: 4 } },
            }),
          },
          {
            id: "llm-call-2",
            handler: () => ({
              llmCallId: "llm_round2",
              text: "The dice rolled 4",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      expect(sendEvent).toHaveBeenCalledWith(
        "request-tools-1",
        expect.arrayContaining([
          expect.objectContaining({
            name: "evee/tool-call.requested",
            data: expect.objectContaining({
              toolName: "rollDice",
              callId: "tc_roll1234567890",
              input: { sides: 6 },
            }),
          }),
        ]),
      );
    });

    it("waits for evee/tool-call.completed with callId filter", async () => {
      const { engine, waitForEvent } = makeEngine();

      await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_round1",
              text: "",
              finishReason: "tool-calls",
              toolCalls: [
                { toolCallId: "tc_wait1234567890", toolName: "getCurrentDateTime", args: {} },
              ],
              usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            }),
          },
          {
            id: "await-tc_wait1234567890",
            handler: () => ({
              data: { callId: "tc_wait1234567890", output: { datetime: "2026-04-15T12:00:00Z" } },
            }),
          },
          {
            id: "llm-call-2",
            handler: () => ({
              llmCallId: "llm_round2",
              text: "It is noon.",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      expect(waitForEvent).toHaveBeenCalledWith(
        "await-tc_wait1234567890",
        expect.objectContaining({
          event: "evee/tool-call.completed",
          timeout: "30s",
          if: expect.stringContaining("tc_wait1234567890"),
        }),
      );
    });

    it("handles tool timeout gracefully: null waitForEvent result uses error fallback", async () => {
      const { engine, sendEvent, waitForEvent } = makeEngine();
      // Return null = tool timed out
      waitForEvent.mockResolvedValue(null);

      await engine.execute({
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_round1",
              text: "",
              finishReason: "tool-calls",
              toolCalls: [{ toolCallId: "tc_timeout123456", toolName: "slowTool", args: {} }],
              usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            }),
          },
          {
            id: "await-tc_timeout123456",
            handler: () => null,
          },
          {
            id: "llm-call-2",
            handler: () => ({
              llmCallId: "llm_round2",
              text: "Tool timed out but I responded anyway.",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
            }),
          },
          {
            id: "save-response",
            handler: () => undefined,
          },
        ],
      });

      // Function should complete without throwing
      expect(sendEvent).toHaveBeenCalledWith(
        "emit-response",
        expect.objectContaining({ name: "evee/response.ready" }),
      );
    });
  });

  describe("executeStep: individual step testing", () => {
    it("llm-call-1 step runs and returns a result", async () => {
      const { engine } = makeEngine();

      const { result } = await engine.executeStep("llm-call-1", {
        events: [BASE_EVENT],
      });

      expect(result).toBeDefined();
    });

    it("save-response step runs when llm-call-1 output is provided", async () => {
      const { engine } = makeEngine();

      const { result } = await engine.executeStep("save-response", {
        events: [BASE_EVENT],
        steps: [
          {
            id: "llm-call-1",
            handler: () => ({
              llmCallId: "llm_abc",
              text: "hello",
              finishReason: "stop",
              toolCalls: [],
              usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
            }),
          },
        ],
      });

      expect(result).toBeDefined();
    });
  });
});
