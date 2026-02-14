# Phase 6: Fix Issues

Reference module defining the issue remediation phase. This phase resolves all compliance issues identified during validation and verifies the fixes through re-validation.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Overview

**Goal:** Remediate all compliance issues found in Phase 5
**Execution:** Intelligent batching by severity and locality
**Model:** ALL subagents use `model: "opus"`

**ONLY execute this phase if Phase 5 found issues.** If `05_validation/PHASE_5_COMPLETE.md` indicates "Phase 6 required: NO", skip this phase entirely.

---

## Step 6.1: Assess and Categorize Issues

Read `05_validation/review_report.md` and `05_validation/acceptance_criteria_verification.md`.

Combine all issues into a unified list and categorize by severity:

**Severity-to-Complexity Mapping:**

| Severity | Batch Size | Execution Mode |
|----------|------------|----------------|
| LOW | Up to 10 issues per subagent | Batch fix |
| MEDIUM | Up to 5 issues per subagent (same file preferred) | Batch fix |
| HIGH | Up to 2 issues per subagent | Prefer dedicated subagent |
| CRITICAL | Exactly 1 issue per subagent | ALWAYS dedicated subagent |

Create `06_fixes/fix_plan.md`:

```markdown
# Fix Plan

**Total Issues:** [count]
**Source:** Code review + AC verification + code-simplifier + AI index gaps

## Issues by Severity

| # | Severity | Category | File | Description | Batch |
|---|----------|----------|------|-------------|-------|
| 1 | CRITICAL | [category] | [path] | [description] | Dedicated |
| 2 | HIGH | [category] | [path] | [description] | Dedicated |
| 3 | MEDIUM | [category] | [path] | [description] | Batch A |
| 4 | LOW | [category] | [path] | [description] | Batch B |

## Execution Order
1. CRITICAL issues (dedicated subagents)
2. HIGH issues (dedicated or small batch)
3. MEDIUM + LOW issues (batched)
```

---

## Step 6.2: Execute Fixes

### Pattern A: Batch Fix (multiple small issues)

For LOW and MEDIUM severity issues that can be grouped:

```
Task tool:
  subagent_type: "{{FIXER_AGENT}}"
  model: "opus"
  prompt: "Fix Code Review Issues -- Batch #[N]

## Issues to Fix

| # | Severity | File | Line | Description | Recommendation |
|---|----------|------|------|-------------|----------------|
| 1 | [sev] | [path] | [line] | [description] | [recommendation] |
| 2 | [sev] | [path] | [line] | [description] | [recommendation] |

## Files Context
[READ all affected files and include relevant content]

## Guidelines Reference
{{GUIDELINES_PATH}}

## Output Requirements
- Apply all fixes listed above
- Report each fix: what was changed and why
- Verify fixes do not introduce new issues
- Do not modify unrelated code"
```

### Pattern B: Dedicated Fix (critical or complex issues)

For CRITICAL and HIGH severity issues:

```
Task tool:
  subagent_type: "{{FIXER_AGENT}}"
  model: "opus"
  prompt: "Fix Code Review Issue #[N]

## Issue Details
**Severity:** [CRITICAL / HIGH]
**Category:** [category from review report]
**File:** [absolute path]
**Line:** [line number or range]
**Description:** [FULL description from review report]
**Recommendation:** [FULL recommendation from review report]

## File Context
[FULL content of affected file -- do not truncate]

## Related Files
[Any files that import, extend, or depend on the affected file]

## Guidelines Reference
{{GUIDELINES_PATH}} -- Section [relevant section]

## Verification
After applying the fix:
- Run: {{BUILD_CMD}}
- Run: {{LINT_CMD}}
- Expected: No new errors introduced
- Verify the fix addresses the root cause, not just the symptom"
```

### Execution Order

