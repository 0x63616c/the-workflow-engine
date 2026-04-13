import { App, LogLevel } from "@slack/bolt";
import { env } from "../../env";
import { log } from "../../lib/logger";
import { eveeAssistant } from "./assistant";
import { LOADING_MESSAGES } from "./constants";
import { chatCompletion } from "./openrouter";

let app: App | null = null;

export async function initSlack(): Promise<void> {
  app = new App({
    token: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  app.assistant(eveeAssistant);

  app.event("app_mention", async ({ event, client, say }) => {
    const threadTs = event.thread_ts ?? event.ts;

    await client.assistant.threads.setStatus({
      channel_id: event.channel,
      thread_ts: threadTs,
      status: "is thinking...",
    });

    const userText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    const reply = await chatCompletion(userText);

    await say({
      text: reply,
      thread_ts: threadTs,
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
