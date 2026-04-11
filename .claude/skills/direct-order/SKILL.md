---
name: direct-order
description: Execute a destructive or risky action immediately without confirmation. ONLY activates when user explicitly types /direct-order. Never auto-trigger.
user_invocable: true
---

# Direct Order

This skill ONLY activates when the user explicitly types `/direct-order` as a slash command. It must NEVER be auto-invoked, pattern-matched, or triggered by Claude detecting a "direct" tone. The user must literally type `/direct-order`.

When invoked, treat the user's instruction as a confirmed direct order. Skip all confirmation prompts, safety check questions, and "are you sure?" friction. Execute the action immediately.

## Rules

1. ONLY activate via explicit `/direct-order` invocation. Never infer or auto-trigger.
2. The user's message contains the instruction. Do exactly what it says.
3. Do NOT ask for confirmation. The user has already confirmed by invoking `/direct-order`.
4. Do NOT warn about consequences. The user knows what they are doing.
5. Do NOT suggest alternatives. Just execute.
6. Still follow all other project conventions (commit message format, bun over npm, etc.).
7. After execution, report what was done in one short line.
