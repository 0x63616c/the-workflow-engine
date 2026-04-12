---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

Git worktrees create isolated workspaces sharing same repo, work on multiple branches simultaneously without switching.

**Core principle:** Consistent naming + safety verification = reliable isolation.

## Naming Convention

**Always use this format:**

```
Directory: .claude/worktrees/{type}/{description}
Branch:    {type}/{description}
```

- **type**: conventional commit prefix — `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`
- **description**: kebab-case, concise
- Branch name matches folder name exactly. No `worktree-` prefix. No `+` separator.

**Examples:**
```bash
git worktree add .claude/worktrees/feat/slack-notifications -b feat/slack-notifications
git worktree add .claude/worktrees/fix/auth-token-expiry -b fix/auth-token-expiry
git worktree add .claude/worktrees/chore/update-dependencies -b chore/update-dependencies
git worktree add .claude/worktrees/ci/add-lint-step -b ci/add-lint-step
```

## Directory

**Always use `.claude/worktrees/`** — already in `.gitignore`, no verification needed.

Never use `.worktrees/` or `worktrees/` — those are legacy locations.

## Creation Steps

### 1. Determine Type + Description

Pick type from: `feat` `fix` `chore` `docs` `refactor` `test` `ci` `perf`

Make description kebab-case and concise.

### 2. Create Worktree

```bash
git worktree add .claude/worktrees/{type}/{description} -b {type}/{description}
```

### 3. Run Project Setup

Auto-detect and run:

```bash
if [ -f package.json ]; then bun install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi
if [ -f go.mod ]; then go mod download; fi
```

### 4. Verify Clean Baseline

Run tests. Tests fail: report, ask whether to proceed. Tests pass: report ready.

### 5. Report Location

```
Worktree ready at .claude/worktrees/{type}/{description}
Branch: {type}/{description}
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| New worktree | `.claude/worktrees/{type}/{description}` |
| Branch name | `{type}/{description}` (matches folder, no prefix) |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `worktree-` prefix on branch | Drop prefix, use `{type}/{description}` |
| `+` separator in name | Use `/` separator: `{type}/{description}` |
| Using `.worktrees/` dir | Use `.claude/worktrees/` |
| Flat name without type | Always include type prefix |
| Proceed with failing tests | Report failures, get explicit permission |

## Red Flags

**Never:**
- Use `.worktrees/` or `worktrees/` (legacy, non-standard)
- Use `worktree-` prefix on branch names
- Use `+` as separator (legacy style)
- Skip baseline test verification
- Proceed with failing tests without asking

**Always:**
- Use `.claude/worktrees/{type}/{description}` for dir
- Branch name = folder path: `{type}/{description}`
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

**Called by:**
- **brainstorming** (Phase 4) - REQUIRED when design approved and implementation follows
- **subagent-driven-development** - REQUIRED before executing tasks
- **executing-plans** - REQUIRED before executing tasks

**Pairs with:**
- **finishing-a-development-branch** - REQUIRED for cleanup after work complete
