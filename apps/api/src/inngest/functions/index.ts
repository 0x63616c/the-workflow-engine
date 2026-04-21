import { eveeConversation } from "./evee-conversation";
import { eveeRespondSlack } from "./evee-respond-slack";
import { eveeToolExecutor } from "./evee-tool-executor";

export const inngestFunctions = [eveeConversation, eveeToolExecutor, eveeRespondSlack];
