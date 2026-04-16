import { Inngest } from "inngest";
import { env } from "../env";

export const inngest = new Inngest({
  id: "the-workflow-engine",
  baseUrl: env.INNGEST_BASE_URL,
  eventKey: env.INNGEST_EVENT_KEY,
});
