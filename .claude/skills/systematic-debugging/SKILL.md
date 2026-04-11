---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Haven't completed Phase 1? Cannot propose fixes.

## When to Use

ANY technical issue: test failures, prod bugs, unexpected behavior, perf problems, build failures, integration issues.

**Use ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "One quick fix" seems obvious
- Already tried multiple fixes
- Previous fix didn't work
- Don't fully understand issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- In a hurry (rushing guarantees rework)

## The Four Phases

Complete each phase before next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip errors/warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger reliably?
   - Exact steps?
   - If not reproducible: gather more data, don't guess

3. **Check Recent Changes**
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components:**

   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **Reveals:** Which layer fails (secrets -> workflow Y, workflow -> build X)

5. **Trace Data Flow**

   See `root-cause-tracing.md` for complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until source found
   - Fix at source, not symptom

### Phase 2: Pattern Analysis

1. **Find Working Examples** - Similar working code in same codebase
2. **Compare Against References** - Read reference implementation COMPLETELY (don't skim)
3. **Identify Differences** - List every difference, however small
4. **Understand Dependencies** - Components, settings, config, assumptions

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis** - "I think X is root cause because Y"
2. **Test Minimally** - SMALLEST possible change, one variable at a time
3. **Verify** - Worked? Phase 4. Didn't? NEW hypothesis. Don't pile on fixes.
4. **When You Don't Know** - Say so. Ask for help. Research more.

### Phase 4: Implementation

1. **Create Failing Test Case** - Simplest reproduction. Use `superpowers:test-driven-development` skill.
2. **Implement Single Fix** - Address root cause. ONE change. No "while I'm here" improvements.
3. **Verify Fix** - Test passes? No other tests broken? Issue resolved?
4. **If Fix Doesn't Work**
   - Count fixes tried
   - < 3: Return to Phase 1 with new info
   - **>= 3: STOP. Question architecture (step 5)**

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern:** Each fix reveals new coupling/problem. Fixes require "massive refactoring". Each fix creates new symptoms.

   **STOP and question fundamentals:**
   - Is pattern fundamentally sound?
   - Should we refactor architecture vs. continue symptom fixing?

   **Discuss with Calum before attempting more fixes.**

## Red Flags - STOP and Follow Process

If thinking:
- "Quick fix for now, investigate later"
- "Try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when tried 2+)**
- **Each fix reveals new problem in different place**

**ALL mean: STOP. Return to Phase 1.**

**3+ fixes failed:** Question architecture (Phase 4.5)

## Calum's Signals You're Doing It Wrong

- "Is that not happening?" - Assumed without verifying
- "Will it show us...?" - Should have added evidence gathering
- "Stop guessing" - Proposing fixes without understanding
- "Ultrathink this" - Question fundamentals, not symptoms

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue simple, don't need process" | Simple issues have root causes. Process fast for simple bugs. |
| "Emergency, no time" | Systematic debugging FASTER than guess-and-check. |
| "Try this first, then investigate" | First fix sets pattern. Do it right from start. |
| "Write test after confirming fix" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, adapt pattern" | Partial understanding guarantees bugs. Read completely. |
| "I see problem, let me fix it" | Seeing symptoms != understanding root cause. |
| "One more fix attempt" (after 2+) | 3+ failures = architectural problem. Question pattern. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

If truly environmental, timing-dependent, or external:
1. Document what investigated
2. Implement appropriate handling (retry, timeout, error message)
3. Add monitoring/logging

**But:** 95% of "no root cause" = incomplete investigation.

## Supporting Techniques

In this directory:
- **`root-cause-tracing.md`** - Trace bugs backward through call stack
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling

**Related skills:**
- **superpowers:test-driven-development** - Creating failing test case (Phase 4)
- **superpowers:verification-before-completion** - Verify fix before claiming success
