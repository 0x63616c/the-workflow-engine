import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type ModelMessage, generateText, stepCountIs } from "ai";
import type { Logger } from "pino";
import { env } from "../../env";
import { log as defaultLog } from "../../lib/logger";
import { SYSTEM_PROMPT } from "./prompt";
import { eveeTools } from "./tools";

const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
const MODEL = "google/gemma-4-31b-it";
const MAX_STEP_COUNT = 50;
const LLM_TIMEOUT_MS = 120_000;

export type ChatMessage = ModelMessage;

export interface ChatCompletionOptions {
  logger?: Logger;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  const logger = options?.logger ?? defaultLog;

  const { text } = await generateText({
    model: openrouter(MODEL),
    system: SYSTEM_PROMPT,
    messages,
    tools: eveeTools,
    stopWhen: stepCountIs(MAX_STEP_COUNT),
    abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    onStepFinish: (event) => {
      const toolNames = event.toolCalls?.map((tc: { toolName: string }) => tc.toolName) ?? [];
      logger.info(
        { step: event.stepNumber, tokens: event.usage.totalTokens, toolNames },
        toolNames.length > 0 ? `Evee called tools: ${toolNames.join(", ")}` : "Evee step completed",
      );
    },
  });

  return text || "I'm not sure what to say.";
}
