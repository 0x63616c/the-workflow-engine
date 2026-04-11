---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming engineer has zero codebase context and questionable taste. Document everything: which files to touch, code, testing, docs to check, how to test. Give whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume skilled dev, knows nothing about toolset or domain. Assume weak test design knowledge.

**Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Scope Check

If spec covers multiple independent subsystems, should have been split during brainstorming. If not, suggest separate plans per subsystem. Each plan produces working, testable software on its own.

## File Structure

Before defining tasks, map which files created/modified and what each does. Decomposition decisions lock in here.

- Design units with clear boundaries and well-defined interfaces. One clear responsibility per file.
- Prefer smaller, focused files over large ones doing too much.
- Files changing together should live together. Split by responsibility, not technical layer.
- In existing codebases, follow established patterns. If file grown unwieldy, include split in plan.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write failing test" - step
- "Run it to make sure it fails" - step
- "Implement minimal code to pass" - step
- "Run tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain actual content. These are **plan failures**:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat code - engineer may read out of order)
- Steps describing what to do without showing how (code blocks required)
- References to types/functions not defined in any task

## Remember
- Exact file paths always
- Complete code in every step
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing complete plan, check against spec:

**1. Spec coverage:** Each spec requirement has a task? List gaps.
**2. Placeholder scan:** Search for "No Placeholders" red flags. Fix.
**3. Type consistency:** Names match across tasks? `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 = bug.

Find issues: fix inline. Spec requirement with no task: add task.

## Execution Handoff

After saving plan:

**"Plan complete and saved. Two execution options:**
**1. Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks
**2. Inline Execution** - Execute tasks in this session, batch with checkpoints

**Which approach?"**

**Subagent-Driven:** Use superpowers:subagent-driven-development
**Inline:** Use superpowers:executing-plans
