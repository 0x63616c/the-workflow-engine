import { App, LogLevel } from "@slack/bolt";
import { env } from "../../env";
import { log } from "../../lib/logger";
import { eveeAssistant } from "./assistant";
import { handleConversation } from "./handler";
import {
  type ImageDownload,
  type SlackThreadMessage,
  buildThreadMessages,
  stripMentions,
} from "./thread";

let app: App | null = null;
let botUserId: string | null = null;

export async function initSlack(): Promise<void> {
  app = new App({
    token: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  const authResult = await app.client.auth.test();
  botUserId = authResult.user_id ?? null;
  log.info({ botUserId }, "Evee bot user ID resolved");

  app.assistant(eveeAssistant);

  app.event("app_mention", async ({ event, client, say }) => {
    const threadTs = event.thread_ts ?? event.ts;
    const userText = stripMentions(event.text);
    const normalized = userText.toLowerCase();

    if (normalized === "ruok?" || normalized === "status?") {
      await say({ text: "imok", thread_ts: threadTs });
      return;
    }

    const result = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs,
    });

    const rawMessages = (result.messages ?? []) as SlackThreadMessage[];

    const messages = await buildThreadMessages(rawMessages, botUserId ?? "", {
      lookupUser: async (userId) => {
        const info = await client.users.info({ user: userId });
        return (
          info.user?.profile?.display_name || info.user?.real_name || info.user?.name || userId
        );
      },
      downloadFile: async (url) => {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` },
        });
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = response.headers.get("content-type") ?? "image/png";
        return { base64, mimeType } satisfies ImageDownload;
      },
    });

    await handleConversation({
      messages,
      reply: async (text) => {
        await say({ text, thread_ts: threadTs });
      },
      setStatus: async (status) => {
        await client.assistant.threads.setStatus({
          channel_id: event.channel,
          thread_ts: threadTs,
          status,
        });
      },
      context: {
        threadTs,
        channel: event.channel,
        userId: event.user ?? "unknown",
      },
    });
  });

  await app.start();
  log.info("Slack (Evee) connected via Socket Mode");
}

export async function stopSlack(): Promise<void> {
  if (app) {
    await app.stop();
    app = null;
  }
}
