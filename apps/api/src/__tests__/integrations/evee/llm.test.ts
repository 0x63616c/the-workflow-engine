import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock ai and openrouter before imports
vi.mock("ai", () => ({
  generateText: vi.fn(),
  tool: vi.fn((def) => def),
}));

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => vi.fn((model: string) => ({ model }))),
}));

vi.mock("../../../integrations/evee/tools", () => ({
  getToolDefinitions: vi.fn(),
}));

vi.mock("../../../integrations/evee/prompt", () => ({
  buildSystemPrompt: vi.fn((botUserId: string) => `System prompt for ${botUserId}`),
}));

import { generateText } from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";
import { callLlm } from "../../../integrations/evee/llm";
import { getToolDefinitions } from "../../../integrations/evee/tools";

const mockGenerateText = vi.mocked(generateText);
const mockGetToolDefinitions = vi.mocked(getToolDefinitions);

const STOP_RESULT = {
  text: "Hello there!",
  finishReason: "stop" as const,
  toolCalls: [],
  usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  providerMetadata: { openrouter: { generationId: "gen_123" } },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToolDefinitions.mockReturnValue({});
  mockGenerateText.mockResolvedValue(
    STOP_RESULT as unknown as Awaited<ReturnType<typeof generateText>>,
  );
});

const MESSAGES: ModelMessage[] = [{ role: "user", content: "hello" }];

describe("callLlm()", () => {
  it("calls generateText with system prompt derived from botUserId", async () => {
    await callLlm(MESSAGES, "UBOT123");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("UBOT123"),
      }),
    );
  });

  it("passes messages to generateText", async () => {
    await callLlm(MESSAGES, "UBOT");

    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({ messages: MESSAGES }));
  });

  it("returns LlmCallResult with text and finishReason", async () => {
    const result = await callLlm(MESSAGES, "UBOT");

    expect(result.text).toBe("Hello there!");
    expect(result.finishReason).toBe("stop");
    expect(result.toolCalls).toEqual([]);
  });

  it("returns usage with inputTokens, outputTokens, totalTokens", async () => {
    const result = await callLlm(MESSAGES, "UBOT");

    expect(result.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
  });

  it("returns empty string text when generateText returns undefined text", async () => {
    mockGenerateText.mockResolvedValue({
      ...STOP_RESULT,
      text: undefined as unknown as string,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await callLlm(MESSAGES, "UBOT");
    expect(result.text).toBe("");
  });

  it("returns zero usage when generateText returns undefined usage", async () => {
    mockGenerateText.mockResolvedValue({
      ...STOP_RESULT,
      usage: undefined as unknown as typeof STOP_RESULT.usage,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await callLlm(MESSAGES, "UBOT");
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  it("builds tools from getToolDefinitions using inputSchema (AI SDK v6)", async () => {
    const diceSchema = z.object({ sides: z.number() });
    mockGetToolDefinitions.mockReturnValue({
      rollDice: { description: "Roll a dice", inputSchema: diceSchema },
    });

    await callLlm(MESSAGES, "UBOT");

    // generateText should receive a tools object with rollDice
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.objectContaining({
          rollDice: expect.objectContaining({
            description: "Roll a dice",
            inputSchema: diceSchema,
          }),
        }),
      }),
    );
  });

  it("works with no tool definitions (empty tools object)", async () => {
    mockGetToolDefinitions.mockReturnValue({});

    const result = await callLlm(MESSAGES, "UBOT");

    expect(result.toolCalls).toEqual([]);
    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({ tools: {} }));
  });

  it("extracts tool calls using .input (AI SDK v6 convention)", async () => {
    mockGenerateText.mockResolvedValue({
      text: "",
      finishReason: "tool-calls",
      toolCalls: [
        {
          toolCallId: "tc_1",
          toolName: "rollDice",
          // AI SDK v6 uses .input, not .args
          input: { sides: 6 },
        },
      ],
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      providerMetadata: undefined,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await callLlm(MESSAGES, "UBOT");

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toEqual({
      toolCallId: "tc_1",
      toolName: "rollDice",
      args: { sides: 6 },
    });
  });

  it("maps tool call input to args field in returned result", async () => {
    mockGenerateText.mockResolvedValue({
      text: "",
      finishReason: "tool-calls",
      toolCalls: [
        { toolCallId: "tc_abc", toolName: "getCurrentDateTime", input: {} },
        { toolCallId: "tc_def", toolName: "rollDice", input: { sides: 20 } },
      ],
      usage: { inputTokens: 15, outputTokens: 8, totalTokens: 23 },
      providerMetadata: undefined,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await callLlm(MESSAGES, "UBOT");

    expect(result.toolCalls[0].args).toEqual({});
    expect(result.toolCalls[1].args).toEqual({ sides: 20 });
  });

  it("passes an AbortSignal timeout to generateText", async () => {
    await callLlm(MESSAGES, "UBOT");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
    );
  });

  it("propagates errors from generateText", async () => {
    mockGenerateText.mockRejectedValue(new Error("LLM API failure"));

    await expect(callLlm(MESSAGES, "UBOT")).rejects.toThrow("LLM API failure");
  });

  it("returns providerMetadata from generateText result", async () => {
    const meta = { openrouter: { cost: 0.001, generationId: "gen_xyz" } };
    mockGenerateText.mockResolvedValue({
      ...STOP_RESULT,
      providerMetadata: meta,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const result = await callLlm(MESSAGES, "UBOT");
    expect(result.providerMetadata).toEqual(meta);
  });
});
