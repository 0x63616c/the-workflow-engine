# Welcome to The Workflow Engine

## How We Use Claude

Based on Calum's usage over the last 30 days:

Work Type Breakdown:
```
  Build Feature   ████████░░░░░░░░░░░░  40%
  Plan & Design   ████████░░░░░░░░░░░░  40%
  Improve Quality ██░░░░░░░░░░░░░░░░░░  12%
  Debug & Fix     █░░░░░░░░░░░░░░░░░░░   4%
```

Top Skills & Commands:
```
  /clear              ██████████░░░░░░░░░░  10x/month
  /caveman:caveman    ██████████░░░░░░░░░░  10x/month
  /plugin             █████░░░░░░░░░░░░░░░   5x/month
  /caveman:compress   ██░░░░░░░░░░░░░░░░░░   2x/month
  /auto-pilot         █░░░░░░░░░░░░░░░░░░░   1x/month
```

Top MCP Servers:
```
  computer-use   ████████████████░░░░  16 calls
```

## Your Setup Checklist

### Codebases
- [ ] the-workflow-engine — https://github.com/0x63616c/the-workflow-engine

### MCP Servers to Activate
- [ ] computer-use — Visual testing and browser interaction for the iPad PWA UI. Ask Calum for the setup command or check `.claude/settings.json` in the repo.

### Skills to Know About
- `/caveman:caveman` — Compressed communication mode. Team convention: every session starts with this. Cuts token usage ~75% while keeping technical accuracy.
- `/caveman:compress` — Compresses memory/config files into caveman format to save input tokens. Used for CLAUDE.md and similar files.
- `/auto-pilot` — Full autonomous build pipeline: spec, plan, implement (TDD), review, E2E verify, PR. Only triggers on explicit `/auto-pilot` invocation.
- `/clear` — Resets conversation context. Used frequently between tasks to keep context clean.
- `/plugin` — Manages Claude Code plugins.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
