---
name: auto-pilot
description: "ONLY invoke when user explicitly types /auto-pilot. Never auto-trigger on keywords. Full autonomous build pipeline: spec, plan, implement (TDD), review, E2E verify, PR."
---

# Auto-Pilot

<TRIGGER-RULE>
This skill ONLY activates when the user explicitly types `/auto-pilot`. Do NOT auto-trigger on phrases like "build me", "just do it", "e2e", or similar. The user must explicitly invoke `/auto-pilot`.
</TRIGGER-RULE>

Fully autonomous end-to-end build pipeline. Takes a single prompt and delivers a finished, verified implementation with spec, plan, code, tests, E2E proof, and a PR. Zero human-in-the-loop.

**You are the orchestrator.** Your job is to stay lean, dispatch agents for every phase, and keep the main context clean. You do NOT do the work yourself. You coordinate.

## Subagent Skill Injection

Every subagent you dispatch MUST have `/caveman:caveman` and `/auto-pilot` prepended to its prompt. Caveman mode cuts token waste across all agents. Example:

```
Agent({
  prompt: "/caveman:caveman\n/auto-pilot\n\n<rest of agent prompt>"
})
```

This applies to ALL agents: architect, spec-reviewer, planner, plan-reviewer, implementer-lead, final-reviewer, e2e-verifier, pr-author. No exceptions.

## The Pipeline

```
Setup -> Architect -> Spec Review -> Planner -> Plan Review -> Implement (TDD) -> Code Review -> E2E Verify -> PR
```

Each phase is a separate agent. Artifacts flow between phases via committed files.

## Orchestrator State Machine

You MUST use TaskCreate at startup to create the fixed task list below. As you execute each phase:
1. Mark the task `in_progress` with TaskUpdate before dispatching the agent
2. Mark it `completed` after the agent reports back successfully
3. If a phase fails, keep the task `in_progress` and report to the user

This is your progress tracker. Never skip updating it.

### Fixed Task List

Create these tasks at startup with TaskCreate, then set up blockedBy dependencies with TaskUpdate:

| # | Subject | Active Form | Blocked By |
|---|---------|-------------|------------|
| 1 | Setup worktree and team | Setting up workspace | - |
| 2 | Design spec | Designing feature | 1 |
| 3 | Review spec | Reviewing spec | 2 |
| 4 | Write implementation plan | Writing plan | 3 |
| 5 | Review plan | Reviewing plan | 4 |
| 6 | Implement with TDD | Implementing | 5 |
| 7 | Code review | Reviewing code | 6 |
| 8 | E2E verification | Verifying end-to-end | 7 |
| 9 | Create PR | Creating pull request | 8 |

## Process

### Phase 0: Setup

1. Create a git worktree for isolation:
   ```bash
   BRANCH="auto-pilot/$(echo "<feature>" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
   git worktree add .worktrees/$BRANCH -b $BRANCH
   ```
2. Record the base SHA: `git rev-parse HEAD` (you need this later for the PR agent)
3. Create the team:
   ```
   TeamCreate({ team_name: "auto-pilot-<feature>", description: "Autonomous build: <feature>" })
   ```
4. Create all 9 tasks with TaskCreate, set up blockedBy chains
5. Mark task 1 completed
6. All agents work from the worktree directory

### Phase 1: Architect

Mark task 2 `in_progress`. Spawn the **architect** agent.

This agent replaces the interactive brainstorming process. Instead of asking the user questions, it makes autonomous decisions based on the codebase context.

```
Agent({
  name: "architect",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Design spec for <feature>",
  prompt: <see Architect Prompt below>
})
```

**The architect must NOT ask questions.** It explores, decides, and documents. If something is ambiguous, it picks the simpler option and documents the assumption in the spec.

**The spec MUST include an E2E Verification Plan section.** The architect decides at design time how this feature should be verified beyond unit tests (what to start, what to hit, what to check).

On success: mark task 2 `completed`.

### Phase 2: Spec Review

Mark task 3 `in_progress`. Spawn the **spec-reviewer** agent.

```
Agent({
  name: "spec-reviewer",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Review spec for <feature>",
  prompt: <see Spec Reviewer Prompt below>
})
```

