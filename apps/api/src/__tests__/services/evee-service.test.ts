import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock external dependencies before imports
vi.mock("@slack/web-api", () => ({
  WebClient: vi.fn().mockImplementation(() => ({
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true }),
    },
    conversations: {
      replies: vi.fn().mockResolvedValue({ messages: [] }),
    },
  })),
}));

vi.mock("../../integrations/evee/llm", () => ({
  callLlm: vi.fn(),
}));

vi.mock("../../integrations/evee/tools", () => ({
  executeTool: vi.fn(),
}));

vi.mock("../../integrations/evee/messages", () => ({
  buildMessagesFromRecords: vi.fn(),
}));

vi.mock("../../integrations/slack/format", () => ({
  toSlackMrkdwn: vi.fn((text: string) => text),
}));

vi.mock("../../lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { WebClient } from "@slack/web-api";
import { callLlm } from "../../integrations/evee/llm";
import { buildMessagesFromRecords } from "../../integrations/evee/messages";
import { executeTool as registryExecuteTool } from "../../integrations/evee/tools";
import {
  buildLlmContext,
  downloadSlackImage,
  executeTool,
  isHealthCheckText,
  persistLlmCall,
  persistMessage,
  persistToolCall,
  runLlmCall,
  sendSlackResponse,
  sendSlackStatus,
  stripBotMention,
  syncSlackThread,
  upsertConversation,
} from "../../services/evee-service";

const mockCallLlm = vi.mocked(callLlm);
const mockRegistryExecuteTool = vi.mocked(registryExecuteTool);
const mockBuildMessagesFromRecords = vi.mocked(buildMessagesFromRecords);
const MockWebClient = vi.mocked(WebClient);

// ID prefixes from src/db/id.ts:
// conversation -> "conv_"
// message -> "msg_"
// image -> "img_"
// llmCall -> "llm_"
// toolCall -> "tc_"

type DbLike = Parameters<typeof upsertConversation>[0];

function makeConversationDb(rowsByCall: unknown[][]): DbLike {
  let selectCall = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      const rows = rowsByCall[selectCall++] ?? [];
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      };
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as DbLike;
}

// ============================================================
// upsertConversation
// ============================================================

describe("upsertConversation()", () => {
  it("creates a new conversation when none exists", async () => {
    // First select: no existing; second (post-insert re-select): no existing either
    const db = makeConversationDb([[], []]);

    const id = await upsertConversation(db, {
      source: "slack",
      slackThreadId: "T1",
      slackChannelId: "C1",
      startedBy: "U1",
      displayName: "Alice",
    });

    expect(typeof id).toBe("string");
    expect(id.startsWith("conv_")).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns existing conversation ID when thread already tracked (idempotent)", async () => {
    const existingId = "conv_existing123456";
    // First select: finds existing row — no insert needed
    const db = makeConversationDb([[{ id: existingId }]]);

    const id = await upsertConversation(db, {
      source: "slack",
      slackThreadId: "T1",
      slackChannelId: "C1",
      startedBy: "U1",
      displayName: "Alice",
    });

    expect(id).toBe(existingId);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates conversation without slack thread context (no pre-check select)", async () => {
    const db = {
      select: vi.fn(),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as DbLike;

    const id = await upsertConversation(db, {
      source: "api",
      startedBy: "U1",
      displayName: "Bob",
    });

    expect(typeof id).toBe("string");
    expect(id.startsWith("conv_")).toBe(true);
    // No thread context means no pre-check select
    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });

  it("handles race condition: re-select after insert returns winner ID", async () => {
    const raceId = "conv_race_winner1234";
    // First select: empty; after insert, second select: race winner
    const db = makeConversationDb([[], [{ id: raceId }]]);

    const id = await upsertConversation(db, {
      source: "slack",
      slackThreadId: "T1",
      slackChannelId: "C1",
      startedBy: "U1",
      displayName: "Alice",
    });

    expect(id).toBe(raceId);
  });
});

// ============================================================
// persistMessage
// ============================================================

describe("persistMessage()", () => {
  it("inserts message with text only and returns ID", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    const id = await persistMessage(db, {
      conversationId: "conv_1",
      role: "user",
      content: "Hello world",
      userId: "U1",
      displayName: "Alice",
    });

    // ID prefix for messages is "msg_"
    expect(id.startsWith("msg_")).toBe(true);
    // Only 1 insert (messages table), no image inserts
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv_1",
        role: "user",
        content: "Hello world",
        userId: "U1",
        displayName: "Alice",
      }),
    );
  });

  it("inserts message and image records when images provided", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    await persistMessage(db, {
      conversationId: "conv_1",
      role: "user",
      content: "Look at this",
      images: [
        { data: Buffer.from("png-data"), mimeType: "image/png", originalUrl: "http://slack/img" },
        { data: Buffer.from("jpg"), mimeType: "image/jpeg" },
      ],
    });

    // 1 message insert + 2 image inserts
    expect(db.insert).toHaveBeenCalledTimes(3);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/png" }));
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/jpeg" }));
  });

  it("stores image sizeBytes from buffer byteLength", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    const imageData = Buffer.from("12345678"); // 8 bytes
    await persistMessage(db, {
      conversationId: "conv_1",
      role: "user",
      content: "img",
      images: [{ data: imageData, mimeType: "image/png" }],
    });

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ sizeBytes: 8 }));
  });
});

