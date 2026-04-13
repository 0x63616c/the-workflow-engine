import { App, LogLevel } from "@slack/bolt";
import { env } from "../../env";
import { log } from "../../lib/logger";
import { eveeAssistant } from "./assistant";
import { type ChatMessage, chatCompletion } from "./openrouter";

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
    const userText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    const normalized = userText.toLowerCase();

    if (normalized === "ruok?" || normalized === "status?") {
      await say({ text: "imok", thread_ts: threadTs });
      return;
    }

    await client.assistant.threads.setStatus({
      channel_id: event.channel,
      thread_ts: threadTs,
      status: "is thinking...",
    });

    try {
      const messages = await buildThreadMessages(client, event.channel, threadTs);
      const reply = await chatCompletion(messages);
      await say({ text: reply, thread_ts: threadTs });
    } catch (err) {
      log.error({ err }, "OpenRouter chat completion failed (mention)");
      await say({
        text: "Sorry, I'm having trouble right now. Try again in a bit.",
        thread_ts: threadTs,
      });
    }
  });

  await app.start();
  log.info("Slack (Evee) connected via Socket Mode");
}

function stripMentions(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, "").trim();
}

async function buildThreadMessages(
  client: App["client"],
  channel: string,
  threadTs: string,
): Promise<ChatMessage[]> {
  const result = await client.conversations.replies({
    channel,
    ts: threadTs,
  });

  const threadMessages = result.messages ?? [];
  const messages: ChatMessage[] = [];

  for (const msg of threadMessages) {
    const text = stripMentions(msg.text ?? "");
    if (!text) continue;

    if (msg.user === botUserId) {
      messages.push({ role: "assistant", content: text });
    } else {
      messages.push({ role: "user", content: text });
    }
  }

  return messages;
}

export async function stopSlack(): Promise<void> {
  if (app) {
    await app.stop();
    app = null;
  }
}
