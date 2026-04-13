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

# Create a temp git repo to control branch name
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
git -C "$TMPDIR" init -q
git -C "$TMPDIR" commit --allow-empty -m "init" -q

run_bash_hook() {
  local branch="$1" cmd="$2"
  git -C "$TMPDIR" checkout -q -B "$branch" 2>/dev/null
  echo "{\"tool_input\":{\"command\":\"$cmd\"}}" | \
    GIT_DIR="$TMPDIR/.git" bash "$SCRIPT_DIR/guard-bash.sh" 2>/dev/null
}

run_edit_hook() {
  local branch="$1"
  git -C "$TMPDIR" checkout -q -B "$branch" 2>/dev/null
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
echo "=== guard-bash.sh: main branch protections (git) ==="
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
echo "=== guard-bash.sh: main branch file-write blocking ==="
run_bash_hook "main" "cat > foo.txt <<EOF\nhello\nEOF"
check "cat heredoc on main blocked" "block" $?
run_bash_hook "main" "echo hello > foo.txt"
check "echo redirect on main blocked" "block" $?
run_bash_hook "main" "printf 'hello' > foo.txt"
check "printf redirect on main blocked" "block" $?
run_bash_hook "main" "tee foo.txt <<< hello"
check "tee on main blocked" "block" $?
run_bash_hook "main" "sed -i '' 's/old/new/' foo.txt"
check "sed -i on main blocked" "block" $?
run_bash_hook "main" "cp src.txt dst.txt"
check "cp on main blocked" "block" $?
run_bash_hook "main" "mv old.txt new.txt"
check "mv on main blocked" "block" $?
run_bash_hook "main" "touch newfile.txt"
check "touch on main blocked" "block" $?
run_bash_hook "main" "mkdir -p new-dir"
check "mkdir on main blocked" "block" $?

echo ""
echo "=== guard-bash.sh: main branch safe reads allowed ==="
run_bash_hook "main" "cat foo.txt"
check "cat (read-only) on main allowed" "pass" $?
run_bash_hook "main" "echo hello"
check "echo (no redirect) on main allowed" "pass" $?
run_bash_hook "main" "ls -la"
check "ls on main allowed" "pass" $?
run_bash_hook "main" "git status"
check "git status on main allowed" "pass" $?
run_bash_hook "main" "git log --oneline -5"
check "git log on main allowed" "pass" $?

echo ""
echo "=== guard-bash.sh: non-main file writes allowed ==="
run_bash_hook "feat/x" "echo hello > foo.txt"
check "echo redirect on feature branch allowed" "pass" $?
run_bash_hook "feat/x" "cat > foo.txt <<EOF\nhello\nEOF"
check "cat heredoc on feature branch allowed" "pass" $?
run_bash_hook "feat/x" "touch newfile.txt"
check "touch on feature branch allowed" "pass" $?

echo ""
echo "=== guard-edit.sh ==="
run_edit_hook "feat/x"
check "edit on non-main allowed" "pass" $?
run_edit_hook "main"
check "edit on main blocked" "block" $?

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]] || exit 1
