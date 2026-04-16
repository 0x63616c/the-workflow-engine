import { EventSchemas, Inngest } from "inngest";
import type { EveeEvents } from "./events";

export const inngest = new Inngest({
  id: "the-workflow-engine",
  schemas: new EventSchemas().fromRecord<EveeEvents>(),
});
