import { Assistant } from "@slack/bolt";
import { LOADING_MESSAGES } from "./constants";
import { chatCompletion } from "./openrouter";

export const eveeAssistant = new Assistant({
  threadStarted: async ({ say, setStatus }) => {
    await setStatus("is waking up...");
    await say("Hey! I'm Evee. What can I help you with?");
  },

  userMessage: async ({ message, say, setStatus }) => {
    await setStatus({
      status: "is thinking...",
      loading_messages: LOADING_MESSAGES,
    });

    const userText = "text" in message ? (message.text ?? "") : "";
    const reply = await chatCompletion(userText);
    await say(reply);
  },
});