**If issues found:** Send issues back to architect via SendMessage. Architect fixes, re-commits. Re-dispatch spec reviewer. Max 2 review cycles, then proceed.

**If approved:** Mark task 3 `completed`.

### Phase 3: Planner

Mark task 4 `in_progress`. Spawn the **planner** agent.

```
Agent({
  name: "planner",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Write plan for <feature>",
  prompt: <see Planner Prompt below>
})
```

On success: mark task 4 `completed`.

### Phase 4: Plan Review

Mark task 5 `in_progress`. Spawn the **plan-reviewer** agent.

```
Agent({
  name: "plan-reviewer",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Review plan for <feature>",
  prompt: <see Plan Reviewer Prompt below>
})
```

**If issues found:** Send back to planner via SendMessage. Max 2 review cycles.

**If approved:** Mark task 5 `completed`.

### Phase 5: Implementation

Mark task 6 `in_progress`. Spawn the **implementer-lead** agent.

This agent is the controller from subagent-driven-development. It reads the plan, extracts tasks, and for each task dispatches: implementer subagent -> spec reviewer subagent -> code quality reviewer subagent.

```
Agent({
  name: "implementer-lead",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Implement plan for <feature>",
  prompt: <see Implementer-Lead Prompt below>
})
```

**The implementer-lead dispatches its own sub-agents** using the Agent tool. These are one-shot subagents, not team members.

**TDD is mandatory for every implementer subagent.** The implementer-lead prompt includes the TDD Iron Law which gets passed to each implementer.

On success: mark task 6 `completed`.

### Phase 6: Code Review

Mark task 7 `in_progress`. Spawn the **final-reviewer** agent.

```
Agent({
  name: "final-reviewer",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Final review of <feature>",
  prompt: <see Final Reviewer Prompt below>
})
```

**If critical issues found:** Send back to implementer-lead to fix. Max 1 fix cycle.

**If approved or only minor issues:** Mark task 7 `completed`.

### Phase 7: E2E Verification

<HARD-GATE>
Do NOT skip this phase. Tests passing is NOT proof that the software works. The app must be started, interacted with, and verified to behave correctly before any PR is created. No exceptions.
</HARD-GATE>

Mark task 8 `in_progress`. Spawn the **e2e-verifier** agent.

```
Agent({
  name: "e2e-verifier",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "E2E verify <feature>",
  prompt: <see E2E Verifier Prompt below>
})
```

**If FAIL:** Send failure details back to implementer-lead to fix. Re-run E2E verification. Max 2 cycles. If still failing after 2 cycles, report to user with what's broken and leave the worktree intact.

**If PASS:** Mark task 8 `completed`.

### Phase 8: Create PR

<HARD-GATE>
Do NOT create a PR unless ALL of these are true:
1. All unit tests pass (confirmed by implementer-lead)
2. E2E verification passed (confirmed by e2e-verifier with evidence)
3. Code review approved (confirmed by final-reviewer)

If any of these are not satisfied, STOP and report to the user.
</HARD-GATE>

Mark task 9 `in_progress`. Spawn the **pr-author** agent.

```
Agent({
  name: "pr-author",
  team_name: "auto-pilot-<feature>",
  subagent_type: "general-purpose",
  mode: "auto",
  description: "Create PR for <feature>",
  prompt: <see PR Author Prompt below>
})
```

On success: mark task 9 `completed`.

### Phase 9: Post-PR Review Check

<HARD-GATE>
After the PR is created and CI passes, you MUST read the CI review comments:
```
gh api repos/<owner>/<repo>/pulls/<number>/comments --jq '.[].body'
```
If the review bot found real bugs or issues, fix them before reporting done. This catches bugs that unit tests miss (e.g. format mismatches between old and new APIs, silent behavioral changes).
</HARD-GATE>

Shutdown all teammates. Report the PR URL to the user.

---

## Agent Prompt Templates

### Architect Prompt

