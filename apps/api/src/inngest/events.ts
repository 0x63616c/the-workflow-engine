export interface SlackMessageReceivedData {
  conversationId: string;
  threadId: string;
  channel: string;
  userId: string;
  displayName: string;
  text: string;
  imageIds: string[];
  botUserId: string;
}

export interface EveeToolCallRequestedData {
  callId: string;
  conversationId: string;
  toolName: string;
  input: Record<string, unknown>;
  llmCallId: string;
}

export interface EveeToolCallCompletedData {
  callId: string;
  conversationId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  error: string | null;
  durationMs: number;
  llmCallId: string;
}

export interface EveeResponseReadyData {
  conversationId: string;
  threadId: string;
  channel: string;
  response: string;
  llmCalls: Array<{
    id: string;
    stepName: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    finishReason: string;
  }>;
}

export type EveeEvents = {
  "slack/message.received": { data: SlackMessageReceivedData };
  "evee/tool-call.requested": { data: EveeToolCallRequestedData };
  "evee/tool-call.completed": { data: EveeToolCallCompletedData };
  "evee/response.ready": { data: EveeResponseReadyData };
};