1. **Fix CRITICAL issues first** -- each in a dedicated subagent.
2. **Fix HIGH issues** -- dedicated subagents or small batches of 2.
3. **Batch MEDIUM and LOW issues** -- grouped by file or category.
4. **Fix AC failures** -- dedicated subagents for each failed acceptance criterion.
5. **Update AI index** -- if `05_validation/index_gaps.md` exists, update index files.

**After EACH subagent completes:**
- Verify the fix was applied.
- Run `{{BUILD_CMD}}` to confirm no regressions.
- Update `fix_progress.md`.

---

## Step 6.3: Track Fix Progress

Maintain `06_fixes/fix_progress.md` throughout the phase:

```markdown
# Fix Progress

**Started:** [ISO timestamp]
**Total Issues:** [count]

## Issues Summary

| # | Severity | Category | File | Status |
|---|----------|----------|------|--------|
| 1 | CRITICAL | [category] | [path] | FIXED |
| 2 | HIGH | [category] | [path] | IN_PROGRESS |
| 3 | MEDIUM | [category] | [path] | PENDING |

## Fix Log

### Issue #1: [Short Description]
**Severity:** CRITICAL
**Status:** FIXED
**Fix Applied:** [Description of the change made]
**Verified:** Build and lint pass -- no regressions
**Subagent:** Dedicated

### Issue #2: [Short Description]
**Severity:** HIGH
**Status:** IN_PROGRESS
...

## Progress Summary

| Severity | Total | Fixed | In Progress | Pending |
|----------|-------|-------|-------------|---------|
| CRITICAL | 1 | 1 | 0 | 0 |
| HIGH | 2 | 1 | 1 | 0 |
| MEDIUM | 3 | 0 | 0 | 3 |
| LOW | 4 | 0 | 0 | 4 |
| Total | 10 | 2 | 1 | 7 |
```

---

## Step 6.4: Final Verification

After all fixes are applied, run the full verification suite:

```bash
{{BUILD_CMD}}
{{LINT_CMD}}
{{TEST_CMD}}
```

**All three commands must succeed:**

| Check | Command | Required Result |
|-------|---------|-----------------|
| Build | `{{BUILD_CMD}}` | 0 errors, 0 warnings |
| Lint | `{{LINT_CMD}}` | 0 errors, 0 warnings (skip if empty) |
| Tests | `{{TEST_CMD}}` | All passing (skip if no tests exist) |

If any check fails, return to Step 6.2 with the new errors. Maximum 2 additional fix iterations.

---

## Step 6.5: Re-run Validation (MANDATORY)

Re-run the code review skill to confirm all issues have been resolved:

```bash
/{{CODE_REVIEW_SKILL}} "verification after fixes for [task description]"
```

**Expected result:** 0 issues found.

If new issues are discovered during re-validation:
- If 3 or fewer minor issues: fix inline and re-verify.
- If more than 3 issues or any CRITICAL/HIGH: document and notify the user.

---

## Step 6.6: Commit Fixes

1. Run code-simplifier on all files modified during this phase.
2. Stage all fix-related changes.
3. Create Git commit: `fix({{COMMIT_PREFIX}}): resolve code review issues`

---

## Phase 6 Deliverables

| Artifact | Location | Purpose |
|----------|----------|---------|
| `fix_plan.md` | `06_fixes/` | Issue categorization and execution plan |
| `fix_progress.md` | `06_fixes/` | Real-time fix tracking |
| Re-validation report | `06_fixes/` | Proof that all issues are resolved |
| `PHASE_6_COMPLETE.md` | `06_fixes/` | Phase completion marker |

Create `06_fixes/PHASE_6_COMPLETE.md`:

```markdown
# Phase 6: Fix Issues -- Complete

**Completed:** [ISO timestamp]

## Summary
- Total issues from Phase 5: [count]
- Issues fixed: [count]
- Fix iterations: [count]
- Re-validation result: [0 issues / N remaining]

## Final Verification
- Build: PASS
- Lint: PASS | SKIPPED
- Tests: PASS | SKIPPED | N/A

## Commits
- [commit hash] - [commit message]
```
