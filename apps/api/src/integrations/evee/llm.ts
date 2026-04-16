import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type ModelMessage, generateText, tool } from "ai";
import { env } from "../../env";
import { buildSystemPrompt } from "./prompt";
import { getToolDefinitions } from "./tools";

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });

export const EVEE_MODEL = "google/gemma-4-31b-it";
const LLM_TIMEOUT_MS = 120_000;

export interface LlmCallResult {
  text: string;
  finishReason: string;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  providerMetadata: Record<string, unknown> | undefined;
}

export async function callLlm(messages: ModelMessage[], botUserId: string): Promise<LlmCallResult> {
  const toolDefs = getToolDefinitions();
  const tools = Object.fromEntries(
    Object.entries(toolDefs).map(([name, def]) => [
      name,
      tool({ description: def.description, inputSchema: def.inputSchema }),
    ]),
  );

  const result = await generateText({
    model: openrouter(EVEE_MODEL),
    system: buildSystemPrompt(botUserId),
    messages,
    tools,
    abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  return {
    text: result.text ?? "",
    finishReason: result.finishReason,
    toolCalls: (result.toolCalls ?? []).map((tc) => ({
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      args: (tc as unknown as { input: unknown }).input as Record<string, unknown>,
    })),
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
    },
    providerMetadata: result.providerMetadata as Record<string, unknown> | undefined,
  };
}
