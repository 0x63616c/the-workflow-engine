import { WebClient } from "@slack/web-api";
import { env } from "../../env";
import { toSlackMrkdwn } from "../../integrations/slack/format";
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
      const slack = new WebClient(env.SLACK_BOT_TOKEN);
      const formatted = toSlackMrkdwn(data.response);
      await slack.chat.postMessage({
        channel: data.channel,
        thread_ts: data.threadId,
        text: formatted,
      });
    });
  },
);
