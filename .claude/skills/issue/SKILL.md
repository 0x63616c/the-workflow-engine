---
name: issue
description: >
  Create a GitHub issue to track work for later. Minimal, no fluff, just facts.
  Use when user says "remember to do this later", "create an issue", "create a ticket",
  "save this to GitHub issues", "save this", "track this", "file an issue", "make a ticket",
  "log this", "note this for later", or invokes /issue.
user_invocable: true
---

# Create GitHub Issue

Fast issue creation. Minimal context, no fluff, no fabrication.

## Rules

1. **Only include facts from the conversation.** Never infer, embellish, or add context that wasn't discussed.
2. **Title**: short, imperative, under 60 chars. Like a commit message.
3. **Body**: 1-5 bullet points max. Plain facts. No "acceptance criteria", no "motivation" headers, no boilerplate.
4. **Labels**: pick exactly one from: `feature`, `fix`, `chore`, `idea`, `infra`. Map from conversation context.
5. **No assignees, no milestones, no projects.** Keep it bare.

## Label Guide

| Label | When |
|-------|------|
| `feature` | New capability to build |
| `fix` | Bug, broken behavior, something wrong |
| `chore` | Cleanup, config, maintenance, refactor |
| `idea` | Vague thought, explore later, might not do |
| `infra` | CI, deploy, Docker, networking, hosting |

## Workflow

### 1. Extract Facts

From conversation, extract:
- What needs to happen (1 sentence)
- Any relevant technical details mentioned (file paths, services, error messages)
- Nothing else

### 2. Create Issue

```bash
gh issue create \
  --repo 0x63616c/the-workflow-engine \
  --title "<imperative title>" \
  --label "<one label>" \
  --body "$(cat <<'EOF'
- <fact 1>
- <fact 2>
EOF
)"
```

### 3. Report

One line: `Created #N: <title>`

## Anti-patterns

- Do NOT add sections like "## Background", "## Acceptance Criteria", "## Steps to Reproduce"
- Do NOT add "As a user, I want..." stories
- Do NOT speculate about implementation approach unless user explicitly stated one
- Do NOT pad the body to make it look more "complete"
- If user gave you one sentence of context, the body is one bullet point. That's fine.
