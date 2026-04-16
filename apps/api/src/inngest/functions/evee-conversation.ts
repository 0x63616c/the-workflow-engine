import type { JSONValue } from "@ai-sdk/provider";
import type { ModelMessage } from "ai";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { newId } from "../../db/id";
import { images as imagesTable, llmCalls, messages as messagesTable } from "../../db/schema";
import { EVEE_MODEL, callLlm } from "../../integrations/evee/llm";
import { buildMessagesFromRecords } from "../../integrations/evee/messages";
import { inngest } from "../client";

const MAX_TOOL_ROUNDS = 10;
// Inngest duration string, not a numeric value
const TOOL_TIMEOUT = "30s";
const MAX_CONSECUTIVE_TIMEOUT_ROUNDS = 2;

export const eveeConversation = inngest.createFunction(
  {
    id: "evee-conversation",
    concurrency: {
      limit: 1,
      key: "event.data.conversationId",
    },
  },
  { event: "slack/message.received" },
  async ({ event, step }) => {
    const { conversationId, botUserId } = event.data;

    // Safe across Inngest replays: arrays rebuild from memoized step.run() return values
    const toolMessages: ModelMessage[] = [];
    const allLlmCalls: Array<{
      id: string;
      stepName: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      finishReason: string;
    }> = [];

    let roundNumber = 0;
    let consecutiveTimeoutRounds = 0;

    while (roundNumber < MAX_TOOL_ROUNDS) {
      roundNumber++;
      const stepName = `llm-call-${roundNumber}`;

      const result = await step.run(stepName, async () => {
        const messageRecords = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, conversationId))
          .orderBy(asc(messagesTable.createdAt));

        const imageRecords = await db
          .select()
          .from(imagesTable)
          .where(eq(imagesTable.conversationId, conversationId));

        const historyMessages = buildMessagesFromRecords(messageRecords, imageRecords);
        const allMessages: ModelMessage[] = [...historyMessages, ...toolMessages];

        const llmResult = await callLlm(allMessages, botUserId);

        const llmCallId = newId("llmCall");
        await db.insert(llmCalls).values({
          id: llmCallId,
          conversationId,
          stepName,
          model: EVEE_MODEL,
          inputTokens: llmResult.usage.inputTokens,
          outputTokens: llmResult.usage.outputTokens,
          totalTokens: llmResult.usage.totalTokens,
          finishReason: llmResult.finishReason,
        });

        return {
          llmCallId,
          text: llmResult.text,
          finishReason: llmResult.finishReason,
          toolCalls: llmResult.toolCalls,
          usage: llmResult.usage,
        };
      });

      allLlmCalls.push({
        id: result.llmCallId,
        stepName,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        finishReason: result.finishReason,
      });

      if (result.finishReason !== "tool-calls" || result.toolCalls.length === 0) {
        await step.run("save-response", async () => {
          const responseText = result.text || "I'm not sure what to say.";
          await db.insert(messagesTable).values({
            id: newId("message"),
            conversationId,
            role: "assistant",
            content: responseText,
          });
        });

        await step.sendEvent("emit-response", {
          name: "evee/response.ready",
          data: {
            conversationId,
            threadId: event.data.threadId,
            channel: event.data.channel,
            response: result.text || "I'm not sure what to say.",
            llmCalls: allLlmCalls,
          },
        });

        return;
      }

      await step.sendEvent(
        `request-tools-${roundNumber}`,
        result.toolCalls.map((tc) => ({
          name: "evee/tool-call.requested" as const,
          data: {
            callId: tc.toolCallId,
            conversationId,
            toolName: tc.toolName,
            input: tc.args,
            llmCallId: result.llmCallId,
          },
        })),
      );

      const toolResults = await Promise.all(
        result.toolCalls.map((tc) => {
          const safeCallId = tc.toolCallId.replace(/'/g, "");
          return step.waitForEvent(`await-${safeCallId}`, {
            event: "evee/tool-call.completed",
            timeout: TOOL_TIMEOUT,
            if: `event.data.callId == '${safeCallId}'`,
          });
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
        content: result.toolCalls.map((tc) => ({
          type: "tool-call" as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.args,
        })),
      });

      for (let i = 0; i < result.toolCalls.length; i++) {
        const tc = result.toolCalls[i];
        const tr = toolResults[i];
        const rawOutput = (tr?.data?.output ?? { error: "Tool call timed out" }) as JSONValue;
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
  },
);
