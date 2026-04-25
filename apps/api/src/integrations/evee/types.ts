import type { ModelMessage } from "ai";

/**
 * Typed boundaries between Evee pipeline stages.
 * These types define the contracts between: Slack handler -> Conversation service -> LLM -> Tools -> Slack
 */

/** The LLM model used for Evee conversations */
export const EVEE_MODEL = "google/gemma-4-31b-it";

/** Parsed Slack event data passed to the pipeline */
export interface SlackEventInput {
  text: string;
  userId: string;
  channelId: string;
  threadTs: string;
  files: SlackFile[];
}

export interface SlackFile {
  name?: string;
  mimetype?: string;
  url_private?: string;
}

/** What buildLlmContext returns: ready-to-use LLM input */
export interface ConversationContext {
  conversationId: string;
  messages: ModelMessage[];
  botUserId: string;
}

/** Result of a single LLM generateText call */
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

/** Result of executing a single tool call */
export interface ToolExecutionResult {
  toolName: string;
  output: unknown;
  error: string | null;
  durationMs: number;
}

/** What gets sent to Slack as the final response */
export interface SlackResponsePayload {
  channel: string;
  threadTs: string;
  text: string;
}