```
You are an autonomous software architect. Your job is to design a feature from a single prompt, with zero human interaction.

## The Request

{USER_PROMPT}

## Your Environment

Working directory: {WORKTREE_PATH}

## Your Process

1. Explore the codebase thoroughly. Understand:
   - Project structure, tech stack, patterns
   - Existing code conventions and style
   - Related features or code that this touches
   - Test patterns used

2. Make all design decisions autonomously. For each ambiguity:
   - Pick the simpler option
   - Document the assumption in the spec
   - Prefer approaches consistent with existing patterns

3. Design the feature:
   - Architecture and components
   - Data flow and interfaces
   - Error handling strategy
   - Testing strategy
   - File structure (which files to create/modify)
   - E2E verification plan (how to prove it works beyond tests)

4. Write the spec to: docs/auto-pilot/specs/{DATETIME}-{TOPIC}-design.md
   where {DATETIME} is UTC: `date -u +"%Y-%m-%d--%H-%M"` (e.g. 2026-04-10--21-30)

5. Commit the spec:
   git add docs/auto-pilot/specs/
   git commit -m "docs: add {TOPIC} design spec"
   git push

## Spec Format

# {Feature Name} Design Spec

## Overview
One paragraph describing what this builds and why.

## Assumptions
Decisions made autonomously (the user did not specify these):
- ...

## Architecture
How it works. Components, data flow, interfaces.

## Implementation Details
Key technical details for each component.

## File Structure
Which files to create or modify and what each is responsible for.

## Testing Strategy
What to test and how. Unit tests, integration tests.

## E2E Verification Plan
How to prove this feature works beyond unit tests:
- What to start (server, app, CLI)
- How to start it (exact command)
- What to interact with (endpoints, pages, commands)
- What to verify (expected responses, UI states, output)
- What constitutes PASS vs FAIL

## Error Handling
How errors are handled at each layer.

## Rules
- Do NOT ask questions. Decide and document.
- Do NOT implement anything. Design only.
- Keep it focused. YAGNI ruthlessly.
- Follow existing codebase patterns.
- The spec must be detailed enough that an engineer with zero context can implement it.
- The E2E verification plan must be concrete enough that an agent can execute it without interpretation.

## Report Back With
- Spec file path
- Key decisions made (bullet list)
- Assumptions made (bullet list)
- Any risks or concerns
```

### Spec Reviewer Prompt

```
You are reviewing a design spec for completeness and implementability.

Spec file: {SPEC_PATH}

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, "TBD", incomplete sections |
| Consistency | Internal contradictions, conflicting requirements |
| Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
| Scope | Focused enough for a single plan, not covering multiple independent subsystems |
| YAGNI | Unrequested features, over-engineering |
| Implementability | Could an engineer actually build this from this spec alone? |
| E2E Plan | Is the E2E verification plan concrete and executable? Does it cover the golden path? |

## Calibration

Only flag issues that would cause real problems during implementation.
Approve unless there are serious gaps that would lead to a flawed plan.

## Output

**Status:** APPROVED | ISSUES_FOUND

**Issues (if any):**
- [Section]: [specific issue] - [why it matters]

**Recommendations (advisory, do not block):**
- [suggestions]
```

### Planner Prompt

```
You are writing a detailed implementation plan from a design spec. The plan must be specific enough that an engineer with zero codebase context can follow it step by step.

## Spec

Read the spec at: {SPEC_PATH}

## Working Directory

{WORKTREE_PATH}

## Plan Requirements

Save to: docs/auto-pilot/plans/{DATETIME}-{FEATURE}-plan.md
   where {DATETIME} is UTC: `date -u +"%Y-%m-%d--%H-%M"` (e.g. 2026-04-10--21-30)

### Plan Header

Every plan starts with:

# {Feature Name} Implementation Plan

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]

---

### Task Structure

Each task follows this format:

### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file`
- Modify: `exact/path/to/existing.rs:123-145`
- Test: `tests/exact/path/to/test.rs`

- [ ] **Step 1: Write the failing test**
[actual test code]

- [ ] **Step 2: Run test to verify it FAILS**
Run: `cargo test test_name -- --nocapture`
Expected: FAIL with "not found"

- [ ] **Step 3: Write minimal implementation**
[actual implementation code]

- [ ] **Step 4: Run test to verify it PASSES**
Run: `cargo test test_name -- --nocapture`
Expected: PASS

- [ ] **Step 5: Commit**

### Rules

