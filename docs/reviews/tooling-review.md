# Skills, Workflows & Tooling Review

**Date:** 2026-04-12
**Reviewer:** Audit agent (full-project-audit team)

---

## 1. Skills Inventory

### Core Quality Assessment

| Skill | Purpose | Quality | Recommendation |
|---|---|---|---|
| `auto-pilot` | End-to-end autonomous build pipeline (spec → plan → TDD → review → E2E → PR) | Excellent — detailed, well-structured phase gates, prompt templates included | Keep. Flagship skill. |
| `brainstorming` | Pre-implementation design alignment, one question at a time, visual companion option | Excellent — hard-gate prevents premature coding, explicit design approval required | Keep. |
| `subagent-driven-development` | Execute plans via fresh subagents, two-stage review per task | Excellent — clear process, good model selection guidance | Keep. |
| `dispatching-parallel-agents` | Fan-out independent tasks to parallel agents | Good — clear when/when-not-to-use, focused prompt guidance | Keep. |
| `dispatch-agent` | Safe defaults for spawning code-writing agents (worktree, sonnet, port isolation) | Good — port table is outdated (references old ports 3001/5173/8288 instead of project ports 4200/4201/8288) | Fix port table. |
| `writing-plans` | Produce implementation plans with TDD steps, no placeholders | Excellent — strict anti-placeholder rules, self-review checklist | Keep. |
| `executing-plans` | Execute a written plan step-by-step in session | Good — defers to subagent-driven-development when available | Keep. |
| `test-driven-development` | TDD iron law, red-green-refactor | Excellent — includes iron law, common rationalizations, delete-code-first rule | Keep. |
| `systematic-debugging` | Root cause before fixes, four phases | Excellent — has Calum's own signal phrases as stop conditions | Keep. |
| `verification-before-completion` | Evidence before success claims | Excellent — gate function is explicit and non-negotiable | Keep. |
| `finishing-a-development-branch` | Present structured merge/PR/discard options after work done | Good — clean 4-option flow, worktree cleanup handled | Keep. |
| `using-git-worktrees` | Standardised worktree creation with naming convention | Good — naming convention well-defined, but legacy `+` naming still widely present in repo | Keep. Convention drift documented below. |
| `requesting-code-review` | Dispatch code-reviewer subagent after tasks | Good — clear when-to-request table | Keep. |
| `receiving-code-review` | Evaluate review feedback technically, not performatively | Excellent — forbidden responses list, push-back guidance | Keep. |
| `small-change` | Fast-path: worktree → commit → PR → merge → cleanup | Good — one-shot workflow for trivial changes | Keep. |
| `triaging-work` | Triage multiple tasks into issues + parallel agents | Good — clear anti-patterns, when-not-to-use | Keep. |
| `issue` | Create minimal GitHub issues | Good — strict anti-padding rules | Keep. |
| `searching-conversations` | Search past JSONL conversation logs | Good — covers storage layout, jq extraction patterns | Keep. |
| `writing-skills` | Create and test new skills | Good — references Anthropic best practices | Keep. |
| `frontend` | Context for apps/web stack and patterns | Good — accurate stack summary, commands, rules | Needs one update (see below). |
| `api` | Context for apps/api stack and patterns | Good — accurate, covers boundaries and testing | Keep. |
| `direct-order` | Skip confirmation on risky actions when explicitly invoked | Minimal — just a trigger rule | Keep as-is. |

### Issues Found

**`dispatch-agent` SKILL.md — port table is wrong:**
The port table references `3001/5173/8288` (an older layout). The project's actual base ports are `4200/4201/8288` (web/api/inngest). This will cause agents to use wrong ports and fail to start dev stacks.

**`frontend` SKILL.md — references `@repo/api/trpc` workspace import:**
Line 48 says `API type from '@repo/api/trpc' (workspace import)`. There is no `@repo/api` workspace package in this monorepo. The correct pattern is importing `AppRouter` from the api package type re-export. Needs verification and correction.

