import { db } from "../../db/client";
import { newId } from "../../db/id";
import { toolCalls } from "../../db/schema";
import { inngest } from "../client";

export const eveePersistToolCall = inngest.createFunction(
  { id: "evee-persist-tool-call" },
  { event: "evee/tool-call.completed" },
  async ({ event, step }) => {
    await step.run("save", async () => {
      await db.insert(toolCalls).values({
        id: newId("toolCall"),
        conversationId: event.data.conversationId,
        llmCallId: event.data.llmCallId,
        callId: event.data.callId,
        toolName: event.data.toolName,
        input: event.data.input,
        output: event.data.output,
        error: event.data.error,
        durationMs: event.data.durationMs,
      });
    });
  },
);
