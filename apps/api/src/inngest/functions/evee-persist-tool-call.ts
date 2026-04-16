import { db } from "../../db/client";
import { newId } from "../../db/id";
import { toolCalls } from "../../db/schema";
import { inngest } from "../client";

export const eveePersistToolCall = inngest.createFunction(
  { id: "evee-persist-tool-call", triggers: [{ event: "evee/tool-call.completed" }] },
  async ({ event, step }) => {
    const data = event.data as {
      conversationId: string;
      llmCallId: string;
      callId: string;
      toolName: string;
      input: Record<string, unknown>;
      output: unknown;
      error: string | null;
      durationMs: number;
    };

    await step.run("save", async () => {
      await db.insert(toolCalls).values({
        id: newId("toolCall"),
        conversationId: data.conversationId,
        llmCallId: data.llmCallId,
        callId: data.callId,
        toolName: data.toolName,
        input: data.input,
        output: data.output,
        error: data.error,
        durationMs: data.durationMs,
      });
    });
  },
);