**`auto-pilot` SKILL.md — worktree path is wrong:**
Phase 0 uses `.worktrees/$BRANCH` not `.claude/worktrees/`. This contradicts the convention enforced everywhere else and would put worktrees outside `.gitignore` coverage.

**`subagent-driven-development` SKILL.md — references `superpowers:` prefix:**
Multiple references to `superpowers:using-git-worktrees`, `superpowers:writing-plans`, etc. These are legacy prefixes. Skills are now invoked without the `superpowers:` namespace. Low urgency (doesn't break anything), but creates confusion.

**No iOS/Capacitor skill:**
The iOS native shell is a significant part of the project (Fastlane, TestFlight, KioskViewController bug). There is no skill capturing how to build, sign, test, or debug the iOS app. Every iOS session starts from scratch.

**No Inngest skill:**
Inngest is a core dependency for background work, but there's no skill capturing the local setup, event patterns, function conventions, or testing approach. Agents have to rediscover this each session.

---

## 2. Settings & Hooks Assessment

Current hooks in `.claude/settings.json`:

```
PreToolUse[Bash]: blocks git checkout -b, git switch -c, force push, and main-branch push/reset/merge
PreToolUse[Edit]: blocks edits on main branch
PreToolUse[Write]: blocks writes on main branch
```

### What Works Well

- Main branch protection is solid. Push, hard-reset, and merge on main are all blocked.
- Branch creation via `git checkout -b` and `git switch -c` is blocked, enforcing worktree usage.
- Both Edit and Write tools are blocked on main, not just Bash. This catches file modifications via any tool path.

### Gaps and Recommendations

**Missing: Block `git add -A` and `git add .` on main**
The hooks block push but not staging. An agent could accidentally `git add .` on main before realising. Low risk given Edit/Write blocks, but worth adding.

**Missing: PostToolUse hook for auto-push after commit**
CLAUDE.md says "commit often... ALWAYS push after every commit." There is no enforcement. Agents frequently commit without pushing, causing lost context when sessions die. A PostToolUse hook on Bash that detects `git commit` and auto-runs `git push` would enforce this.

**Missing: Deny list for secret files**
`.claude/settings.json` has no `permissions.deny` rules. CLAUDE.md says to add deny rules for `.env`, `*.pem`, `*.key`, etc. This should be enforced at the settings level, not just as a text instruction.

**Missing: SwiftFormat auto-fix hook**
Pre-commit runs SwiftFormat (via Lefthook), but there's no hook in settings.json that runs it before Swift file edits are staged. Agents writing Swift code often trigger pre-commit failures because Lefthook catches format issues after-the-fact.

**Suggested additions:**

```json
"permissions": {
  "deny": [
    "Read(.env)",
    "Read(.env.*)",
    "Read(.kamal/secrets)",
    "Read(**/*.pem)",
    "Read(**/*.key)"
  ]
}
```

---

## 3. CLAUDE.md Quality Assessment

### What's Well Done

- Tech stack is comprehensive and current.
- Import boundaries are explicitly documented with a table.
- Port isolation via `PORT_OFFSET` is documented.
- Deployment section accurately describes Kamal + 1Password secrets flow.
- Pre-commit hooks section gives agents a clear picture of what runs.
- The GHRC_TOKEN intentional naming note prevents false "fixes".
- Worktree naming convention is clearly specified.

### Issues Found

**Worktree convention inconsistency — live in the repo:**
The CLAUDE.md specifies `{type}/{description}` with `/` separator. The git worktree list shows dozens of legacy worktrees using `+` separator (e.g., `feat+globe-improvements`, `worktree-feat+ensure-accessories`). CLAUDE.md is correct, but the historical evidence creates confusion for agents reading `git worktree list`. A cleanup note or `git worktree prune` would help.

**`/caveman:caveman` first-action rule is prominent but risky:**
The instruction "MUST invoke `/caveman:caveman` as your very first action" before reading files or planning creates a session-start race condition. If an agent receives an urgent task and immediately enters caveman mode, responses become compressed before the agent has context. Consider removing or relaxing this to "invoke if session will be long" rather than "before ANYTHING else."

**`bun run check:boundaries` not in pre-commit hook docs:**
The CLAUDE.md mentions `bun run check:boundaries` as a root command but the pre-commit hooks section doesn't list it. The Lefthook config runs it, but CLAUDE.md's hooks section is incomplete.

**"New features = plugins registering w/ core systems" is vague:**
The Key Conventions section says new features should register with core systems (Notification System, Theme Engine, Integration Hub, Scene/Layout System). But there's no reference to where those plugin APIs are documented or what registering looks like in code. Agents following this instruction have nothing concrete to work from.

**Missing: How to run the iOS app locally**
There's no section covering how to open the Xcode project, run in simulator, or interact with the Capacitor shell. Given the active iOS debugging work, this gap causes repeated context loss.

**Missing: Auto-pilot docs folder convention**
`docs/auto-pilot/` is where specs and plans land when using the auto-pilot skill. CLAUDE.md doesn't mention this, so agents creating specs manually use different paths.

**`docs/superpowers/` vs `docs/auto-pilot/` inconsistency:**
`writing-plans` says save to `docs/superpowers/plans/`. `auto-pilot` says `docs/auto-pilot/plans/`. `brainstorming` says `docs/superpowers/specs/`. These should be unified.

---

## 4. Memory System Health

### Well-Organised Memories

- Worktree convention and rationale captured.
- PR merge rules (rebase-only, never squash) captured.
- 1Password vault name captured.
- GitLab/GitHub confusion captured.
- GHRC_TOKEN naming captured.
- Capacitor iOS state captured (including active black screen bug).
- Tailscale hostnames captured.
- Agent planning feedback captured.

### Stale / Potentially Stale Memories

**`project_tech_stack.md`** says WebSocket subscriptions. CLAUDE.md says SSE (`splitLink`). The tech stack memory should say SSE not WebSocket — this is the current state.

**`project_capacitor_ios.md`** notes `capacitor.config.ts` has `localhost:8765` and "needs reverting to `http://homelab`". Git status shows `capacitor.config.ts` is still modified. This is a live issue but the memory frames it as a known TODO rather than a blocker. The memory should flag it more clearly.

**`project_deployment.md`** — mentions WS port `(EFFECTIVE_PORT + 1)`. CLAUDE.md and the API skill don't mention a separate WS port (SSE over HTTP is the current approach). May be stale.

### Missing Memories

- No memory of the current iOS black screen root cause investigation and where it stands.
- No memory of the `docs/auto-pilot/` vs `docs/superpowers/` path inconsistency.
- No memory of which worktrees are actively in use vs abandoned.

---

## 5. Agent Workflow Friction Points

### Worktree Accumulation

There are 28 active registered worktrees (`git worktree list` count). Most appear to be abandoned (branches never merged). This creates real problems:
- `git worktree list` output is noisy, making it hard to tell what's active.
- Each old worktree is a `bun install` away from corrupting `node_modules` links.
- Agents reading `git worktree list` output get confused by legacy `+`-separator branch names.

**Recommendation:** Run `git worktree prune` and clean up branches that have been merged or are clearly abandoned. Create a skill or script that lists worktrees with their age and branch status.

### Naming Convention Drift

The convention is `{type}/{description}` with `/`, but the majority of existing worktrees use `+`. The `using-git-worktrees` skill clearly states the current standard but doesn't explain the legacy pattern. New agents reading `git worktree list` see mostly `+`-named worktrees and may copy the wrong pattern.

**Recommendation:** Add a "Legacy naming" note to `using-git-worktrees` SKILL.md explaining that `+` names are old and should not be copied.

### Skill Discovery is Good but Dense

There are 25+ skills. The skill descriptions in settings are used for trigger matching, but with so many skills, it's easy for the wrong skill to fire (e.g., `dispatching-parallel-agents` might trigger when `triaging-work` is more appropriate). No obvious fix here — the current approach of explicit trigger conditions in each skill is the right one.

### No Worktree Health Script

There's no script to:
- List worktrees with age + branch status (merged? stale?)
- Identify worktrees with uncommitted changes
- Prune merged branches from worktree list

This is pure manual overhead that could be scripted.

### `auto-pilot` Pipeline is Powerful but Untested for This Stack

The auto-pilot skill's agent prompts reference generic patterns (Cargo, Python, Go) alongside TypeScript. The E2E verifier section is good. But the port table in `dispatch-agent` being wrong (4200/4201 vs 3001/5173) means auto-pilot-spawned agents would fail to start dev stacks.

### No "Resume Worktree" Pattern

When Calum returns to an abandoned worktree (e.g., the iOS debugging branch), there's no documented pattern for an agent to safely pick up that work. The `using-git-worktrees` skill covers creation but not resumption. Agents entering an existing worktree must discover its state manually.

---

## 6. Missing Skills & Tools

### High Value — Recommend Building

**`ios-build` skill**
What it should do: Document the full iOS workflow — opening Xcode project, building in simulator, running Fastlane locally, debugging Capacitor bridge issues, checking device logs. Include the KioskViewController resolution steps. Would save 30+ minutes of context reconstruction each iOS session.

**`worktree-health` script (`scripts/worktree-health.sh` or `bun` script)**
What it should do: List all worktrees with: path, branch name, age of last commit, whether branch is merged into main, whether there are uncommitted changes. Output as table. Helps identify and clean up abandoned worktrees.

**`db-query` skill or alias**
What it should do: Document how to inspect the SQLite database in dev (Drizzle Studio or direct SQLite CLI), including where the DB file lives (`data/workflow.db` in dev), how to run queries, and how to reset the DB for testing. Agents frequently need to inspect DB state and have to rediscover this.

### Medium Value — Worth Considering

**`inngest-patterns` skill**
What it should do: Capture Inngest function patterns for this stack — event naming convention, step patterns, error handling, how to trigger events in tests, how to inspect the Inngest dev dashboard. Currently undocumented for agents.

**`tilt-usage` skill**
What it should do: Tilt commands, service dependency order, how port isolation works with `PORT_OFFSET`, how to run individual services without full Tilt. Agents frequently use Tilt wrong or bypass it.

**`ha-integration` skill**
What it should do: Home Assistant REST API patterns used in this codebase, how to test HA calls locally (mock vs. real), where to find the HA token, socat proxy setup for Docker containers.

### Lower Priority

**`capacitor-debugging` skill**
The handover doc at `docs/handover-capacitor-debugging.md` already exists. Convert it into a skill that agents can invoke when working on the iOS shell. Would be a near-zero-effort conversion.

---

## 7. Specific Improvements to Implement

Listed by priority:

**P0 — Breaks agent workflows:**
1. Fix port table in `dispatch-agent/SKILL.md` (3001→4201, 5173→4200)
2. Fix worktree path in `auto-pilot/SKILL.md` (`.worktrees/` → `.claude/worktrees/`)
3. Add `permissions.deny` for secret files to `.claude/settings.json`

**P1 — Causes repeated confusion or session loss:**
4. Add "Legacy naming" note to `using-git-worktrees/SKILL.md`
5. Unify spec/plan save paths: decide `docs/auto-pilot/` or `docs/superpowers/`, update all skills
6. Fix stale WebSocket reference in `project_tech_stack.md` memory (should say SSE)
7. Add iOS build/debug section to CLAUDE.md
8. Fix `frontend/SKILL.md` `@repo/api/trpc` reference (verify correct import pattern)

**P2 — Quality improvements:**
9. Create `scripts/worktree-health.sh` to list worktrees with age/merge status
10. Build `ios-build` skill from `docs/handover-capacitor-debugging.md`
11. Add PostToolUse auto-push hook for commits
12. Add Inngest patterns to `api/SKILL.md` or new skill
13. Clarify "plugins registering w/ core systems" in CLAUDE.md with concrete examples or file pointers
14. Remove or relax the "caveman first" instruction — it creates a jarring session start and serves style preference over accuracy

**P3 — Nice to have:**
15. Run `git worktree prune` and archive/delete the 20+ stale worktrees
16. Add `superpowers:` → plain name migration note to skills that reference old prefix
