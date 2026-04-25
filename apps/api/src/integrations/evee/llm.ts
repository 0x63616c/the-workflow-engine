import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type ModelMessage, generateText, tool } from "ai";
import { env } from "../../env";
import { log } from "../../lib/logger";
import { buildSystemPrompt } from "./prompt";
import { getToolDefinitions } from "./tools";
import type { LlmCallResult } from "./types";
import { EVEE_MODEL } from "./types";

// Redact base64 image data from message content for logging. Images are huge
// and not useful for debugging prompt/tool-result issues.
function redactForLog(messages: ModelMessage[]): unknown {
  return messages.map((m) => {
    if (typeof m.content === "string") return m;
    if (!Array.isArray(m.content)) return m;
    return {
      ...m,
      content: m.content.map((part: unknown) => {
        const p = part as { type?: string; image?: string };
        if (p.type === "image") return { type: "image", image: "[base64 redacted]" };
        return part;
      }),
    };
  });
}

let _openrouter: ReturnType<typeof createOpenRouter> | null = null;
function getOpenRouter() {
  if (!_openrouter) {
    _openrouter = createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
      // Attribution for OpenRouter's activity dashboard ("App" column).
      // Without these, requests show as "App: Unknown".
      //
      // IMPORTANT: appName is sent as the X-OpenRouter-Title HTTP header,
      // which must be Latin-1. No em-dashes, smart quotes, or other non-ASCII
      // punctuation, or undici throws `TypeError: Header has invalid value`.
      appName: "Evee",
      appUrl: "https://github.com/0x63616c/evee",
    });
  }
  return _openrouter;
}

// Provider routing preferences for Evee's LLM calls.
//
// - sort: "throughput" picks the fastest backend. Same model, different
//   providers can vary 10x on tok/s (we've seen 3.5 vs 30 tps). Pin it.
// - allow_fallbacks: true so a 429 / outage on the fastest provider doesn't
//   kill the request — we'd rather a slower reply than Evee ghosting the
//   thread. DeepInfra sustained-limited us on 2026-04-21 with fallbacks off.
// - require_parameters: true only routes to providers that support EVERY
//   field in our request, including `tools`. Prevents the silent-tool-strip
//   failure mode where a provider drops tool schemas, the model never sees
//   them, and appears to "ignore tool results" (see the 2026-04-20 debugging
//   thread where we thought Gemma was broken and it was actually a provider
//   config issue).
const PROVIDER_ROUTING = {
  sort: "throughput",
  allow_fallbacks: true,
  require_parameters: true,
} as const;

const LLM_TIMEOUT_MS = 120_000;

export async function callLlm(messages: ModelMessage[], botUserId: string): Promise<LlmCallResult> {
  const toolDefs = getToolDefinitions();
  const tools = Object.fromEntries(
    Object.entries(toolDefs).map(([name, def]) => [
      name,
      tool({ description: def.description, inputSchema: def.inputSchema }),
    ]),
  );

  log.info(
    {
      toolNames: Object.keys(tools),
      messageCount: messages.length,
      messages: redactForLog(messages),
    },
    "evee llm request",
  );

  // Intentionally no maxSteps - the conversation service handles the tool-call loop externally
  const result = await generateText({
    model: getOpenRouter()(EVEE_MODEL, { provider: PROVIDER_ROUTING }),
    system: buildSystemPrompt(botUserId),
    messages,
    tools,
    abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  log.info(
    {
      finishReason: result.finishReason,
      text: result.text,
      toolCalls: (result.toolCalls ?? []).map((tc) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        args: (tc as unknown as { input: unknown }).input,
      })),
      usage: result.usage,
    },
    "evee llm response",
  );

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
