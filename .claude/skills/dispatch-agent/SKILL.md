---
name: dispatch-agent
description: Use when dispatching any agent that will write code, implement features, or run git commands - enforces worktree isolation, sonnet model, and port isolation to prevent agents from corrupting each other's work
---

# Dispatch Agent

## Overview

Safe defaults for spawning code-writing agents. Every agent gets its own git worktree, uses sonnet, and gets an isolated port set so multiple agents can run dev stacks simultaneously without conflict.

**Core principle:** Agents sharing a repo directory will destroy each other's work. Always isolate.

## Required Parameters

Every `Agent()` call that writes code MUST include:

```
Agent({
  description: "<3-5 words>",
  model: "sonnet",
  isolation: "worktree",
  run_in_background: true,
  prompt: "..."
})
```

Missing any of these causes real problems:
- No `isolation: "worktree"` = agents share directory, fight over branches, corrupt working tree
- No `model: "sonnet"` = wastes money on opus for routine implementation
- No `run_in_background` = blocks the coordinator

## Port Isolation

Each agent needs its own dev stack ports. Assign in offsets of 10:

| Stack | API_PORT | INNGEST_PORT | UI_PORT | TILT_PORT | DB_PATH |
|-------|----------|--------------|---------|-----------|---------|
| Main | 3001 | 8288 | 5173 | 10350 | ./data/workflow.db |
| Agent 1 | 3011 | 8298 | 5183 | 10360 | ./data/workflow-a1.db |
| Agent 2 | 3021 | 8308 | 5193 | 10370 | ./data/workflow-a2.db |
| Agent 3 | 3031 | 8318 | 5203 | 10380 | ./data/workflow-a3.db |

Include in every agent prompt:
```
API_PORT=30X1 INNGEST_PORT=82X8 UI_PORT=51X3 DB_PATH=./data/workflow-aX.db tilt up --port 103X0
```

## Agent Prompt Checklist

- [ ] Specific feature scope (what to build)
- [ ] Off-limits areas (other agents' domains)
- [ ] Port assignment with full env var line
- [ ] `bun/bunx` only, never `npm/npx`
- [ ] Conventional commits, push after every commit
- [ ] Create feature branch from main (branch protection)
- [ ] Create PR via `gh pr create` when done
- [ ] NEVER read .env or secret files
- [ ] Verification instructions (see below)

## Template

```
Agent({
  description: "<feature name>",
  model: "sonnet",
  isolation: "worktree",
  run_in_background: true,
  prompt: `You are working on a TypeScript workflow engine (Bun, Hono, Inngest, Vite+React, SQLite/Drizzle).

## Your isolated dev stack
API_PORT=30X1 INNGEST_PORT=82X8 UI_PORT=51X3 DB_PATH=./data/workflow-aX.db tilt up --port 103X0

## Task
<what to build>

## Off-limits
<files other agents own>

## Rules
- bun/bunx only, never npm/npx
- Conventional commits, push after every commit
- Create feature branch from main
- Create PR with gh pr create when done
- NEVER read .env or secret files
- Test: bun test, bunx tsc --noEmit, bunx biome check .
- Generate migrations if schema changes: bunx drizzle-kit generate
- After creating PR: run gh pr checks <number> --watch and fix any failures before reporting done
`
})
```

## Verification & Screenshots

Every agent MUST verify its work before creating the PR. Include this in every prompt:

```
## Verification
Before creating the PR, you must prove your work:

**If UI changes:**
- Start your dev stack
- Use `agent-browser` to navigate each affected page
- Take screenshots: `agent-browser screenshot docs/screenshots/<branch>_<page>_<state>.png`
  e.g. `docs/screenshots/feat-log-streaming_run-detail_step-running.png`
- Include screenshots in PR description using ABSOLUTE URLs (relative paths don't render on GitHub)
  Format: `![desc](https://raw.githubusercontent.com/0x63616c/nebula/<branch>/docs/screenshots/<file>.png)`
- NEVER steal focus or take full-screen screenshots

**If backend-only changes:**
- Start your dev stack
- curl the affected API endpoints and include output in PR description
- Run a full e2e flow (create run, check status, verify behavior)
- Include curl commands and responses as proof

**Always:**
- `bun test` must pass
- `bunx tsc --noEmit` must pass
- `bunx biome check .` must pass (linting)
- Show evidence, not just "it works"

**After creating the PR:**
- Wait for CI checks to complete: `gh pr checks <PR_NUMBER> --watch`
- If any check fails, fix the issue, push, and wait again
- Do NOT report done until all CI checks are green
- Include CI status in your final report
```

## Shutdown

```
SendMessage({ to: "<agent-id>", summary: "shutdown", message: { type: "shutdown_request", reason: "stopping" } })
```

## Merge Order Matters

When running parallel agents that touch overlapping files (schema, routes, types), merge them sequentially and rebase later PRs onto main after each merge. Merging all at once causes conflicts.

**Recommended merge order:**
1. Infrastructure/tooling PRs first (pre-commit hooks, CI fixes)
2. Backend PRs next (schema changes, API, executor)
3. UI PRs last (they depend on backend types/APIs)

After merging one, dispatch a rebase agent for the next:
```
Agent({
  description: "Rebase PR #N onto main",
  model: "sonnet",
  isolation: "worktree",
  prompt: "Rebase branch X onto origin/main, resolve conflicts, push --force-with-lease, confirm CI green"
})
```

## Biome Lint

Always run `bunx biome check src/` (not `.`). Running on `.` will scan agent worktree directories that have their own biome.json and fail.

## Common Mistakes

| Mistake | Consequence |
|---------|-------------|
| No worktree | Agents share directory, switch branches under each other |
| No port isolation | tilt up fails, agents can't test |
| Too broad scope | Agents edit same files, merge conflicts |
| Not pushing often | Work lost if agent killed |
| Long polling loops | Blocks conversation, wastes context (max 60s) |
| Merging parallel PRs at once | Merge conflicts on later PRs |
| `biome check .` instead of `src/` | Fails on nested worktree configs |
| Relative image paths in PR body | Screenshots don't render on GitHub |
| Not waiting for CI after PR | Lint failures go unnoticed |
| PR targets wrong branch | CI doesn't trigger if workflow filters by branch |
