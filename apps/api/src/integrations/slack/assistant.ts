import { Assistant } from "@slack/bolt";

// DM handling through the assistant panel is deferred.
// For now, keep a minimal assistant that greets and directs users
// to @mention Evee in channels. The full DM pipeline will use
// the same processMessage flow once the channel path is verified.

export const eveeAssistant = new Assistant({
  threadStarted: async ({ say, setStatus }) => {
    await setStatus("is waking up...");
    await say(
      "Hey! I'm Evee. For the best experience, @mention me in a channel thread so I can see the full context!",
    );
  },

  userMessage: async ({ message, say, setStatus }) => {
    const userText = "text" in message ? (message.text ?? "") : "";
    const normalized = userText.toLowerCase().trim();

    if (normalized === "ruok?" || normalized === "status?") {
      await say("imok");
      return;
    }

    await setStatus("thinking...");
    await say(
      "I work best in channel threads right now! @mention me there and I'll have full conversation context :bufo-wave:",
    );
  },
});
