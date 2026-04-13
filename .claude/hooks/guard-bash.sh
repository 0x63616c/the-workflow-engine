#!/usr/bin/env bash
# Guard hook for Bash tool calls.
# Blocks dangerous git operations. Reads tool input JSON from stdin.
set -euo pipefail

CMD=$(jq -r '.tool_input.command' < /dev/stdin)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

# --- Block branch creation (use worktrees instead) ---
case "$CMD" in
  *'git checkout -b '*|*'git switch -c '*|*'git switch --create '*)
    echo "BLOCK: Use a worktree instead (EnterWorktree tool)." >&2
    exit 2 ;;
esac

# --- Block bare force push (--force-with-lease is OK) ---
case "$CMD" in
  *'--force-with-lease'*) ;;
  *'git push --force'*|*'git push -f '*)
    echo "BLOCK: Bare force push not allowed. Use --force-with-lease." >&2
    exit 2 ;;
esac

# --- Main branch protections ---
if [[ "$BRANCH" == "main" ]]; then
  case "$CMD" in
    *'git push'*)
      echo "BLOCK: Cannot push from main. Use a worktree." >&2
      exit 2 ;;
    *'git reset --hard'*)
      echo "BLOCK: Cannot reset --hard on main. Use a worktree." >&2
      exit 2 ;;
    *'git merge '*)
      echo "BLOCK: Cannot merge on main. Use a worktree." >&2
      exit 2 ;;
  esac
fi
