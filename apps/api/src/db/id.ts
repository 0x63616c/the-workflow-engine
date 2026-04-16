import { customAlphabet } from "nanoid";

const ID_LENGTH = 16;

const nanoid = customAlphabet(
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  ID_LENGTH,
);

export const ID_PREFIXES = {
  conversation: "conv",
  message: "msg",
  image: "img",
  llmCall: "llm",
  toolCall: "tc",
} as const;

type IdType = keyof typeof ID_PREFIXES;

export function newId(type: IdType): string {
  return `${ID_PREFIXES[type]}_${nanoid()}`;
}
