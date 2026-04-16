import { env } from "../../env";
import * as eveeService from "../../services/evee-service";
import { inngest } from "../client";

export const eveeRespondSlack = inngest.createFunction(
  { id: "evee-respond-slack", triggers: [{ event: "evee/response.ready" }] },
  async ({ event, step }) => {
    const data = event.data as {
      response: string;
      channel: string;
      threadId: string;
    };

    await step.run("post", async () => {
      await eveeService.sendSlackResponse(
        env.SLACK_BOT_TOKEN,
        data.channel,
        data.threadId,
        data.response,
      );
    });
  },
);
