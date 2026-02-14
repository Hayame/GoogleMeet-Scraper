# Orchestrator Framework

Reference module defining the orchestrator pattern, directory structure, git workflow, subagent strategy, and phase transition gates for all implementation workflows.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Input Parsing

The skill receives `$ARGUMENTS` from the user. Parse it to determine the task description, name, and slug.

### File Path Input

If `$ARGUMENTS` contains `/` or ends with `.md`, treat it as a file path:

1. Read the file using the Read tool.
2. Extract the task description from the file content.
3. Derive the task name from the filename or the first heading in the file.
4. Generate a task slug from the task name (lowercase, spaces to underscores, max 50 characters, alphanumeric and underscores only).

### String Input

If `$ARGUMENTS` is a plain string:

1. Use it directly as the task description.
2. Extract the task name from the first 5-10 words.
3. Generate a task slug from the task name using the same rules as above.

### Clarification Phase (MANDATORY)

After parsing the input, apply **Rule 1** from `01-operational-rules.md`:

- If requirements are vague, ask for specific details.
- If UI/UX expectations are unclear, ask for design preferences.
- If business logic is ambiguous, ask for expected behavior.
- If edge cases are not defined, ask what should happen.

Use the `AskUserQuestion` tool to gather missing information.

**DO NOT proceed to Phase 1 until you have complete clarity on the task.**

---

## Output Directory

Every implementation run produces a self-contained artifact directory.

### Path Format

```
{{OUTPUT_DIR_PREFIX}}/{timestamp}_{task_slug}/
```

- **Timestamp format:** `YYYYMMDD_HHMMSS`
- **Task slug:** lowercase, spaces replaced with underscores, max 50 characters, stripped of special characters.
- The `.claude` directory lives at the project root.

### Directory Structure

```
{{OUTPUT_DIR_PREFIX}}/{timestamp}_{task_slug}/
|
+-- 00_task_description.md
|
+-- 01_planning/
|   +-- requirements_analysis.md
|   +-- architecture_design.md
|   +-- user_stories.md
|   +-- acceptance_criteria.md
|   +-- implementation_plan.md
|   +-- subtask_breakdown.md
|   +-- PHASE_1_COMPLETE.md
|
+-- 02_implementation/
|   +-- progress.md
|   +-- completed_files.md
|   +-- subagent_tasks/
|   +-- PHASE_2_COMPLETE.md
|
+-- 03_compilation/
|   +-- build_log.md
|   +-- fixes_applied.md
|   +-- PHASE_3_COMPLETE.md
|
+-- 04_tests/
|   +-- test_plan.md
|   +-- test_results.md
|   +-- coverage_notes.md
|   +-- PHASE_4_COMPLETE.md
|
+-- 05_validation/
|   +-- [code-review-output]/
|   +-- acceptance_criteria_verification.md
|   +-- PHASE_5_COMPLETE.md
|
+-- 06_fixes/
|   +-- [fix-output]/
|   +-- PHASE_6_COMPLETE.md
|
+-- final_summary.md
```

---

## Git Workflow (MANDATORY)

### Branch Creation

Create a new feature branch before starting any implementation work:

```bash
git checkout -b feature/{task-slug}
```

### Commit Strategy

Commits are created at specific milestones, never for broken or incomplete code:

| When | What to Commit |
|------|----------------|
| After each completed batch (Phase 2) | All files created or modified in that batch |
| After successful compilation (Phase 3) | Any fix files applied during the compilation phase |
| After tests pass (Phase 4) | Test files and any source adjustments, if applicable |
| After all fixes applied (Phase 6) | Fix files and corrected source code |

**Prohibitions:**
- Do NOT commit code that does not compile.
- Do NOT commit incomplete implementations.
- Do NOT defer all commits to the final summary.

### Commit Message Format

```
feat({{COMMIT_PREFIX}}): [batch name] - [brief description]

[Detailed description of changes in this batch]

Files:
- Created: [list of created files with paths]
- Modified: [list of modified files with paths]
```

---

## Pre-Commit Code Review (MANDATORY)

Before creating ANY git commit, run the code-simplifier to review and clean up the staged changes.

### Invocation

