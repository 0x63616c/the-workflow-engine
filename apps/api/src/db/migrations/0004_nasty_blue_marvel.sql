ALTER TABLE "images" DROP CONSTRAINT "images_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "images" DROP CONSTRAINT "images_message_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "llm_calls" DROP CONSTRAINT "llm_calls_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "tool_calls" DROP CONSTRAINT "tool_calls_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "tool_calls" DROP CONSTRAINT "tool_calls_llm_call_id_llm_calls_id_fk";
--> statement-breakpoint
DROP INDEX "uq_slack_thread";--> statement-breakpoint
ALTER TABLE "llm_calls" ALTER COLUMN "cost_usd" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_llm_call_id_llm_calls_id_fk" FOREIGN KEY ("llm_call_id") REFERENCES "public"."llm_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_slack_thread" ON "conversations" USING btree ("slack_thread_id","slack_channel_id") WHERE slack_thread_id IS NOT NULL AND slack_channel_id IS NOT NULL;