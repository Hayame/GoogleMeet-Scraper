# Phase 3: Compilation

Reference module defining the compilation verification phase. This phase ensures that all implementation artifacts compile cleanly and pass linting before proceeding to testing.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Overview

**Goal:** Verify build and lint pass with zero errors, fix all issues found
**Execution:** Dedicated subagents for error fixes (never fix directly in orchestrator)
**Model:** ALL subagents use `model: "opus"`

---

## Step 3.1: Build Check

Run the stack-specific build command:

```bash
{{BUILD_CMD}}
```

Save the complete output to `03_compilation/build_log.md` with the following structure:

```markdown
# Build Log

**Command:** `{{BUILD_CMD}}`
**Executed:** [ISO timestamp]
**Result:** SUCCESS | FAILURE

## Output
[Full command output]

## Error Summary
- Total errors: [count]
- Total warnings: [count]
```

---

## Step 3.2: Lint Check

Run the stack-specific lint command:

```bash
{{LINT_CMD}}
```

Append the output to `03_compilation/build_log.md` under a separate section:

```markdown
## Lint Check

**Command:** `{{LINT_CMD}}`
**Executed:** [ISO timestamp]
**Result:** SUCCESS | FAILURE

## Output
[Full command output]

## Error Summary
- Total errors: [count]
- Total warnings: [count]
```

**Note:** Skip this step entirely if `{{LINT_CMD}}` is an empty string. Document the skip in `build_log.md`:

```markdown
## Lint Check

**Skipped:** No lint command configured for this stack.
```

---

## Step 3.3: Handle Results

### If SUCCESS (0 errors, 0 warnings in both build and lint):

1. Create `03_compilation/PHASE_3_COMPLETE.md` with build/lint summary.
2. Run code-simplifier on implementation files.
3. Create Git commit: `build({{COMMIT_PREFIX}}): verify compilation passes`
4. Continue to Phase 4.

### If FAILURE (any errors or warnings):

Proceed to Step 3.4 to fix all issues.

---

## Step 3.4: Fix Compilation Errors

**Strategy: `{{COMPILATION_FIX_STRATEGY}}`**

The fix strategy determines how errors are grouped and dispatched to subagents.

### Strategy: "per-error" (Frontend default)

Each distinct error gets a dedicated subagent. This is preferred when errors are typically independent (e.g., TypeScript type errors in separate files).

**Subagent prompt template:**

```
Task tool:
  subagent_type: "{{COMPILATION_FIXER_AGENT}}"
  model: "opus"
  prompt: "Fix Compilation Error #[N]

## Error Details
File: [absolute file path]
Line: [line number]
Column: [column number]
Error Code: [e.g., TS2304, CS0246]
Message: [full error message text]

## File Context
[READ and include at least 20 lines surrounding the error location]

## Related Errors
[List any other errors in the same file that may be related]

## Fix Requirements
1. Identify the root cause of the error
2. Apply the minimal fix that resolves the error
3. Verify the fix does not introduce new errors in adjacent code
4. Follow coding standards in {{GUIDELINES_PATH}}

## Verification
After applying the fix, confirm the error no longer appears."
```

**Execution order:** Fix errors in dependency order when possible (e.g., fix missing type definitions before fixing files that import them).

### Strategy: "batch" (Backend default)

Group related errors and fix them together. This is preferred when errors tend to cascade (e.g., a missing namespace causes errors in multiple files).

**Grouping Strategy (apply in priority order):**

| Priority | Grouping | Rationale |
|----------|----------|-----------|
| 1 | By Dependency | Errors caused by the same root issue (e.g., missing import) |
| 2 | By File | Multiple errors in the same file |
| 3 | By Error Code | Same error type across files (e.g., all CS0246) |
| 4 | Isolate Complex | Structural or architectural errors get dedicated subagents |

**Subagent prompt template:**

```
Task tool:
  subagent_type: "{{COMPILATION_FIXER_AGENT}}"
  model: "opus"
  prompt: "Fix Compilation Error Batch #[N]

## Errors in This Batch
| # | File | Line | Code | Message |
|---|------|------|------|---------|
| 1 | [path] | [line] | [code] | [message] |
| 2 | [path] | [line] | [code] | [message] |

## Grouping Reason
[Same file / same error code / shared dependency / cascading from root cause]

## File Context
[READ and include all affected files, or relevant sections of large files]

## Fix Requirements
1. Identify the shared root cause (if applicable)
2. Fix all errors in the batch
3. Apply minimal changes -- do not refactor unrelated code
4. Follow coding standards in {{GUIDELINES_PATH}}

## Verification
After applying fixes, confirm all errors in this batch are resolved."
```

---

## Step 3.5: Rebuild After Fixes

After all fix subagents complete, re-run the build and lint commands:

```bash
{{BUILD_CMD}}
{{LINT_CMD}}
```

- **If 0 errors:** Proceed to completion (Step 3.6).
- **If new errors appear:** Return to Step 3.4 with the new error set. Track iteration count.
- **If same errors persist:** Escalate -- launch a dedicated subagent with expanded context including the failed fix attempt.

**Maximum iterations:** 3 rebuild cycles. If errors persist after 3 cycles, document the remaining issues and notify the user.

---

## Step 3.6: Fixes Log

Maintain `03_compilation/fixes_log.md` throughout the fix process:

```markdown
# Compilation Fixes

**Strategy:** {{COMPILATION_FIX_STRATEGY}}
**Total Errors Found:** [count]
**Total Fix Iterations:** [count]

## Fix #1: [Short Description]
**Status:** PENDING | IN_PROGRESS | FIXED | ESCALATED
**File:** [absolute path]
**Error Code:** [code]
**Root Cause:** [brief explanation]
**Fix Applied:** [description of the change]
**Iteration:** [which rebuild cycle]

## Fix #2: [Short Description]
...
```

---

## Phase 3 Completion

After all errors are resolved:

1. Run code-simplifier on all files modified during this phase.
2. Create Git commit: `fix({{COMMIT_PREFIX}}): resolve compilation errors`
3. Create `03_compilation/PHASE_3_COMPLETE.md`:

```markdown
# Phase 3: Compilation -- Complete

**Completed:** [ISO timestamp]
**Build Command:** `{{BUILD_CMD}}`
**Lint Command:** `{{LINT_CMD}}`

## Results
- Build: PASS (0 errors, 0 warnings)
- Lint: PASS (0 errors, 0 warnings) | SKIPPED
- Fix iterations: [count]
- Total fixes applied: [count]
```