```
Task tool:
  subagent_type: "code-simplifier"
  prompt: "Review and clean up the following files before commit:
    [list of files to be committed]

    Focus on:
    - Code clarity and readability
    - Consistent formatting and style
    - Removal of dead code, unused imports, and commented-out blocks
    - Simplification of unnecessarily complex expressions
    - Naming convention compliance
    - Guideline adherence per {{GUIDELINES_PATH}}"
```

### When to Run

- After each completed implementation batch.
- After compilation fix rounds.
- After test creation.
- After code review fix rounds.

**Do NOT proceed with the git commit until code-simplifier completes successfully.**

---

## Subagent Execution Strategy (MANDATORY)

Every phase and every task within a phase MUST be executed by a dedicated subagent with full context. This rule is defined in `01-operational-rules.md` Rule 3 and elaborated here with execution details.

### Model Requirement

ALL subagents MUST use **model: "opus"**. No exceptions.

### Invocation Template

```
Task tool:
  subagent_type: "[type]"
  model: "opus"
  prompt: "[full context prompt]"
```

### Context Requirements

Each subagent prompt MUST include:

| Element | Description |
|---------|-------------|
| Task description | What the subagent must accomplish, stated clearly |
| Relevant file paths | All files the subagent needs to read or modify |
| Dependencies | Outputs from previous tasks or phases that inform this work |
| Guidelines reference | Which sections of `{{GUIDELINES_PATH}}` apply to this task |
| Acceptance criteria | How the subagent should verify its own completion |
| Progress tracking file | Path to the `progress.md` file for status updates |

### Progress Tracking Protocol

The main orchestrator updates `progress.md` in real time:

1. **Before launching** a subagent: set task status to `IN_PROGRESS`.
2. **After subagent completes**: set task status to `COMPLETED` or `BLOCKED`.
3. **Status transitions:** `PENDING` -> `IN_PROGRESS` -> `COMPLETED` | `BLOCKED`.
4. **Never batch progress updates.** Each transition is recorded immediately.

---

## Phase Transition Verification (MANDATORY)

Before starting any phase (except Phase 1), the orchestrator MUST verify that the previous phase completed successfully.

### Verification Steps

1. **Check that the phase completion marker exists:**

| Transition | Required Marker |
|------------|-----------------|
| Phase 1 -> Phase 2 | `01_planning/PHASE_1_COMPLETE.md` |
| Phase 2 -> Phase 3 | `02_implementation/PHASE_2_COMPLETE.md` |
| Phase 3 -> Phase 4 | `03_compilation/PHASE_3_COMPLETE.md` |
| Phase 4 -> Phase 5 | `04_tests/PHASE_4_COMPLETE.md` |
| Phase 5 -> Phase 6 | `05_validation/PHASE_5_COMPLETE.md` |

2. **Check that `progress.md` reflects all tasks as COMPLETED for that phase.**

3. **If verification fails:** DO NOT proceed. Return to the incomplete phase and finish it.

### Phase Completion Marker Template

```markdown
# Phase [X]: [Name] - COMPLETE

**Completed:** [ISO 8601 timestamp]
**Duration:** [elapsed time]

## Summary
[Brief description of what was accomplished]

## Deliverables
- [List of files created or modified, with full paths]

## Status
All tasks completed successfully. Ready for Phase [X+1].
```

---

## Workflow Execution Order

Execute all 6 phases in strict sequential order. No phase may be skipped.

| Phase | Name | Purpose | Key Output |
|-------|------|---------|------------|
| 1 | Planning | Requirements analysis and architecture design | Planning documents in `01_planning/` |
| 2 | Implementation | Subagent-driven code creation (parallel and sequential batches) | Source files, `completed_files.md` |
| 3 | Compilation | Build verification and error resolution | Clean build, `build_log.md` |
| 4 | Tests | Test creation per policy (`{{TEST_POLICY}}`) | Test files, `test_results.md` |
| 5 | Validation | Code review via `/{{CODE_REVIEW_SKILL}}` | Review findings, AC verification |
| 6 | Fixes | Issue remediation via `/{{FIX_ISSUES_SKILL}}` | Corrected code, `final_summary.md` |

Each phase produces specific deliverables. Phase transition verification (see above) is mandatory between every pair of consecutive phases.
