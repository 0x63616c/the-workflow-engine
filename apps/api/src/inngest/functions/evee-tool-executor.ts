import * as eveeService from "../../services/evee-service";
import { inngest } from "../client";

export const eveeToolExecutor = inngest.createFunction(
  { id: "evee-tool-executor", triggers: [{ event: "evee/tool-call.requested" }] },
  async ({ event, step }) => {
    const { callId, conversationId, toolName, input, llmCallId } = event.data as {
      callId: string;
      conversationId: string;
      toolName: string;
      input: Record<string, unknown>;
      llmCallId: string;
    };

    const result = await step.run("execute", async () => {
      const toolResult = await eveeService.executeTool(toolName, input);
      return {
        output: toolResult.output,
        error: toolResult.error,
        durationMs: toolResult.durationMs,
      };
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
