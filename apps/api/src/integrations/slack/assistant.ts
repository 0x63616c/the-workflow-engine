import { Assistant } from "@slack/bolt";
import { LOADING_MESSAGES } from "./constants";
import { handleConversation } from "./handler";

export const eveeAssistant = new Assistant({
  threadStarted: async ({ say, setStatus }) => {
    await setStatus("is waking up...");
    await say("Hey! I'm Evee. What can I help you with?");
  },

  userMessage: async ({ message, say, setStatus }) => {
    const userText = "text" in message ? (message.text ?? "") : "";
    const normalized = userText.toLowerCase().trim();

    if (normalized === "ruok?" || normalized === "status?") {
      await say("imok");
      return;
    }

    await handleConversation({
      messages: [{ role: "user", content: userText }],
      reply: async (text) => {
        await say(text);
      },
      setStatus: async (status) => {
        await setStatus({ status, loading_messages: LOADING_MESSAGES });
      },
      context: {
        threadTs: "ts" in message ? (message.ts ?? "dm") : "dm",
        channel: "channel" in message ? (message.channel ?? "dm") : "dm",
        userId: "user" in message ? ((message.user as string) ?? "unknown") : "unknown",
      },
    });
  },
});
