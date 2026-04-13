#!/usr/bin/env bash
# Guard hook for Edit/Write tool calls.
# Blocks file modifications on main branch.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

if [[ "$BRANCH" == "main" ]]; then
  echo "BLOCK: Cannot edit files on main. Use a worktree first." >&2
  exit 2
fi
