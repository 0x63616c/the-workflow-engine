---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

Git worktrees create isolated workspaces sharing same repo, work on multiple branches simultaneously without switching.

**Core principle:** Systematic dir selection + safety verification = reliable isolation.

## Directory Selection

Priority order:

### 1. Check Existing Dirs

```bash
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

Found: use it. Both exist: `.worktrees` wins.

### 2. Check CLAUDE.md

```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

Preference found: use it, no asking.

### 3. Ask User

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
```

## Safety Verification

### Project-Local Dirs (.worktrees or worktrees)

**MUST verify dir is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**If NOT ignored:** Add to .gitignore, commit, proceed.

### Global Dir (~/.config/superpowers/worktrees)

No .gitignore verification needed - outside project.

## Creation Steps

### 1. Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree

```bash
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup

Auto-detect and run:

```bash
if [ -f package.json ]; then npm install; fi
if [ -f Cargo.toml ]; then cargo build; fi
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi
if [ -f go.mod ]; then go mod download; fi
```

### 4. Verify Clean Baseline

Run tests. Tests fail: report, ask whether to proceed. Tests pass: report ready.

### 5. Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check CLAUDE.md -> Ask user |
| Dir not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skip ignore verification | Always `git check-ignore` before project-local worktree |
| Assume dir location | Follow priority: existing > CLAUDE.md > ask |
| Proceed with failing tests | Report failures, get explicit permission |
| Hardcode setup commands | Auto-detect from project files |

## Red Flags

**Never:**
- Create worktree without verifying ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume dir location when ambiguous

**Always:**
- Follow dir priority: existing > CLAUDE.md > ask
- Verify ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

**Called by:**
- **brainstorming** (Phase 4) - REQUIRED when design approved and implementation follows
- **subagent-driven-development** - REQUIRED before executing tasks
- **executing-plans** - REQUIRED before executing tasks

**Pairs with:**
- **finishing-a-development-branch** - REQUIRED for cleanup after work complete
