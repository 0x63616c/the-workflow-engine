import { eveeConversation } from "./evee-conversation";
import { eveePersistToolCall } from "./evee-persist-tool-call";
import { eveeRespondSlack } from "./evee-respond-slack";
import { eveeToolExecutor } from "./evee-tool-executor";

export const inngestFunctions = [
  eveeConversation,
  eveeToolExecutor,
  eveePersistToolCall,
  eveeRespondSlack,
];
