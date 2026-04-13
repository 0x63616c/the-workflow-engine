import type { ChatMessage } from "./llm";

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export interface SlackFile {
  name?: string;
  mimetype?: string;
  url_private?: string;
}

export interface SlackThreadMessage {
  user?: string;
  text?: string;
  files?: SlackFile[];
}

export interface ImageDownload {
  base64: string;
  mimeType: string;
}

export interface BuildThreadOptions {
  lookupUser: (userId: string) => Promise<string>;
  downloadFile: (url: string) => Promise<ImageDownload>;
}

export function stripMentions(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, "").trim();
}

export async function resolveUserNames(
  messages: SlackThreadMessage[],
  lookupFn: (userId: string) => Promise<string>,
): Promise<Map<string, string>> {
  const userIds = new Set<string>();
  for (const msg of messages) {
    if (msg.user) userIds.add(msg.user);
  }

  const nameMap = new Map<string, string>();
  const lookups = [...userIds].map(async (id) => {
    const name = await lookupFn(id);
    nameMap.set(id, name);
  });
  await Promise.all(lookups);

  return nameMap;
}

export async function buildThreadMessages(
  rawMessages: SlackThreadMessage[],
  botUserId: string,
  options: BuildThreadOptions,
): Promise<ChatMessage[]> {
  const nameMap = await resolveUserNames(rawMessages, options.lookupUser);
  const messages: ChatMessage[] = [];

  for (const msg of rawMessages) {
    const text = stripMentions(msg.text ?? "");
    const isBotMessage = msg.user === botUserId;

    if (isBotMessage) {
      if (!text) continue;
      messages.push({ role: "assistant", content: text });
      continue;
    }

    const userId = msg.user ?? "unknown";
    const displayName = nameMap.get(userId) ?? "Unknown";
    const prefix = `<${userId}|${displayName}>`;

    const images = await downloadImages(msg.files ?? [], options.downloadFile);
    const nonImageFiles = getNonImageFileNames(msg.files ?? []);

    const textParts: string[] = [];
    if (text) textParts.push(`${prefix}: ${text}`);
    else if (images.length > 0 || nonImageFiles.length > 0) textParts.push(`${prefix}:`);

    for (const fileName of nonImageFiles) {
      textParts.push(`[attached: ${fileName}]`);
    }

    const fullText = textParts.join("\n");

    if (images.length > 0) {
      const content: (
        | { type: "text"; text: string }
        | { type: "image"; image: string; mimeType: string }
      )[] = [];

      if (fullText) content.push({ type: "text", text: fullText });

      for (const img of images) {
        content.push({
          type: "image",
          image: img.base64,
          mimeType: img.mimeType,
        });
      }

      messages.push({ role: "user", content });
    } else if (fullText) {
      messages.push({ role: "user", content: fullText });
    }
  }

  return messages;
}

async function downloadImages(
  files: SlackFile[],
  downloadFn: (url: string) => Promise<ImageDownload>,
): Promise<ImageDownload[]> {
  const imageFiles = files.filter(
    (f) => f.mimetype && IMAGE_MIME_TYPES.has(f.mimetype) && f.url_private,
  );

  const results = await Promise.all(imageFiles.map((f) => downloadFn(f.url_private as string)));

  return results;
}

function getNonImageFileNames(files: SlackFile[]): string[] {
  return files
    .filter((f) => !f.mimetype || !IMAGE_MIME_TYPES.has(f.mimetype))
    .map((f) => f.name ?? "unknown file");
}
