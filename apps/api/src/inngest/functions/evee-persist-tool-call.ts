import { db } from "../../db/client";
import * as eveeService from "../../services/evee-service";
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
      await eveeService.persistToolCall(db, {
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
