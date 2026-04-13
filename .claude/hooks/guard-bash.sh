#!/usr/bin/env bash
# Guard hook for Bash tool calls.
# Blocks dangerous git operations and file modifications on main branch.
# Agents MUST enter a worktree before modifying any files.
set -euo pipefail

CMD=$(jq -r '.tool_input.command' < /dev/stdin)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

# --- Block branch creation (use worktrees instead) ---
case "$CMD" in
  *'git checkout -b '*|*'git switch -c '*|*'git switch --create '*)
    echo "HARD BLOCK: Do not create branches directly. You MUST use the EnterWorktree tool. No workarounds, no exceptions." >&2
    exit 2 ;;
esac

# --- Block bare force push (--force-with-lease is OK) ---
case "$CMD" in
  *'--force-with-lease'*) ;;
  *'git push --force'*|*'git push -f '*)
    echo "HARD BLOCK: Bare force push not allowed. Use --force-with-lease instead." >&2
    exit 2 ;;
esac

# --- Main branch protections ---
if [[ "$BRANCH" == "main" ]]; then
  # Block git operations that should only happen in worktrees
  case "$CMD" in
    *'git push'*)
      cat >&2 <<'MSG'
HARD BLOCK: git push DENIED on main branch.
You MUST use the EnterWorktree tool first. No workarounds, no exceptions.
MSG
      exit 2 ;;
    *'git reset --hard'*)
      cat >&2 <<'MSG'
HARD BLOCK: git reset --hard DENIED on main branch.
You MUST use the EnterWorktree tool first. No workarounds, no exceptions.
MSG
      exit 2 ;;
    *'git merge '*)
      cat >&2 <<'MSG'
HARD BLOCK: git merge DENIED on main branch.
You MUST use the EnterWorktree tool first. No workarounds, no exceptions.
MSG
      exit 2 ;;
  esac

  # Block ANY file-writing bash commands on main
  # This prevents circumventing Edit/Write guards via shell tricks
  WRITES_FILE=false
  case "$CMD" in
    *'>'*|*'tee '*|*'tee>'*) WRITES_FILE=true ;;
    *'cat <<'*|*'cat >'*|*'cat>'*) WRITES_FILE=true ;;
    *'echo '*|*'printf '*)
      # Only block echo/printf when they redirect to files
      case "$CMD" in *'>'*) WRITES_FILE=true ;; esac ;;
    *'sed -i'*|*"sed -i"*) WRITES_FILE=true ;;
    *'cp '*|*'mv '*|*'install '*) WRITES_FILE=true ;;
    *'mkdir '*|*'touch '*) WRITES_FILE=true ;;
    *'patch '*|*'dd '*) WRITES_FILE=true ;;
  esac

  if [[ "$WRITES_FILE" == "true" ]]; then
    cat >&2 <<'MSG'
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
HARD BLOCK -- BASH FILE WRITE DENIED ON MAIN BRANCH
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

Your command was blocked because it writes/creates files and you are
on the main branch. This hook exists specifically to prevent agents
from circumventing the Edit/Write guard by using Bash instead.

ALL file modification methods are blocked on main:
  - Edit tool: BLOCKED
  - Write tool: BLOCKED
  - Bash with redirects, heredocs, tee, sed -i, cp, mv, etc.: BLOCKED

MANDATORY NEXT STEP (the ONLY option):
  Call the EnterWorktree tool RIGHT NOW to create a worktree.

Do NOT retry this command. Do NOT try a different file-writing method.
Do NOT try Edit or Write tools. They are ALL blocked on main.
The ONLY action that will work is: EnterWorktree.

This is non-negotiable. There are zero workarounds.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
MSG
    exit 2
  fi
fi
