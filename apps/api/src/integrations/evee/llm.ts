import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type ModelMessage, generateText, tool } from "ai";
import { env } from "../../env";
import { buildSystemPrompt } from "./prompt";
import { getToolDefinitions } from "./tools";
import type { LlmCallResult } from "./types";
import { EVEE_MODEL } from "./types";

let _openrouter: ReturnType<typeof createOpenRouter> | null = null;
function getOpenRouter() {
  if (!_openrouter) _openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
  return _openrouter;
}

const LLM_TIMEOUT_MS = 120_000;

export async function callLlm(messages: ModelMessage[], botUserId: string): Promise<LlmCallResult> {
  const toolDefs = getToolDefinitions();
  const tools = Object.fromEntries(
    Object.entries(toolDefs).map(([name, def]) => [
      name,
      tool({ description: def.description, inputSchema: def.inputSchema }),
    ]),
  );

  // Intentionally no maxSteps - Inngest orchestrator handles the tool-call loop externally
  const result = await generateText({
    model: getOpenRouter()(EVEE_MODEL),
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
      // AI SDK v6 ToolCallPart uses .input (not .args) - cast needed for type narrowing
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