- Every step is one action (2-5 minutes)
- TDD is mandatory: every task MUST start with a failing test
- No placeholders: "TBD", "TODO", "implement later", "add appropriate error handling"
- Complete code in every step
- Exact file paths always
- Exact commands with expected output
- DRY, YAGNI, frequent commits
- Follow existing codebase patterns

### Self-Review

After writing the plan, check:
1. Spec coverage: every requirement has a task
2. Placeholder scan: no "TBD" or vague steps
3. Type consistency: names match across tasks
4. TDD compliance: every task starts with a failing test step

Fix any issues inline.

## Commit

git add docs/auto-pilot/plans/
git commit -m "docs: add {FEATURE} implementation plan"
git push

## Report Back With
- Plan file path
- Number of tasks
- Estimated scope (files to create/modify)
```

### Plan Reviewer Prompt

```
You are reviewing an implementation plan for completeness and executability.

Plan file: {PLAN_PATH}
Spec file: {SPEC_PATH}

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, incomplete tasks, missing steps |
| Spec Alignment | Plan covers all spec requirements, no major scope creep |
| Task Decomposition | Tasks have clear boundaries, steps are actionable |
| Buildability | Could an engineer follow this plan without getting stuck? |
| Code Quality | Actual code in steps (not pseudocode), exact file paths |
| TDD Compliance | Every task starts with writing a failing test. No exceptions. |

## Calibration

Only flag issues that would cause an implementer to get stuck or build the wrong thing.
Approve unless there are serious gaps.

## Output

**Status:** APPROVED | ISSUES_FOUND

**Issues (if any):**
- [Task X, Step Y]: [specific issue] - [why it matters]

**Recommendations (advisory, do not block):**
- [suggestions]
```

### Implementer-Lead Prompt

```
You are the implementation controller. Your job is to execute an implementation plan by dispatching one subagent per task, with two-stage review after each.

## Plan

Read the plan at: {PLAN_PATH}

## Spec

Reference spec at: {SPEC_PATH}

## Working Directory

{WORKTREE_PATH}

## TDD Iron Law

This is non-negotiable. Every implementer subagent MUST follow this exactly:

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

The cycle for every piece of functionality:
1. Write the test FIRST
2. Run it. Verify it FAILS with the expected failure (RED)
3. Write the MINIMAL code to make it pass
4. Run it. Verify it PASSES (GREEN)
5. Refactor if needed while staying GREEN
6. Commit

Wrote code before the test? DELETE IT. Start over. Do not keep it as "reference."
Do not "adapt" it. Delete means delete.

This applies to EVERY task. No exceptions for:
- "Simple" code
- "Obvious" implementations
- Boilerplate
- Config changes that affect behavior
- Refactoring (tests must pass before AND after)

You MUST include this entire TDD Iron Law section verbatim in every implementer subagent prompt.

## Your Process

For each task in the plan:

### 1. Dispatch Implementer Subagent

Use the Agent tool to dispatch a fresh subagent:

Agent({
  description: "Implement Task N: [name]",
  mode: "auto",
  prompt: <implementer prompt with full task text + TDD Iron Law pasted in>
})

The implementer prompt MUST include:
- The TDD Iron Law section (verbatim, from above)
- Full task text (pasted, not a file reference)
- The working directory
- Instructions to commit after implementation (git add specific files, git commit, git push)
- Self-review checklist
- Report format: Status (DONE|DONE_WITH_CONCERNS|BLOCKED|NEEDS_CONTEXT), what was implemented, test results (showing RED then GREEN), files changed

### 2. Dispatch Spec Reviewer Subagent

After the implementer reports DONE:

Agent({
  description: "Review spec compliance for Task N",
  mode: "auto",
  prompt: <spec reviewer prompt>
})

