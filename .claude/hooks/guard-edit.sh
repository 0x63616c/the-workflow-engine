#!/usr/bin/env bash
# Guard hook for Edit/Write tool calls.
# Blocks ALL file modifications on main branch.
# Agents MUST enter a worktree before modifying any files.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

if [[ "$BRANCH" == "main" ]]; then
  cat >&2 <<'MSG'
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
HARD BLOCK -- EDIT/WRITE TOOL DENIED ON MAIN BRANCH
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

You CANNOT modify ANY file while on the main branch. This is enforced
by a pre-tool hook and cannot be overridden.

MANDATORY NEXT STEP (the ONLY option):
  Call the EnterWorktree tool RIGHT NOW to create a worktree.

DO NOT attempt to work around this block. ALL of the following are
ALSO blocked by the companion Bash guard hook:
  - cat/heredoc writes (cat <<EOF > file)
  - echo/printf with redirects (echo "..." > file)
  - tee, sed -i, cp, mv, touch, mkdir, dd, patch, install
  - ANY Bash command that creates or modifies files

Both Edit and Write tools are blocked. Bash file writes are blocked.
There is NO tool and NO method that will let you modify files on main.

You MUST use the EnterWorktree tool first. This is non-negotiable.
Do not try anything else. Do not proceed without a worktree.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
MSG
  exit 2
fi
