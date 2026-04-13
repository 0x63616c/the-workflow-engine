import { slackifyMarkdown } from "slackify-markdown";

export function toSlackMrkdwn(text: string): string {
  return slackifyMarkdown(text);
}