The spec reviewer MUST:
- Read the actual code (not trust the implementer's report)
- Compare implementation to task requirements line by line
- Verify tests exist and actually test behavior (not just exist)
- Check for missing requirements and extra/unneeded work
- Report: APPROVED or ISSUES_FOUND with specific file:line references

If issues found: dispatch a new implementer subagent to fix, then re-review. Max 2 cycles.

### 3. Dispatch Code Quality Reviewer Subagent

After spec review passes:

Agent({
  description: "Review code quality for Task N",
  mode: "auto",
  prompt: <code quality review prompt with git range>
})

If issues found: dispatch a new implementer subagent to fix, then re-review. Max 2 cycles.

### 4. Move to next task

After both reviews pass, proceed to the next task.

## After All Tasks Complete

Run the full test suite one final time:
- Execute the project's test command (cargo test, bun test, etc.)
- Verify ALL tests pass
- If any fail, dispatch a fix subagent before reporting back

## Handling Implementer Status

- **DONE**: Proceed to spec review
- **DONE_WITH_CONCERNS**: Read concerns, address if about correctness, then proceed
- **BLOCKED**: Assess blocker. Provide more context and re-dispatch, or break task into smaller pieces
- **NEEDS_CONTEXT**: Provide missing context and re-dispatch

## Rules

- Fresh subagent per task (no context pollution)
- Never skip reviews
- Never dispatch multiple implementers in parallel (conflicts)
- Spec review BEFORE code quality review (always)
- Review loops: reviewer finds issues -> new implementer fixes -> reviewer re-reviews
- TDD is not optional. If an implementer reports DONE but didn't follow TDD, reject and re-dispatch.

## Report Back With
- Tasks completed (N/N)
- Total files changed
- Total tests added/modified
- Full test suite result (command + output summary)
- Any concerns or issues encountered
```

### Final Reviewer Prompt

```
You are performing a final code review of an entire feature implementation.

## What Was Built
{IMPLEMENTER_LEAD_REPORT}

## Reference Documents
- Spec: {SPEC_PATH}
- Plan: {PLAN_PATH}

## Git Range
Base: {BASE_SHA}
Head: {HEAD_SHA}

Review the full diff:
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}

## Review Checklist

**Requirements:**
- All spec requirements implemented?
- No scope creep?
- Implementation matches spec intent?

**Code Quality:**
- Clean separation of concerns?
- Proper error handling?
- Type safety?
- DRY principle followed?

**Architecture:**
- Sound design decisions?
- Follows existing codebase patterns?
- Scalability considerations?

**Testing:**
- Tests verify behavior (not mocks)?
- TDD was followed (tests exist for every piece of functionality)?
- Edge cases covered?
- All tests passing?

**Production Readiness:**
- No obvious bugs?
- No security vulnerabilities?
- Breaking changes documented?

## Output

