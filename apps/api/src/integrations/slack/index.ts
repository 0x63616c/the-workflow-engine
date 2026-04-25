import { App, LogLevel } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { conversations } from "../../db/schema";
import { env } from "../../env";
import { log } from "../../lib/logger";
import { runEveeConversation } from "../../services/evee-conversation-service";
import * as eveeService from "../../services/evee-service";
import { eveeAssistant } from "./assistant";

let app: App | null = null;
let botUserId: string | null = null;

interface ProcessMessageParams {
  channel: string;
  threadTs: string;
  userId: string;
  text: string;
}

async function processMessage(params: ProcessMessageParams): Promise<void> {
  const { channel, threadTs, userId, text } = params;

  const cleanText = eveeService.stripBotMention(text);

  const slack = new WebClient(env.SLACK_BOT_TOKEN);

  const displayName = await slack.users.info({ user: userId }).then((info) => {
    return info.user?.profile?.display_name || info.user?.real_name || info.user?.name || userId;
  });

  const conversationId = await eveeService.upsertConversation(db, {
    source: "slack",
    slackThreadId: threadTs,
    slackChannelId: channel,
    startedBy: userId,
    displayName,
  });

  await eveeService.syncSlackThread(db, slack, {
    conversationId,
    channel,
    threadTs,
    botUserId: botUserId ?? "unknown",
    slackBotToken: env.SLACK_BOT_TOKEN,
    lookupUser: async (u) => {
      const info = await slack.users.info({ user: u });
      return info.user?.profile?.display_name || info.user?.real_name || info.user?.name || u;
    },
  });

  log.info(
    { conversationId, channel, threadTs },
    "Slack thread synced, starting Evee conversation",
  );

  void runEveeConversation({
    conversationId,
    botUserId: botUserId ?? "unknown",
    threadId: threadTs,
    channel,
    text: cleanText,
  }).catch((err) => {
    log.error({ err, conversationId, channel, threadTs }, "Evee conversation handler crashed");
  });
}

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

  app.event("app_mention", async ({ event, client }) => {
    const threadTs = event.thread_ts ?? event.ts;
    const text = event.text ?? "";

    try {
      await processMessage({
        channel: event.channel,
        threadTs,
        userId: event.user ?? "unknown",
        text,
      });
    } catch (err) {
      log.error({ err, channel: event.channel, threadTs }, "Failed to process Slack message");
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text: `something went wrong processing that message: ${err instanceof Error ? err.message : "unknown error"}`,
      });
    }
  });

  app.event("message", async ({ event, client }) => {
    if (!("subtype" in event) || event.subtype !== "message_changed") return;
    const changed = event as {
      channel: string;
      message?: { user?: string; thread_ts?: string; ts?: string };
    };
    const threadTs = changed.message?.thread_ts ?? changed.message?.ts;
    if (!threadTs || !changed.message?.user) return;

    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.slackThreadId, threadTs),
          eq(conversations.slackChannelId, changed.channel),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await client.chat.postEphemeral({
        channel: changed.channel,
        user: changed.message.user,
        thread_ts: threadTs,
        text: "heads up! i don't pick up edits, so if you changed something important, send it as a new message :bufo-eyes:",
      });
    }
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
