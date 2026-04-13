# Slack Evee Assistant - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Evee to Slack via Socket Mode so users can DM or @mention her and get an AI-powered reply via OpenRouter.

**Architecture:** Bolt.js app running inside the existing API process. Socket Mode WebSocket opens on server startup alongside HA and Inngest. Uses the Bolt `Assistant` class for DM threads (with shimmer/loading status) and `app_mention` event for channel @mentions. OpenRouter (OpenAI-compatible API, free model) generates replies.

**Tech Stack:** `@slack/bolt` (Socket Mode), `openai` SDK (pointed at OpenRouter), Zod env validation, 1Password for secrets.

---

## Prerequisites (Manual, One-Time)

Before any code runs:

1. In Slack app settings (api.slack.com/apps), go to **Basic Information > App-Level Tokens**
2. Create a token with `connections:write` scope. Name it "socket-mode".
3. Copy the `xapp-...` token and save it to 1Password: `op://Homelab/Slack Bot (Evee)/slack_app_token`
4. In the app settings, go to **Socket Mode** and toggle it ON
5. In **Event Subscriptions**, ensure `app_mention` and `message.im` are subscribed

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install @slack/bolt and openai**

```bash
cd apps/api && bun add @slack/bolt openai
```

- [ ] **Step 2: Verify packages installed**

```bash
cd apps/api && bun run typecheck
```
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json apps/api/bun.lock
git commit -m "chore: add @slack/bolt and openai dependencies"
git push
```

---

### Task 2: Add Environment Variables

**Files:**
- Modify: `apps/api/src/env.ts`

- [ ] **Step 1: Add Slack and OpenRouter env vars to the Zod schema**

```ts
// Add to envSchema in apps/api/src/env.ts:
SLACK_BOT_TOKEN: z.string().min(1).startsWith("xoxb-"),
SLACK_APP_TOKEN: z.string().min(1).startsWith("xapp-"),
OPENROUTER_API_KEY: z.string().min(1),
```

All three are required with no defaults. The app should fail to start if they're missing.

- [ ] **Step 2: Update Tiltfile / docker-compose / dev scripts to inject secrets**

In `Tiltfile` (or wherever the API dev process is started), add `op run` to inject the three new env vars. The 1Password references:

- `op://Homelab/Slack Bot (Evee)/slack_bot_token`
- `op://Homelab/Slack Bot (Evee)/slack_app_token`
- `op://Homelab/OpenRouter/credential`

Map them to env vars:
- `SLACK_BOT_TOKEN` = `op://Homelab/Slack Bot (Evee)/slack_bot_token`
- `SLACK_APP_TOKEN` = `op://Homelab/Slack Bot (Evee)/slack_app_token`
- `OPENROUTER_API_KEY` = `op://Homelab/OpenRouter/credential`

- [ ] **Step 3: Verify env loads (typecheck)**

```bash
cd apps/api && bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/env.ts
git commit -m "feat: add Slack and OpenRouter env vars"
git push
```

---

### Task 3: Create OpenRouter Client

**Files:**
- Create: `apps/api/src/integrations/slack/openrouter.ts`
- Test: `apps/api/src/__tests__/integrations/openrouter.test.ts`

- [ ] **Step 1: Write failing test for OpenRouter chat function**

```ts
// apps/api/src/__tests__/integrations/openrouter.test.ts
import { describe, expect, it, vi } from "vitest";

// Mock the openai module
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Hello! I'm Evee." } }],
  });
  return {
    default: class {
      chat = { completions: { create: mockCreate } };
    },
  };
});

import { chatCompletion } from "../../integrations/slack/openrouter";

describe("openrouter", () => {
  it("returns a chat completion response", async () => {
    const result = await chatCompletion("Hi Evee!");
    expect(result).toBe("Hello! I'm Evee.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && bunx vitest run src/__tests__/integrations/openrouter.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement OpenRouter client**

```ts
// apps/api/src/integrations/slack/openrouter.ts
import OpenAI from "openai";
import { env } from "../../env";

