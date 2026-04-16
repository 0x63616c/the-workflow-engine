import type { ModelMessage } from "ai";

interface MessageRecord {
  id: string;
  role: string;
  content: string;
  userId: string | null;
  displayName: string | null;
  createdAt: Date;
}

interface ImageRecord {
  id: string;
  messageId: string | null;
  mimeType: string;
  data: Buffer;
  sizeBytes: number;
}

export function buildMessagesFromRecords(
  messageRecords: MessageRecord[],
  imageRecords: ImageRecord[],
): ModelMessage[] {
  const sorted = [...messageRecords].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const imagesByMessageId = new Map<string, ImageRecord[]>();
  for (const img of imageRecords) {
    if (!img.messageId) continue;
    const existing = imagesByMessageId.get(img.messageId) ?? [];
    existing.push(img);
    imagesByMessageId.set(img.messageId, existing);
  }

  const messages: ModelMessage[] = [];

  for (const msg of sorted) {
    if (msg.role === "assistant") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }

    const prefix = msg.userId && msg.displayName ? `<${msg.userId}|${msg.displayName}>: ` : "";
    const text = `${prefix}${msg.content}`;
    const msgImages = imagesByMessageId.get(msg.id) ?? [];

    if (msgImages.length > 0) {
      const content: (
        | { type: "text"; text: string }
        | { type: "image"; image: string; mimeType: string }
      )[] = [{ type: "text", text }];

      for (const img of msgImages) {
        content.push({
          type: "image",
          image: img.data.toString("base64"),
          mimeType: img.mimeType,
        });
      }

      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: text });
    }
  }

  return messages;
}