// ============================================================
// downloadSlackImage
// ============================================================

describe("downloadSlackImage()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns buffer and mimeType on success", async () => {
    const mockData = new Uint8Array([1, 2, 3]).buffer;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(mockData),
      headers: { get: vi.fn().mockReturnValue("image/png") },
    }) as unknown as typeof fetch;

    const result = await downloadSlackImage("https://slack.com/img/foo.png", "xoxb-token");

    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe("image/png");
    expect(Buffer.isBuffer(result?.data)).toBe(true);
  });

  it("returns null on 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: vi.fn() },
    }) as unknown as typeof fetch;

    const result = await downloadSlackImage("https://slack.com/img/missing.png", "xoxb-token");
    expect(result).toBeNull();
  });

  it("returns null on 500 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: vi.fn() },
    }) as unknown as typeof fetch;

    const result = await downloadSlackImage("https://slack.com/img/error.png", "xoxb-token");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;

    const result = await downloadSlackImage("https://slack.com/img/err.png", "xoxb-token");
    expect(result).toBeNull();
  });

  it("defaults mimeType to image/png when content-type header missing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      headers: { get: vi.fn().mockReturnValue(null) },
    }) as unknown as typeof fetch;

    const result = await downloadSlackImage("https://slack.com/img/foo", "token");
    expect(result?.mimeType).toBe("image/png");
  });

  it("sends Authorization header with token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      headers: { get: vi.fn().mockReturnValue("image/png") },
    }) as unknown as typeof fetch;

    await downloadSlackImage("https://slack.com/img/auth.png", "xoxb-secret");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://slack.com/img/auth.png",
      expect.objectContaining({
        headers: { Authorization: "Bearer xoxb-secret" },
      }),
    );
  });
});

// ============================================================
// stripBotMention
// ============================================================

describe("stripBotMention()", () => {
  it("strips mention from start of message", () => {
    expect(stripBotMention("<@U12345> hello")).toBe("hello");
  });

  it("strips mention from middle of message", () => {
    expect(stripBotMention("hey <@UABC123> how are you")).toBe("hey  how are you");
  });

  it("handles message with no mention", () => {
    expect(stripBotMention("just a normal message")).toBe("just a normal message");
  });

  it("strips multiple mentions", () => {
    expect(stripBotMention("<@U111> and <@U222> hello")).toBe("and  hello");
  });

  it("handles empty string", () => {
    expect(stripBotMention("")).toBe("");
  });

  it("handles mention-only message, returning empty string", () => {
    expect(stripBotMention("<@UBOT123>")).toBe("");
  });
});

// ============================================================
// buildLlmContext
// ============================================================

