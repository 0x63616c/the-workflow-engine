import { WebClient } from "@slack/web-api";
import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { NonRetriableError } from "inngest";
import { newId } from "../db/id";
import { conversations, images, llmCalls, messages, toolCalls } from "../db/schema";
import { callLlm } from "../integrations/evee/llm";
import { buildMessagesFromRecords } from "../integrations/evee/messages";
import { executeTool as registryExecuteTool } from "../integrations/evee/tools";
import type {
  ConversationContext,
  LlmCallResult,
  ToolExecutionResult,
} from "../integrations/evee/types";
import { toSlackMrkdwn } from "../integrations/slack/format";
import { log } from "../lib/logger";

type DB = NodePgDatabase<Record<string, unknown>>;

export async function upsertConversation(
  db: DB,
  opts: {
    source: string;
    slackThreadId?: string;
    slackChannelId?: string;
    startedBy: string;
    displayName: string;
  },
): Promise<string> {
  if (opts.slackThreadId && opts.slackChannelId) {
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.slackThreadId, opts.slackThreadId),
          eq(conversations.slackChannelId, opts.slackChannelId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }
  }

  const conversationId = newId("conversation");
  await db
    .insert(conversations)
    .values({
      id: conversationId,
      source: opts.source,
      slackThreadId: opts.slackThreadId,
      slackChannelId: opts.slackChannelId,
      startedBy: opts.startedBy,
      startedByName: opts.displayName,
    })
    .onConflictDoNothing();

  // Re-select in case of a race condition where another insert won
  if (opts.slackThreadId && opts.slackChannelId) {
    const actual = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.slackThreadId, opts.slackThreadId),
          eq(conversations.slackChannelId, opts.slackChannelId),
        ),
      )
      .limit(1);

    if (actual.length > 0) {
      return actual[0].id;
    }
  }

  return conversationId;
}

export async function persistMessage(
  db: DB,
  opts: {
    conversationId: string;
    role: string;
    content: string;
    userId?: string;
    displayName?: string;
    images?: Array<{ data: Buffer; mimeType: string; originalUrl?: string }>;
  },
): Promise<string> {
  const messageId = newId("message");
  await db.insert(messages).values({
    id: messageId,
    conversationId: opts.conversationId,
    role: opts.role,
    content: opts.content,
    userId: opts.userId,
    displayName: opts.displayName,
  });

  if (opts.images && opts.images.length > 0) {
    for (const img of opts.images) {
      await db.insert(images).values({
        id: newId("image"),
        conversationId: opts.conversationId,
        messageId,
        mimeType: img.mimeType,
        data: img.data,
        sizeBytes: img.data.byteLength,
        originalUrl: img.originalUrl,
      });
    }
  }

  return messageId;
}

export async function downloadSlackImage(
  url: string,
  token: string,
): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      log.warn({ url, status: response.status }, "Failed to download Slack image");
      return null;
    }
    const data = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") ?? "image/png";
    return { data, mimeType };
  } catch (err) {
    log.warn({ url, err }, "Error downloading Slack image");
    return null;
  }
}

export function stripBotMention(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, "").trim();
}

export async function buildLlmContext(
  db: DB,
  conversationId: string,
  botUserId: string,
): Promise<ConversationContext | null> {
  const messageRecords = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  if (messageRecords.length === 0) {
    return null;
  }

  const imageRecords = await db
    .select()
    .from(images)
    .where(eq(images.conversationId, conversationId));

  const builtMessages = buildMessagesFromRecords(messageRecords, imageRecords);

  return {
    conversationId,
    messages: builtMessages,
    botUserId,
  };
}

export async function runLlmCall(context: ConversationContext): Promise<LlmCallResult> {
  return callLlm(context.messages, context.botUserId);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const start = Date.now();
  try {
    const output = await registryExecuteTool(name, args);
    return {
      toolName: name,
      output,
      error: null,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      toolName: name,
      output: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export async function persistLlmCall(
  db: DB,
  opts: {
    conversationId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    stepName: string;
    finishReason: string;
    costUsd?: string;
  },
): Promise<string> {
  const llmCallId = newId("llmCall");
  await db.insert(llmCalls).values({
    id: llmCallId,
    conversationId: opts.conversationId,
    stepName: opts.stepName,
    model: opts.model,
    inputTokens: opts.promptTokens,
    outputTokens: opts.completionTokens,
    totalTokens: opts.promptTokens + opts.completionTokens,
    finishReason: opts.finishReason,
    costUsd: opts.costUsd,
  });
  return llmCallId;
}

export async function persistToolCall(
  db: DB,
  opts: {
    llmCallId: string;
    conversationId: string;
    callId: string;
    toolName: string;
    input: unknown;
    output: unknown;
    error: string | null;
    durationMs: number;
  },
): Promise<string> {
  const id = newId("toolCall");
  await db.insert(toolCalls).values({
    id,
    conversationId: opts.conversationId,
    llmCallId: opts.llmCallId,
    callId: opts.callId,
    toolName: opts.toolName,
    input: opts.input as Record<string, unknown>,
    output: opts.output,
    error: opts.error,
    durationMs: opts.durationMs,
  });
  return id;
}

export async function sendSlackResponse(
  token: string,
  channel: string,
  threadTs: string,
  text: string,
): Promise<void> {
  const slack = new WebClient(token);
  const formatted = toSlackMrkdwn(text);
  try {
    await slack.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: formatted,
    });
  } catch (error) {
    const slackError = (error as { data?: { error?: string } })?.data?.error;
    if (slackError === "channel_not_found" || slackError === "not_in_channel") {
      throw new NonRetriableError(`Slack error: ${slackError}`);
    }
    throw error; // transient errors get retried
  }
}

export async function sendSlackStatus(
  token: string,
  channel: string,
  threadTs: string,
  status: string,
  loadingMessages: string[],
): Promise<void> {
  const slack = new WebClient(token);
  try {
    await slack.assistant.threads.setStatus({
      channel_id: channel,
      thread_ts: threadTs,
      status,
      loading_messages: loadingMessages,
    });
  } catch (error) {
    // setStatus fails on non-Assistant-enabled threads and on transient Slack
    // outages. Status is decorative — never let it break the main pipeline.
    log.warn({ error, channel, threadTs }, "sendSlackStatus failed (non-fatal)");
  }
}
