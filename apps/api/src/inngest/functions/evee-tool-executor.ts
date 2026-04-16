import { executeTool } from "../../integrations/evee/tools";
import { inngest } from "../client";

export const eveeToolExecutor = inngest.createFunction(
  { id: "evee-tool-executor" },
  { event: "evee/tool-call.requested" },
  async ({ event, step }) => {
    const { callId, conversationId, toolName, input, llmCallId } = event.data;

    const result = await step.run("execute", async () => {
      const start = Date.now();
      try {
        const output = await executeTool(toolName, input);
        return {
          output,
          error: null,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        return {
          output: null,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        };
      }
    });

    await step.sendEvent("emit-result", {
      name: "evee/tool-call.completed",
      data: {
        callId,
        conversationId,
        toolName,
        input,
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
        llmCallId,
      },
    });
  },
);