describe("buildLlmContext()", () => {
  beforeEach(() => {
    mockBuildMessagesFromRecords.mockReturnValue([]);
  });

  // Helper: build a db that simulates: select().from().where().orderBy() for messages
  // and select().from().where() (awaited directly) for images
  function makeContextDb(msgRows: unknown[], imgRows: unknown[]): DbLike {
    let selectCall = 0;
    return {
      select: vi.fn().mockImplementation(() => {
        selectCall++;
        if (selectCall === 1) {
          // messages query: .select().from().where().orderBy()
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(msgRows),
            }),
          };
        }
        // images query: .select().from().where() (awaited directly)
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(imgRows),
        };
      }),
    } as unknown as DbLike;
  }

  it("returns null when no messages exist for conversation", async () => {
    const db = makeContextDb([], []);
    const result = await buildLlmContext(db, "conv_missing", "UBOT");
    expect(result).toBeNull();
  });

  it("returns ConversationContext when messages exist", async () => {
    const msgRecords = [
      {
        id: "msg_1",
        role: "user",
        content: "hi",
        userId: "U1",
        displayName: "Alice",
        createdAt: new Date(),
      },
    ];
    const builtMsgs = [{ role: "user" as const, content: "hi" }];
    mockBuildMessagesFromRecords.mockReturnValue(builtMsgs);

    const db = makeContextDb(msgRecords, []);
    const result = await buildLlmContext(db, "conv_1", "UBOT123");

    expect(result).not.toBeNull();
    expect(result?.conversationId).toBe("conv_1");
    expect(result?.botUserId).toBe("UBOT123");
    expect(result?.messages).toEqual(builtMsgs);
  });

  it("passes both message and image records to buildMessagesFromRecords", async () => {
    const msgRecords = [
      {
        id: "msg_1",
        role: "user",
        content: "look",
        userId: "U1",
        displayName: "A",
        createdAt: new Date(),
      },
    ];
    const imgRecords = [
      {
        id: "img_1",
        messageId: "msg_1",
        mimeType: "image/png",
        data: Buffer.from("x"),
        sizeBytes: 1,
      },
    ];

    mockBuildMessagesFromRecords.mockReturnValue([{ role: "user" as const, content: [] }]);

    const db = makeContextDb(msgRecords, imgRecords);

    await buildLlmContext(db, "conv_1", "UBOT");

    expect(mockBuildMessagesFromRecords).toHaveBeenCalledWith(msgRecords, imgRecords);
  });
});

// ============================================================
// runLlmCall
// ============================================================

describe("runLlmCall()", () => {
  it("delegates to callLlm with messages and botUserId", async () => {
    const mockResult = {
      text: "Hello!",
      finishReason: "stop",
      toolCalls: [],
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      providerMetadata: undefined,
    };
    mockCallLlm.mockResolvedValue(mockResult);

    const context = {
      conversationId: "conv_1",
      messages: [{ role: "user" as const, content: "hi" }],
      botUserId: "UBOT",
    };

    const result = await runLlmCall(context);

    expect(mockCallLlm).toHaveBeenCalledWith(context.messages, context.botUserId);
    expect(result).toEqual(mockResult);
  });

  it("returns LlmCallResult shape including tool calls", async () => {
    mockCallLlm.mockResolvedValue({
      text: "answer",
      finishReason: "tool-calls",
      toolCalls: [{ toolCallId: "tc_1", toolName: "rollDice", args: { sides: 6 } }],
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
      providerMetadata: { model: "test" },
    });

    const result = await runLlmCall({
      conversationId: "conv_1",
      messages: [],
      botUserId: "UBOT",
    });

    expect(result.toolCalls[0]).toMatchObject({
      toolCallId: "tc_1",
      toolName: "rollDice",
      args: { sides: 6 },
    });
    expect(result.usage.totalTokens).toBe(30);
    expect(result.finishReason).toBe("tool-calls");
  });
});

// ============================================================
// executeTool
// ============================================================

describe("executeTool()", () => {
  it("returns ToolExecutionResult on success", async () => {
    mockRegistryExecuteTool.mockResolvedValue({ result: "success" });

    const result = await executeTool("rollDice", { sides: 6 });

    expect(result.toolName).toBe("rollDice");
    expect(result.output).toEqual({ result: "success" });
    expect(result.error).toBeNull();
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures error message without rethrowing when tool fails", async () => {
    mockRegistryExecuteTool.mockRejectedValue(new Error("Tool blew up"));

    const result = await executeTool("badTool", {});

    expect(result.error).toBe("Tool blew up");
    expect(result.output).toBeNull();
    expect(result.toolName).toBe("badTool");
  });

  it("captures non-Error thrown values as string", async () => {
    mockRegistryExecuteTool.mockRejectedValue("string error");

    const result = await executeTool("badTool", {});

    expect(result.error).toBe("string error");
  });

  it("does not include callId in result (caller tracks call IDs separately)", async () => {
    mockRegistryExecuteTool.mockResolvedValue({});

    const result = await executeTool("anyTool", {});
    expect(result).not.toHaveProperty("callId");
  });
});

// ============================================================
// persistLlmCall
// ============================================================

