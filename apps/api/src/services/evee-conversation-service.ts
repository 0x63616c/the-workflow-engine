import type { JSONValue } from "@ai-sdk/provider";
import type { ModelMessage } from "ai";
import { db } from "../db/client";
import { env } from "../env";
import { EVEE_MODEL } from "../integrations/evee/types";
import { LOADING_MESSAGES } from "../integrations/slack/constants";
import { log } from "../lib/logger";
import * as eveeService from "./evee-service";

const MAX_TOOL_ROUNDS = 10;
const TOOL_TIMEOUT_MS = 30_000;
const MAX_CONSECUTIVE_TIMEOUT_ROUNDS = 2;

export interface RunEveeConversationOpts {
  conversationId: string;
  botUserId: string;
  threadId: string;
  channel: string;
  text: string;
}

export async function runEveeConversation(opts: RunEveeConversationOpts): Promise<void> {
  const { conversationId, botUserId, threadId, channel, text } = opts;

  try {
    await eveeService.sendSlackStatus(
      env.SLACK_BOT_TOKEN,
      channel,
      threadId,
      "is thinking...",
      LOADING_MESSAGES,
    );

    if (eveeService.isHealthCheckText(text)) {
      await eveeService.sendSlackResponse(env.SLACK_BOT_TOKEN, channel, threadId, "imok");
      return;
    }

    const toolMessages: ModelMessage[] = [];
    let roundNumber = 0;
    let consecutiveTimeoutRounds = 0;
    let finalResponse = "";

    while (roundNumber < MAX_TOOL_ROUNDS) {
      roundNumber++;
      const stepName = `llm-call-${roundNumber}`;

      await eveeService.sendSlackStatus(
        env.SLACK_BOT_TOKEN,
        channel,
        threadId,
        "is thinking...",
        LOADING_MESSAGES,
      );

      const context = await eveeService.buildLlmContext(db, conversationId, botUserId);
      if (!context) throw new Error(`Conversation not found: ${conversationId}`);

      const fullMessages: ModelMessage[] = [...context.messages, ...toolMessages];
      const llmResult = await eveeService.runLlmCall({ ...context, messages: fullMessages });

      const llmCallId = await eveeService.persistLlmCall(db, {
        conversationId,
        model: EVEE_MODEL,
        promptTokens: llmResult.usage.inputTokens,
        completionTokens: llmResult.usage.outputTokens,
        stepName,
        finishReason: llmResult.finishReason,
      });

      if (llmResult.finishReason !== "tool-calls" || llmResult.toolCalls.length === 0) {
        finalResponse = llmResult.text || "I'm not sure what to say.";
        await eveeService.persistMessage(db, {
          conversationId,
          role: "assistant",
          content: finalResponse,
        });
        break;
      }

      const toolResults = await Promise.all(
        llmResult.toolCalls.map(async (tc) => {
          const exec = eveeService.executeTool(tc.toolName, tc.args);
          const timeout = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), TOOL_TIMEOUT_MS),
          );
          const result = await Promise.race([exec, timeout]);
          if (result === null) return null;
          await eveeService.persistToolCall(db, {
            conversationId,
            llmCallId,
            callId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.args,
            output: result.output,
            error: result.error,
            durationMs: result.durationMs,
          });
          return result;
        }),
      );

      const allTimedOut = toolResults.every((tr) => tr === null);
      if (allTimedOut) {
        consecutiveTimeoutRounds++;
        if (consecutiveTimeoutRounds >= MAX_CONSECUTIVE_TIMEOUT_ROUNDS) break;
      } else {
        consecutiveTimeoutRounds = 0;
      }

      toolMessages.push({
        role: "assistant",
        content: llmResult.toolCalls.map((tc) => ({
          type: "tool-call" as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.args,
        })),
      });

      for (let i = 0; i < llmResult.toolCalls.length; i++) {
        const tc = llmResult.toolCalls[i];
        const tr = toolResults[i];
        const rawOutput = (tr?.output ??
          tr?.error ?? { error: "Tool call timed out" }) as JSONValue;
        toolMessages.push({
          role: "tool",
          content: [
            {
              type: "tool-result" as const,
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              output: { type: "json" as const, value: rawOutput },
            },
          ],
        });
      }
    }

    if (!finalResponse) {
      finalResponse = "I tried too many tools without finding an answer.";
      await eveeService.persistMessage(db, {
        conversationId,
        role: "assistant",
        content: finalResponse,
      });
    }

    await eveeService.sendSlackResponse(env.SLACK_BOT_TOKEN, channel, threadId, finalResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err, conversationId, channel, threadId }, "Evee conversation failed");
    try {
      await eveeService.sendEveeFailureReply(env.SLACK_BOT_TOKEN, {
        channel,
        threadTs: threadId,
        errorMessage: message,
      });
    } catch (replyErr) {
      log.error({ err: replyErr }, "Failed to post Evee failure reply");
    }
  }
}
