# Phase 5: Validation

Reference module defining the validation phase. This phase runs a full code review to verify guideline compliance and confirms that all acceptance criteria are satisfied.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Overview

**Goal:** Verify 100% guideline compliance and acceptance criteria coverage through automated code review

---

## Step 5.1: Run Code Review

Invoke the stack-specific code review skill against all implementation files:

```bash
/{{CODE_REVIEW_SKILL}} "implementation of [task description]"
```

This produces a review output directory at:
`{{OUTPUT_DIR_PREFIX}}/{timestamp}_{task}/` (with `implementation` replaced by `code-review` in the prefix path).

Wait for the code review skill to complete fully before proceeding.

---

## Step 5.2: Copy Review Artifacts

Copy the code review output into the implementation run directory:

1. Create `05_validation/` within the current run directory.
2. Copy the review report and all supporting files into `05_validation/`.
3. Verify that `05_validation/review_report.md` exists and is readable.

---

## Step 5.2.5: Verify Acceptance Criteria Coverage

Read `01_planning/acceptance_criteria.md` and systematically verify that every acceptance criterion has been fulfilled by the implementation.

Create `05_validation/acceptance_criteria_verification.md`:

```markdown
# Acceptance Criteria Verification

**Task:** [task description]
**Verified:** [ISO timestamp]

## Verification Matrix

| AC ID | Description | Implemented | Tested | Review Pass | Status |
|-------|-------------|-------------|--------|-------------|--------|
| AC-1 | [Description] | Y / N | Y / N / N/A | Y / N | PASS / FAIL |
| AC-2 | [Description] | Y / N | Y / N / N/A | Y / N | PASS / FAIL |
| AC-3 | [Description] | Y / N | Y / N / N/A | Y / N | PASS / FAIL |

## Overall Result
- Total ACs: [count]
- Passed: [count]
- Failed: [count]

## Failed AC Details
[For each FAIL, explain what is missing and what remediation is needed]
```

**If any AC is marked FAIL:** Document the specific failure and required remediation. These will be addressed in Phase 6 alongside any code review issues.

---

## Step 5.2.7: Final Code-Simplifier Review (MANDATORY)

Run code-simplifier on ALL implementation files created or modified during Phase 2. This is a mandatory quality gate that must complete before Phase 5 can be marked done.

Review the code-simplifier output and note any simplification opportunities. If code-simplifier suggests changes, they should be queued for Phase 6.

---

## Step 5.3: Analyze Code Review Results

Read `05_validation/review_report.md` and determine the next action:

**If 0 issues found AND all ACs pass:**
- Phase 6 is NOT needed.
- Skip directly to the Final Summary.
- Record the decision in `PHASE_5_COMPLETE.md`.

**If issues are found OR any AC failed:**
- Phase 6 IS needed.
- Categorize all issues by severity for Phase 6 consumption.
- Record the decision in `PHASE_5_COMPLETE.md`.

---

## Step 5.4: AI Index Verification

Verify that the Symbolic AI Code Index has been updated for all new and modified files:

1. Read `docs/ai-index/.skill/SKILL.md` to confirm indexing requirements.
2. Cross-reference `02_implementation/completed_files.md` against the index.
3. Verify that the following index artifacts are current:
   - Symbol registry (`01_SYMBOL_REGISTRY`)
   - Structure tree (`02_STRUCTURE_TREE`)
   - Dependency graph (`03_DEPENDENCY_GRAPH`)
   - Domain-specific index files (routes, API surface, type system, etc.)

4. If any index files are stale or missing entries for new symbols:
   - Document the gaps in `05_validation/index_gaps.md`.
   - Queue index updates for Phase 6 (or handle inline if skipping Phase 6).

---

## Phase 5 Deliverables

| Artifact | Location | Purpose |
|----------|----------|---------|
| Review report and supporting files | `05_validation/` | Full code review output |
| `acceptance_criteria_verification.md` | `05_validation/` | AC coverage proof |
| `index_gaps.md` | `05_validation/` | AI index update requirements (if any) |
| `PHASE_5_COMPLETE.md` | `05_validation/` | Phase completion with Phase 6 decision |

Create `05_validation/PHASE_5_COMPLETE.md`:

```markdown
# Phase 5: Validation -- Complete

**Completed:** [ISO timestamp]

## Code Review Summary
- Issues found: [count]
- Critical: [count]
- High: [count]
- Medium: [count]
- Low: [count]

## Acceptance Criteria
- Total ACs: [count]
- Passed: [count]
- Failed: [count]

## AI Index Status
- Up to date: [Y / N]
- Gaps documented: [Y / N / N/A]

## Decision
- **Phase 6 required:** [YES / NO]
- **Reason:** [0 issues and all ACs pass / N issues found / M ACs failed]
```
