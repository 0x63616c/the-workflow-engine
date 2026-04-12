---
name: triaging-work
description: >
  Triage a mixed bag of tasks into GitHub issues, dispatch parallel agents in worktrees,
  collect PRs, report summary. Use when user dumps multiple things to do ("go fix X, Y, Z",
  "clean this up", "here's a list"), or invokes /triaging-work.
user_invocable: true
---

# Triaging Work

Take a loose pile of tasks, organize into issues, fan out agents, collect PRs. User says what needs doing, you handle the rest.

## When to Use

- User gives 2+ tasks in one message ("do X, also Y, and fix Z")
- Mixed bag of work (docs, config, features, fixes)
- Tasks are independent enough for parallel agents
- User says "go do this", "clean this up", "handle these"

## When NOT to Use

- Single focused task (just do it directly)
- Tasks with tight dependencies (use `executing-plans` instead)
- Exploratory work where scope is unclear (use `brainstorming` first)

## Workflow

### 1. Assess Current State

Read relevant files, check git status, understand what exists. Do not ask user to explain what you can discover yourself.

### 2. Organize into Work Items

For each distinct task:
- Identify scope and type (feat, fix, chore, docs, refactor)
- Note dependencies between tasks (if any)
- Decide: issue + agent, or do directly (trivial stuff like saving memories)

**Do trivial tasks immediately** (memory saves, small config edits on main). Only file issues for work that needs a branch/PR.

### 3. File GitHub Issues

One issue per work item. Use the `issue` skill conventions:
- Title: short, imperative, under 60 chars
- Body: bullet points, facts only
- Label: one of feature, fix, chore, idea, infra

File all issues in parallel (multiple `gh issue create` in one message).

### 4. Dispatch Agents

One agent per issue (or group related issues into one agent). All agents run in parallel using `Agent` tool with:
- `isolation: "worktree"` for code changes
- `model: "sonnet"` for cost efficiency
- `run_in_background: true`
- Clear, self-contained prompts (agent has no conversation context)

**Agent prompt must include:**
- What to do and why
- Issue number(s) to close
- File paths and current state if relevant
- Worktree naming convention: `{type}/{description}`
- Reminders: `bun` not `npm`, push after commit, PR must link issues

### 5. Track and Report

As agents complete:
- Update tasks to completed
- Note PR URLs

When all done, report summary table:

```
| Task | Issue | PR | Status |
|------|-------|----|--------|
| ... | #N | #N | Done |
```

## Rules

- **Never ask "should I do X?"** for obvious work. Just do it.
- **Always file issues first** for traceability (unless task is trivial)
- **Always use worktree isolation** for agents that write code
- **Always link PRs to issues** with `Closes #N`
- **Report when done**, not during. User said "go do it", respect that.
- **Group related work** into one agent if they touch same files
- **Keep agents focused** - one domain per agent, clear scope

## Anti-patterns

- Filing issues for trivial tasks (memory saves, one-line config edits)
- Dispatching agents sequentially when they could run in parallel
- Asking user to confirm each step
- Agents with vague prompts ("fix the issues")
- Forgetting to push or link issues in PRs