### Strengths
[What's well done, be specific with file:line references]

### Issues
#### Critical (Must Fix)
[Bugs, security issues, data loss risks, broken functionality]

#### Important (Should Fix)
[Architecture problems, missing features, poor error handling, test gaps]

#### Minor (Nice to Have)
[Code style, optimization opportunities]

### Assessment
**Ready for E2E verification?** Yes | No | With Fixes
**Reasoning:** [1-2 sentences]
```

### E2E Verifier Prompt

```
You are the end-to-end verification agent. Your job is to PROVE the feature works by actually running it, interacting with it, and capturing evidence. Unit tests passing is necessary but NOT sufficient. You must verify the software works as a user would experience it.

## What Was Built
{FEATURE_SUMMARY}

## Reference
- Spec (includes E2E Verification Plan): {SPEC_PATH}
- Working directory: {WORKTREE_PATH}

## Your Process

1. Read the spec's "E2E Verification Plan" section for verification instructions
2. Run the full test suite first. If tests fail, report FAIL immediately.
3. Determine the verification strategy based on what was built:

### For HTTP APIs / Backend Services:
- Start the server (exact command from spec)
- Wait for it to be ready (check health endpoint or port)
- curl every endpoint specified in the spec with valid inputs
- Verify response status codes and bodies match expectations
- curl with invalid inputs, verify proper error responses
- Check server logs for unexpected errors
- Stop the server

### For Web Apps / UI:
- Start the dev server
- Use `agent-browser` (installed locally, use directly) to navigate to the app
- Click through the golden path flow
- Verify key UI states and content
- Test error states
- Capture screenshots as evidence
- Stop the server

### For CLI Tools:
- Run each command with --help (verify it works)
- Run the golden path commands
- Verify output matches expectations
- Run with invalid inputs, verify error messages
- Check exit codes

### For Libraries / Crates:
- Write a small integration script that imports and uses the public API
- Run it
- Verify output matches expectations
- Clean up the script

4. Capture evidence:
   - Save screenshots to docs/screenshots/ inside the repo (NEVER /tmp)
   - NEVER steal focus or bring windows to front (Calum works on his machine simultaneously)
   - For window screenshots: use `screencapture -x -l <windowID>` to capture specific windows silently
   - Get window IDs via Swift/CoreGraphics, not osascript UI scripting
   - Save command output as evidence in your report
   - Commit screenshot evidence

5. Compile results

## Output

**Status:** PASS | FAIL

**Test Suite:**
- Command: [what you ran]
- Result: [pass/fail count]

**E2E Verification:**
- [x] or [ ] [Each verification step from the spec's E2E plan]
- Evidence: [screenshot paths, curl output, command output]

**If FAIL:**
- What specifically failed
- Expected vs actual behavior
- Relevant logs or error output
- Suggested fix (if obvious)

**If PASS:**
- Summary of what was verified
- Evidence files committed
```

### PR Author Prompt

```
You are creating a pull request for a completed, tested, and verified feature.

## Context
- Working directory: {WORKTREE_PATH}
- Branch: {BRANCH_NAME}
- Base branch: {BASE_BRANCH}
- Base SHA: {BASE_SHA}
- Spec: {SPEC_PATH}
- Plan: {PLAN_PATH}

## Evidence (all must be present before creating PR)
- Implementer report: {IMPLEMENTER_REPORT_SUMMARY}
- Code review: {REVIEW_RESULT}
- E2E verification: {E2E_RESULT}

## Your Process

1. Read the spec, plan, and all evidence
2. Review the full diff: git diff --stat {BASE_SHA}..HEAD
3. Push the branch: git push -u origin {BRANCH_NAME}
4. Create the PR using the template below

## PR Template

Use `gh pr create` with this exact structure:

gh pr create --title "<concise title under 70 chars>" --body "$(cat <<'EOF'
## Overview

<2-3 sentences: what was built, why it matters, what problem it solves>

## Key Decisions

<Bullet list of architectural choices and assumptions made during design. Pull these from the spec's Assumptions section.>

## Changes

<Group by area. For each file: path and one-line description of what changed.>

**<Area 1>**
- `path/to/file.rs` - <what it does>
- `path/to/other.rs` - <what changed>

**<Area 2>**
- `path/to/file.rs` - <what it does>

## Testing

### Unit Tests
- <N> tests added
- Full suite: `<test command>` - all passing

### E2E Verification
- <What was verified: endpoints hit, pages clicked, commands run>
- <Key results: response codes, UI states confirmed, output verified>
- Evidence: <screenshot paths or inline output summaries>

## Spec & Plan

- Spec: <relative path to spec file>
- Plan: <relative path to plan file>
EOF
)"

## Rules
- Title must be concise, under 70 chars, conventional commit style (feat:, fix:, etc.)
- The Overview must explain WHAT and WHY, not HOW
- Changes section must list every file with a one-line description
- Testing section must include both unit test results AND E2E evidence
- NEVER create the PR if any tests are failing or E2E verification failed
- Verify the branch is pushed before creating

## Report Back With
- PR URL
- PR number
```

## Error Recovery

If any phase fails completely (agent can't complete its work):

1. Log what happened
2. Report to the user with: which phase failed, why, what was completed so far (reference the task list)
3. Leave the worktree intact so the user can pick up manually
4. Do NOT silently retry indefinitely

## Red Flags

**Never:**
- Do the work yourself (you are the orchestrator, always)
- Skip any phase
- Skip reviews
- Skip E2E verification
- Create a PR with failing tests or failed E2E
- Proceed if tests are failing
- Force-push or delete work without user confirmation
- Let the main context get polluted with implementation details
- Forget to update tasks with TaskUpdate

**Always:**
- Use TaskCreate/TaskUpdate to track every phase
- Keep main context clean (just coordination)
- Pass artifacts via file paths
- Commit and push after each phase
- Report progress between phases (task status updates do this automatically)
- Verify everything is green before PR
