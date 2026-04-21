import type { JSONValue } from "@ai-sdk/provider";
import type { ModelMessage } from "ai";
import { NonRetriableError } from "inngest";
import { db } from "../../db/client";
import { env } from "../../env";
import { EVEE_MODEL } from "../../integrations/evee/types";
import { LOADING_MESSAGES } from "../../integrations/slack/constants";
import * as eveeService from "../../services/evee-service";
import { inngest } from "../client";

const MAX_TOOL_ROUNDS = 10;
// Inngest duration string, not a numeric value
const TOOL_TIMEOUT = "30s";
const MAX_CONSECUTIVE_TIMEOUT_ROUNDS = 2;

export const eveeConversation = inngest.createFunction(
  {
    id: "evee-conversation",
    triggers: [{ event: "slack/message.received" }],
    concurrency: {
      limit: 1,
      key: "event.data.conversationId",
    },
  },
  async ({ event, step }) => {
    const { conversationId, botUserId, threadId, channel } = event.data as {
      conversationId: string;
      botUserId: string;
      threadId: string;
      channel: string;
    };

    await step.run("set-thinking-status", () =>
      eveeService.sendSlackStatus(
        env.SLACK_BOT_TOKEN,
        channel,
        threadId,
        "is thinking...",
        LOADING_MESSAGES,
      ),
    );

    const isHealthCheck = await step.run("ruok-fast-path", () => {
      const text = (event.data as { text?: string }).text ?? "";
      return eveeService.isHealthCheckText(text);
    });

    if (isHealthCheck) {
      await step.sendEvent("emit-response", {
        name: "evee/response.ready",
        data: {
          conversationId,
          threadId,
          channel,
          response: "imok",
          llmCalls: [],
        },
      });
      return;
    }

    // toolMessages is rebuilt from memoized step.run() return values on Inngest replay.
    // Each push happens after a step.run() or step.waitForEvent() that returns deterministic data,
    // so the array state is consistent across replays.
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
        const context = await eveeService.buildLlmContext(db, conversationId, botUserId);
        if (!context) {
          throw new NonRetriableError(`Conversation not found: ${conversationId}`);
        }

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
          await eveeService.persistMessage(db, {
            conversationId,
            role: "assistant",
            content: responseText,
          });
        });

        await step.sendEvent("emit-response", {
          name: "evee/response.ready",
          data: {
            conversationId,
            threadId,
            channel,
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

    throw new NonRetriableError("Max tool rounds exceeded");
  },
);
