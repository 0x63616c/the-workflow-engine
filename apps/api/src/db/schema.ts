import {
  customType,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const systemInfo = pgTable("system_info", {
  id: serial().primaryKey(),
  key: text().notNull().unique(),
  value: text().notNull(),
});

export const appConfig = pgTable("app_config", {
  id: serial().primaryKey(),
  key: text().notNull().unique(),
  value: jsonb().notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const countdownEvents = pgTable("countdown_events", {
  id: serial().primaryKey(),
  title: text().notNull(),
  date: text().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const conversations = pgTable(
  "conversations",
  {
    id: text().primaryKey(),
    source: text().notNull(),
    slackThreadId: text("slack_thread_id"),
    slackChannelId: text("slack_channel_id"),
    startedBy: text("started_by"),
    startedByName: text("started_by_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("uq_slack_thread").on(table.slackThreadId, table.slackChannelId)],
);

export const messages = pgTable("messages", {
  id: text().primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text().notNull(),
  content: text().notNull(),
  userId: text("user_id"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const images = pgTable("images", {
  id: text().primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  messageId: text("message_id").references(() => messages.id),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  originalUrl: text("original_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const llmCalls = pgTable("llm_calls", {
  id: text().primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  inngestRunId: text("inngest_run_id"),
  stepName: text("step_name").notNull(),
  model: text().notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  finishReason: text("finish_reason").notNull(),
  openrouterGenerationId: text("openrouter_generation_id"),
  costUsd: numeric("cost_usd"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const toolCalls = pgTable("tool_calls", {
  id: text().primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  llmCallId: text("llm_call_id").references(() => llmCalls.id),
  callId: text("call_id").notNull(),
  toolName: text("tool_name").notNull(),
  input: jsonb().notNull(),
  output: jsonb(),
  error: text(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
