---
name: small-change
description: Fast workflow for small, self-contained changes. Worktree, commit, PR, merge, back to main. Use when change is trivial and doesn't need review.
user_invocable: true
---

# Small Change

Fast-path for trivial changes that don't need review cycles. One-shot: worktree, edit, commit, PR, merge, cleanup.

## When to Use

- Config changes, gitignore updates, small scripts, typo fixes, dependency bumps
- Single-commit changes that are obviously correct
- User explicitly invokes `/small-change`

## When NOT to Use

- Multi-file features, architectural changes, anything needing review
- Changes that affect runtime behavior and need testing beyond pre-commit hooks

## Workflow

Execute these steps sequentially. Do not ask for confirmation between steps.

### 1. Enter Worktree

```
EnterWorktree({ name: "<descriptive-kebab-name>" })
```

### 2. Make Changes

Apply the requested edits in the worktree.

### 3. Commit and Push

- Stage only relevant files (no `git add -A`)
- Conventional commit message
- Push with `-u` to set upstream

### 4. Create PR

```
gh pr create --title "<conventional commit style>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>
EOF
)"
```

Keep PR description minimal. No test plan section needed for trivial changes.

### 5. Merge

```
gh pr merge <number> --rebase --delete-branch
```

If merge fails due to worktree conflicts with local `main`, that's fine. The remote merge succeeds. Continue to cleanup.

### 6. Cleanup

```
ExitWorktree({ action: "remove", discard_changes: true })
git pull origin main
```

If pull fails due to untracked files that now exist on main (because they were untracked locally before the PR), remove them first, then pull.

### 7. Report

One line: "PR #N merged. <what changed>."

## Rules

- Still follow all project conventions (conventional commits, bun over npm, pre-commit hooks)
- If pre-commit hooks fail, fix and retry. Do not skip hooks.
- If CI is required before merge and PR has branch protection, wait for CI. Otherwise merge immediately.