describe("persistLlmCall()", () => {
  it("creates LLM call record with correct fields", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    const id = await persistLlmCall(db, {
      conversationId: "conv_1",
      model: "google/gemma-4-31b-it",
      promptTokens: 100,
      completionTokens: 50,
      stepName: "llm-call-1",
      finishReason: "stop",
      costUsd: "0.001",
    });

    // ID prefix for llmCall is "llm_"
    expect(id.startsWith("llm_")).toBe(true);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv_1",
        model: "google/gemma-4-31b-it",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        stepName: "llm-call-1",
        finishReason: "stop",
        costUsd: "0.001",
      }),
    );
  });

  it("calculates totalTokens as sum of promptTokens + completionTokens", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    await persistLlmCall(db, {
      conversationId: "conv_1",
      model: "test-model",
      promptTokens: 300,
      completionTokens: 200,
      stepName: "step",
      finishReason: "stop",
    });

    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ totalTokens: 500 }));
  });

  it("returns generated ID string", async () => {
    const db = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    } as unknown as DbLike;

    const id = await persistLlmCall(db, {
      conversationId: "conv_1",
      model: "model",
      promptTokens: 1,
      completionTokens: 1,
      stepName: "step",
      finishReason: "stop",
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

// ============================================================
// persistToolCall
// ============================================================

describe("persistToolCall()", () => {
  it("creates tool call record with correct fields", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    const id = await persistToolCall(db, {
      llmCallId: "llm_1234567890123456",
      conversationId: "conv_1",
      callId: "tc_abc",
      toolName: "rollDice",
      input: { sides: 6 },
      output: { result: 4 },
      error: null,
      durationMs: 42,
    });

    // ID prefix for toolCall is "tc_"
    expect(id.startsWith("tc_")).toBe(true);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        llmCallId: "llm_1234567890123456",
        conversationId: "conv_1",
        callId: "tc_abc",
        toolName: "rollDice",
        input: { sides: 6 },
        output: { result: 4 },
        error: null,
        durationMs: 42,
      }),
    );
  });

  it("stores error string and null output when tool failed", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    } as unknown as DbLike;

    await persistToolCall(db, {
      llmCallId: "llm_1",
      conversationId: "conv_1",
      callId: "tc_fail",
      toolName: "failTool",
      input: {},
      output: null,
      error: "Something went wrong",
      durationMs: 10,
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Something went wrong", output: null }),
    );
  });
});

// ============================================================
// sendSlackResponse
// ============================================================

describe("sendSlackResponse()", () => {
  it("posts message to Slack with correct params", async () => {
    const mockPostMessage = vi.fn().mockResolvedValue({ ok: true });
    MockWebClient.mockImplementationOnce(
      () =>
        ({
          chat: { postMessage: mockPostMessage },
        }) as unknown as InstanceType<typeof WebClient>,
    );

    await sendSlackResponse("xoxb-token", "C1234", "thread_ts_123", "Hello *world*");

    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: "C1234",
      thread_ts: "thread_ts_123",
      text: expect.any(String),
    });
  });

  it("constructs WebClient with the provided token", async () => {
    const mockPostMessage = vi.fn().mockResolvedValue({ ok: true });
    MockWebClient.mockImplementationOnce(
      () =>
        ({
          chat: { postMessage: mockPostMessage },
        }) as unknown as InstanceType<typeof WebClient>,
    );

    await sendSlackResponse("xoxb-secret-token", "C1", "ts1", "hi");

    expect(MockWebClient).toHaveBeenCalledWith("xoxb-secret-token");
  });
});

// ============================================================
// sendSlackStatus
// ============================================================

