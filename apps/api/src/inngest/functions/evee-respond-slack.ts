import { WebClient } from "@slack/web-api";
import { env } from "../../env";
import { toSlackMrkdwn } from "../../integrations/slack/format";
import { inngest } from "../client";

export const eveeRespondSlack = inngest.createFunction(
  { id: "evee-respond-slack" },
  { event: "evee/response.ready" },
  async ({ event, step }) => {
    await step.run("post", async () => {
      const slack = new WebClient(env.SLACK_BOT_TOKEN);
      const formatted = toSlackMrkdwn(event.data.response);
      await slack.chat.postMessage({
        channel: event.data.channel,
        thread_ts: event.data.threadId,
        text: formatted,
      });
    });
  },
);