const OPENROUTER_BASE_URL = "https://api.openrouter.ai/api/v1";
const MODEL = "openrouter/auto";

const client = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: OPENROUTER_BASE_URL,
});

const SYSTEM_PROMPT = `You are Evee, a friendly and helpful assistant bot in the World Wide Webb Slack workspace. You help with questions, smart home control, and general chat. Keep responses concise and conversational. You're warm but not overly enthusiastic.`;

export async function chatCompletion(userMessage: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content ?? "I'm not sure what to say.";
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && bunx vitest run src/__tests__/integrations/openrouter.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/integrations/slack/openrouter.ts apps/api/src/__tests__/integrations/openrouter.test.ts
git commit -m "feat: add OpenRouter chat completion client"
git push
```

---

### Task 4: Create Slack Integration (Bolt + Assistant)

**Files:**
- Create: `apps/api/src/integrations/slack/index.ts`
- Create: `apps/api/src/integrations/slack/assistant.ts`
- Create: `apps/api/src/integrations/slack/constants.ts`

- [ ] **Step 1: Create loading messages constants**

```ts
// apps/api/src/integrations/slack/constants.ts
export const LOADING_MESSAGES = [
  "Thinking...",
  "Working on it...",
  "Computing...",
  "Bufo'ing...",
  "Processing...",
  "Pondering...",
  "Crunching...",
  "Brewing a response...",
  "Almost there...",
  "On it...",
];
```

- [ ] **Step 2: Create the Assistant handler**

```ts
// apps/api/src/integrations/slack/assistant.ts
import { Assistant } from "@slack/bolt";
import { LOADING_MESSAGES } from "./constants";
import { chatCompletion } from "./openrouter";

export const eveeAssistant = new Assistant({
  threadStarted: async ({ say, setStatus }) => {
    await setStatus("is waking up...");
    await say("Hey! I'm Evee. What can I help you with?");
  },

  userMessage: async ({ message, say, setStatus }) => {
    await setStatus({
      status: "is thinking...",
      loading_messages: LOADING_MESSAGES,
    });

    const userText = message.text ?? "";
    const reply = await chatCompletion(userText);
    await say(reply);
  },
});
```

- [ ] **Step 3: Create the main Slack integration (Socket Mode Bolt app)**

```ts
// apps/api/src/integrations/slack/index.ts
import { App, LogLevel } from "@slack/bolt";
import { env } from "../../env";
import { eveeAssistant } from "./assistant";
import { LOADING_MESSAGES } from "./constants";
import { chatCompletion } from "./openrouter";

let app: App | null = null;

export async function initSlack(): Promise<void> {
  app = new App({
    token: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  // Register the Assistant for DM threads
  app.assistant(eveeAssistant);

  // Handle @Evee mentions in channels
  app.event("app_mention", async ({ event, client, say }) => {
    const threadTs = event.thread_ts ?? event.ts;

    await client.assistant.threads.setStatus({
      channel_id: event.channel,
      thread_ts: threadTs,
      status: "is thinking...",
    });

    const userText = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    const reply = await chatCompletion(userText);

    await say({
      text: reply,
      thread_ts: threadTs,
    });
  });

  await app.start();
  console.log("Slack (Evee) connected via Socket Mode");
}

export async function stopSlack(): Promise<void> {
  if (app) {
    await app.stop();
    app = null;
  }
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd apps/api && bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/integrations/slack/
git commit -m "feat: add Slack integration with Bolt Socket Mode and Assistant"
git push
```

---

### Task 5: Wire Slack Into Server Startup

**Files:**
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Import and init Slack in server.ts**

Add to the top-level imports:

```ts
import { initSlack, stopSlack } from "./integrations/slack";
```

Add after `await ha.init();`:

```ts
await initSlack();
```

Add `await stopSlack();` to the shutdown handler:

```ts
const shutdown = async () => {
  await stopSlack();
  await pool.end();
  process.exit(0);
};
```

- [ ] **Step 2: Verify typecheck**

```bash
cd apps/api && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/server.ts
git commit -m "feat: wire Slack integration into API server lifecycle"
git push
```

---

### Task 6: Update Slack App Manifest

**Files:**
- Modify: `infra/evee/slack-manifest.yml`

- [ ] **Step 1: Enable Socket Mode and add event subscriptions**

Change `socket_mode_enabled: false` to `socket_mode_enabled: true`.

Add event subscriptions section after `settings:`:

```yaml
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.im
      - assistant_thread_started
      - assistant_thread_context_changed
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

- [ ] **Step 2: Commit**

```bash
git add infra/evee/slack-manifest.yml
git commit -m "feat: enable Socket Mode and event subscriptions in Evee manifest"
git push
```

---

### Task 7: Update Import Boundaries

**Files:**
- Modify: `scripts/check-boundaries.ts`

- [ ] **Step 1: Check if integrations/slack needs boundary rules**

The existing boundary rules allow `integrations/` to import `@repo/shared` and own files. The Slack integration imports from `../../env` and `openai` and `@slack/bolt`, which are external deps.

Check `scripts/check-boundaries.ts` to see if `integrations/` boundary rules need updating to allow `openai` and `@slack/bolt` imports.

- [ ] **Step 2: Add allowed imports if needed**

If the boundary checker restricts external imports for `integrations/`, add `@slack/bolt` and `openai` to the allowed list.

- [ ] **Step 3: Run boundary check**

```bash
bun run check:boundaries
```
Expected: PASS

- [ ] **Step 4: Commit (if changes needed)**

```bash
git add scripts/check-boundaries.ts
git commit -m "chore: update import boundaries for Slack integration"
git push
```

---

### Task 8: E2E Test - Manual Verification

- [ ] **Step 1: Generate the app-level token in Slack (prerequisite)**

Go to api.slack.com/apps > Evee > Basic Information > App-Level Tokens. Create token with `connections:write`. Save to 1Password as `slack_app_token` field.

- [ ] **Step 2: Enable Socket Mode in Slack app settings**

Toggle Socket Mode ON in the Slack app dashboard.

- [ ] **Step 3: Add event subscriptions in Slack app settings**

Subscribe to `app_mention`, `message.im`, `assistant_thread_started`, `assistant_thread_context_changed` bot events.

- [ ] **Step 4: Start the API with secrets**

```bash
cd apps/api && op run --env-file=.env.op -- bun run dev
```

Or via Tilt if env injection is configured.

- [ ] **Step 5: Verify Socket Mode connects**

Look for log: `Slack (Evee) connected via Socket Mode`

- [ ] **Step 6: DM Evee in Slack**

Open a DM with Evee. Send "Hello!". Verify:
- Shimmer/loading status appears ("Evee is thinking...")
- Loading messages rotate
- Evee replies with an OpenRouter-generated response

- [ ] **Step 7: @Evee in a channel**

In any channel Evee is in, type `@Evee what's up?`. Verify:
- Evee replies in a thread
- Response is from OpenRouter

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/package.json` | Modify | Add @slack/bolt, openai deps |
| `apps/api/src/env.ts` | Modify | Add SLACK_BOT_TOKEN, SLACK_APP_TOKEN, OPENROUTER_API_KEY |
| `apps/api/src/integrations/slack/constants.ts` | Create | Loading messages array |
| `apps/api/src/integrations/slack/openrouter.ts` | Create | OpenRouter chat completion wrapper |
| `apps/api/src/integrations/slack/assistant.ts` | Create | Bolt Assistant class (DM thread handler) |
| `apps/api/src/integrations/slack/index.ts` | Create | Socket Mode app, app_mention handler, lifecycle |
| `apps/api/src/__tests__/integrations/openrouter.test.ts` | Create | Unit test for OpenRouter client |
| `apps/api/src/server.ts` | Modify | Wire initSlack/stopSlack into lifecycle |
| `infra/evee/slack-manifest.yml` | Modify | Enable Socket Mode, add event subscriptions |
| `scripts/check-boundaries.ts` | Modify (maybe) | Allow new external deps in integrations |
