#!/usr/bin/env bash
# Test suite for guard hooks.
# Uses GIT_DIR override to simulate branch context.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0

check() {
  local desc="$1" expect="$2" exit_code="$3"
  if [[ "$expect" == "pass" && "$exit_code" -eq 0 ]]; then
    echo "  PASS: $desc"
    ((PASS++))
  elif [[ "$expect" == "block" && "$exit_code" -eq 2 ]]; then
    echo "  PASS: $desc (blocked)"
    ((PASS++))
  else
    echo "  FAIL: $desc (expected $expect, got exit $exit_code)"
    ((FAIL++))
  fi
}

# Create a temp git repo to control branch name.
# Clear ALL GIT_* env vars so lefthook context doesn't leak into
# the temp repo and cause commits/operations in the real repo.
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Run git with a clean environment (no inherited GIT_* vars)
clean_git() {
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    git -C "$TMPDIR" "$@"
}

clean_git init -q
clean_git config user.email "test@test"
clean_git config user.name "test"
clean_git commit --allow-empty -m "init" -q

run_bash_hook() {
  local branch="$1" cmd="$2"
  clean_git checkout -q -B "$branch" 2>/dev/null
  echo "{\"tool_input\":{\"command\":\"$cmd\"}}" |
    env -u GIT_WORK_TREE -u GIT_INDEX_FILE \
      -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
      GIT_DIR="$TMPDIR/.git" bash "$SCRIPT_DIR/guard-bash.sh" 2>/dev/null
}

run_edit_hook() {
  local branch="$1"
  clean_git checkout -q -B "$branch" 2>/dev/null
  env -u GIT_WORK_TREE -u GIT_INDEX_FILE \
    -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    GIT_DIR="$TMPDIR/.git" bash "$SCRIPT_DIR/guard-edit.sh" 2>/dev/null
}

echo "=== guard-bash.sh: branch creation ==="
run_bash_hook "feat/x" "git checkout -b new-branch"
check "checkout -b blocked" "block" $?
run_bash_hook "feat/x" "git switch -c new-branch"
check "switch -c blocked" "block" $?
run_bash_hook "feat/x" "git switch --create new-branch"
check "switch --create blocked" "block" $?

echo ""
echo "=== guard-bash.sh: force push (non-main) ==="
run_bash_hook "feat/x" "git push --force-with-lease origin feat/x"
check "force-with-lease allowed" "pass" $?
run_bash_hook "feat/x" "git push --force origin feat/x"
check "bare --force blocked" "block" $?
run_bash_hook "feat/x" "git push -f origin feat/x"
check "push -f blocked" "block" $?

echo ""
echo "=== guard-bash.sh: normal ops (non-main) ==="
run_bash_hook "feat/x" "git push -u origin feat/x"
check "normal push allowed" "pass" $?
run_bash_hook "feat/x" "bun run test"
check "non-git command allowed" "pass" $?

echo ""
echo "=== guard-bash.sh: main branch protections ==="
run_bash_hook "main" "git push origin main"
check "push from main blocked" "block" $?
run_bash_hook "main" "git push --force-with-lease origin main"
check "force-with-lease from main blocked" "block" $?
run_bash_hook "main" "git reset --hard HEAD~1"
check "reset --hard on main blocked" "block" $?
run_bash_hook "main" "git merge feat/x"
check "merge on main blocked" "block" $?
run_bash_hook "main" "bun run test"
check "non-git on main allowed" "pass" $?

echo ""
echo "=== guard-edit.sh ==="
run_edit_hook "feat/x"
check "edit on non-main allowed" "pass" $?
run_edit_hook "main"
check "edit on main blocked" "block" $?

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]] || exit 1
