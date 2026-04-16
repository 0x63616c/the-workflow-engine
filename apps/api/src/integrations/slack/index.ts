import { App, LogLevel } from "@slack/bolt";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { newId } from "../../db/id";
import { conversations, images, messages } from "../../db/schema";
import { env } from "../../env";
import { inngest } from "../../inngest/client";
import { log } from "../../lib/logger";
import { eveeAssistant } from "./assistant";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

interface SlackFile {
  name?: string;
  mimetype?: string;
  url_private?: string;
}

let app: App | null = null;
let botUserId: string | null = null;

interface ProcessMessageParams {
  channel: string;
  threadTs: string;
  userId: string;
  text: string;
  files: SlackFile[];
  resolveDisplayName: () => Promise<string>;
}

async function processMessage(params: ProcessMessageParams): Promise<void> {
  const { channel, threadTs, userId, text, files, resolveDisplayName } = params;

  const displayName = await resolveDisplayName();

  const existing = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.slackThreadId, threadTs), eq(conversations.slackChannelId, channel)),
    )
    .limit(1);

  let conversationId: string;

  if (existing.length === 0) {
    conversationId = newId("conversation");
    await db.insert(conversations).values({
      id: conversationId,
      source: "slack",
      slackThreadId: threadTs,
      slackChannelId: channel,
      startedBy: userId,
      startedByName: displayName,
    });
  } else {
    conversationId = existing[0].id;
  }

  const messageId = newId("message");
  await db.insert(messages).values({
    id: messageId,
    conversationId,
    role: "user",
    content: text,
    userId,
    displayName,
  });

  const imageIds: string[] = [];
  const imageFiles = files.filter(
    (f) => f.mimetype && IMAGE_MIME_TYPES.has(f.mimetype) && f.url_private,
  );

  for (const file of imageFiles) {
    const url = file.url_private as string;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = file.mimetype ?? "image/png";

    const imageId = newId("image");
    await db.insert(images).values({
      id: imageId,
      conversationId,
      messageId,
      mimeType,
      data: buffer,
      sizeBytes: buffer.byteLength,
      originalUrl: file.url_private,
    });
    imageIds.push(imageId);
  }

  await inngest.send({
    name: "slack/message.received",
    data: {
      conversationId,
      threadId: threadTs,
      channel,
      userId,
      displayName,
      text,
      imageIds,
      botUserId: botUserId ?? "unknown",
    },
  });

  log.info(
    { conversationId, messageId, imageCount: imageIds.length, channel, threadTs },
    "Slack message processed, Inngest event fired",
  );
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

    const normalized = text
      .replace(/<@[A-Z0-9]+>/g, "")
      .trim()
      .toLowerCase();
    if (normalized === "ruok?" || normalized === "status?") {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text: "imok",
      });
      return;
    }

    const files = (event as { files?: SlackFile[] }).files ?? [];

    await processMessage({
      channel: event.channel,
      threadTs,
      userId: event.user ?? "unknown",
      text,
      files,
      resolveDisplayName: async () => {
        if (!event.user) return "Unknown";
        const info = await client.users.info({ user: event.user });
        return (
          info.user?.profile?.display_name || info.user?.real_name || info.user?.name || event.user
        );
      },
    });
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
