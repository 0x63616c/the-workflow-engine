import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../../env";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "google/gemma-4-31b-it";

const client = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: OPENROUTER_BASE_URL,
});

export const SYSTEM_PROMPT = `You are Evee, a friendly and helpful assistant bot in the World Wide Webb Slack workspace. You help with questions, smart home control, and general chat. Keep responses concise and conversational. You're warm but not overly enthusiastic.`;

export type ChatMessage = ChatCompletionMessageParam;

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
  });

  return response.choices[0]?.message?.content ?? "I'm not sure what to say.";
}