describe("sendSlackStatus()", () => {
  it("calls assistant.threads.setStatus with channel, thread, status, and loading_messages", async () => {
    const mockSetStatus = vi.fn().mockResolvedValue({ ok: true });
    MockWebClient.mockImplementationOnce(
      () =>
        ({
          assistant: { threads: { setStatus: mockSetStatus } },
        }) as unknown as InstanceType<typeof WebClient>,
    );

    await sendSlackStatus("xoxb-token", "C1234", "thread_ts_123", "is thinking...", [
      "thinking...",
      "bufo'ing...",
    ]);

    expect(mockSetStatus).toHaveBeenCalledWith({
      channel_id: "C1234",
      thread_ts: "thread_ts_123",
      status: "is thinking...",
      loading_messages: ["thinking...", "bufo'ing..."],
    });
  });

  it("swallows errors so a failing status call can't block the main pipeline", async () => {
    const mockSetStatus = vi.fn().mockRejectedValue(new Error("slack down"));
    MockWebClient.mockImplementationOnce(
      () =>
        ({
          assistant: { threads: { setStatus: mockSetStatus } },
        }) as unknown as InstanceType<typeof WebClient>,
    );

    // Should not throw
    await expect(
      sendSlackStatus("xoxb-token", "C1", "ts1", "is thinking...", ["thinking..."]),
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// isHealthCheckText
// ============================================================

describe("isHealthCheckText()", () => {
  it("returns true for lowercase 'ruok?'", () => {
    expect(isHealthCheckText("ruok?")).toBe(true);
  });

  it("returns true for 'status?'", () => {
    expect(isHealthCheckText("status?")).toBe(true);
  });

  it("returns true for mixed-case 'RUOK?'", () => {
    expect(isHealthCheckText("RUOK?")).toBe(true);
  });

  it("handles leading/trailing whitespace", () => {
    expect(isHealthCheckText("  ruok?  ")).toBe(true);
  });

  it("returns false for unrelated messages", () => {
    expect(isHealthCheckText("what's the weather?")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isHealthCheckText("")).toBe(false);
  });
});

// ============================================================
// syncSlackThread
// ============================================================

type SyncDb = Parameters<typeof syncSlackThread>[0];

function makeSyncDb(existingRows: unknown[][] = []): SyncDb {
  let selectCall = 0;
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi.fn().mockImplementation(() => {
      const rows = existingRows[selectCall++] ?? [];
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      };
    }),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  } as unknown as SyncDb;
  return db;
}

describe("syncSlackThread()", () => {
  it("upserts each non-bot user message from the Slack thread into the DB", async () => {
    const mockReplies = vi.fn().mockResolvedValue({
      messages: [
        { ts: "ts_1", user: "U_ALICE", text: "hello" },
        { ts: "ts_2", user: "U_BOB", text: "world" },
        { ts: "ts_3", user: "U_CAROL", text: "hey" },
      ],
    });
    MockWebClient.mockImplementationOnce(
      () =>
        ({ conversations: { replies: mockReplies } }) as unknown as InstanceType<typeof WebClient>,
    );
    const slack = new WebClient("xoxb-token");

    // All selects return empty (no existing rows)
    const db = makeSyncDb([[], [], []]);

    await syncSlackThread(db, slack, {
      conversationId: "conv_1",
      channel: "C1",
      threadTs: "ts_root",
      botUserId: "UBOT",
      slackBotToken: "xoxb-token",
      lookupUser: async (u) => u,
    });

    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it("skips Evee's own messages (user === botUserId)", async () => {
    const mockReplies = vi.fn().mockResolvedValue({
      messages: [
        { ts: "ts_bot", user: "UBOT", text: "imok" },
        { ts: "ts_user", user: "U_ALICE", text: "ruok?" },
      ],
    });
    MockWebClient.mockImplementationOnce(
      () =>
        ({ conversations: { replies: mockReplies } }) as unknown as InstanceType<typeof WebClient>,
    );
    const slack = new WebClient("xoxb-token");

    const db = makeSyncDb([[]]);

    await syncSlackThread(db, slack, {
      conversationId: "conv_1",
      channel: "C1",
      threadTs: "ts_root",
      botUserId: "UBOT",
      slackBotToken: "xoxb-token",
      lookupUser: async (u) => u,
    });

    // Only the user message is persisted
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("skips messages with bot_id or subtype", async () => {
    const mockReplies = vi.fn().mockResolvedValue({
      messages: [
        { ts: "ts_bot", user: "U_BOT", bot_id: "B_EXTERNAL", text: "from a bot app" },
        { ts: "ts_edit", user: "U_ALICE", subtype: "message_changed", text: "edited" },
        { ts: "ts_ok", user: "U_ALICE", text: "valid message" },
      ],
    });
    MockWebClient.mockImplementationOnce(
      () =>
        ({ conversations: { replies: mockReplies } }) as unknown as InstanceType<typeof WebClient>,
    );
    const slack = new WebClient("xoxb-token");

    const db = makeSyncDb([[]]);

    await syncSlackThread(db, slack, {
      conversationId: "conv_1",
      channel: "C1",
      threadTs: "ts_root",
      botUserId: "UBOT",
      slackBotToken: "xoxb-token",
      lookupUser: async (u) => u,
    });

    // Only the valid message is persisted
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("dedupes by (conversationId, slackTs) — if existing row found, no insert", async () => {
    const mockReplies = vi.fn().mockResolvedValue({
      messages: [
        { ts: "ts_existing", user: "U_ALICE", text: "already in db" },
        { ts: "ts_new", user: "U_BOB", text: "new message" },
      ],
    });
    MockWebClient.mockImplementationOnce(
      () =>
        ({ conversations: { replies: mockReplies } }) as unknown as InstanceType<typeof WebClient>,
    );
    const slack = new WebClient("xoxb-token");

    // First select returns existing row; second returns empty
    const db = makeSyncDb([[{ id: "msg_existing" }], []]);

    await syncSlackThread(db, slack, {
      conversationId: "conv_1",
      channel: "C1",
      threadTs: "ts_root",
      botUserId: "UBOT",
      slackBotToken: "xoxb-token",
      lookupUser: async (u) => u,
    });

    // Only the new message is inserted
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
