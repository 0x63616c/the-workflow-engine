import { log } from "../../lib/logger";
import { toSlackMrkdwn } from "./format";
import { type ChatMessage, chatCompletion } from "./llm";

export interface ConversationContext {
  threadTs: string;
  channel: string;
  userId: string;
}

export interface ConversationParams {
  messages: ChatMessage[];
  reply: (text: string) => Promise<void>;
  setStatus: (status: string) => Promise<void>;
  context: ConversationContext;
}

export async function handleConversation(params: ConversationParams): Promise<void> {
  const { messages, reply, setStatus, context } = params;
  const threadLog = log.child(context);

  threadLog.info({ messageCount: messages.length }, "Evee conversation started");
  await setStatus("is thinking...");

  try {
    const rawResponse = await chatCompletion(messages, { logger: threadLog });
    const formatted = toSlackMrkdwn(rawResponse);
    await reply(formatted);
    threadLog.info("Evee conversation completed");
  } catch (err) {
    threadLog.error({ err }, "Evee conversation failed");
    await reply("Sorry, I'm having trouble right now. Try again in a bit.");
  }
}
