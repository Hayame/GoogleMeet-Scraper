# Phase 2: Implementation

Reference module defining the implementation phase for all workflows. This phase transforms the planning artifacts from Phase 1 into working code through dependency-aware subagent coordination.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Overview

**Goal:** Execute implementation using dependency-aware subagent coordination
**Execution:** 1 dedicated subagent PER TASK (not per batch)
**Model:** ALL subagents use `model: "opus"`

**CRITICAL:** Each task MUST be executed by a dedicated subagent with FULL context. The main orchestrator thread is forbidden from writing implementation code directly (see `01-operational-rules.md`, Rule 3).

---

## Step 2.1: Prepare Task Files

For EACH task listed in `01_planning/subtask_breakdown.md`, create a task file in `02_implementation/subagent_tasks/`.

**Naming Convention:** `task_X_Y_short_name.md` where X is the batch number and Y is the task number within that batch.

**Minimal Task File Template:**

```markdown
# Task X.Y: [Name]

**Status:** PENDING | IN_PROGRESS | COMPLETED
**Subagent:** {{IMPLEMENTER_AGENT}}
**Model:** opus

## Objective
[1-2 sentences copied from subtask_breakdown.md]

## Files
- [absolute file path 1] - [create/modify]
- [absolute file path 2] - [create/modify]

## Dependencies
- [Task X.Z - must complete first] (or "None")

## Acceptance Criteria
- [Specific, verifiable criterion from planning]

## Execution Log
- Created: [ISO timestamp]
- Started: [ISO timestamp]
- Completed: [ISO timestamp]
- Files Created: [list]
- Files Modified: [list]
```

---

## Step 2.1.5: Verify Task Files (BLOCKING GATE)

**GATE CHECK -- DO NOT PROCEED WITHOUT COMPLETING ALL ITEMS:**

1. Create all task files for the current batch.
2. VERIFY file existence: `ls -la 02_implementation/subagent_tasks/task_*.md` shows all expected files.
3. VERIFY each file contains: Objective, Files, Dependencies, Acceptance Criteria.
4. IF any file is missing or incomplete, CREATE or FIX it before continuing.

**DO NOT proceed to Step 2.2 until every task file for the current batch exists and is complete.**

---

## Step 2.2: Execute Tasks with Dedicated Subagents (BLOCKING GATE)

**BLOCKING RULE:** You MUST use the Task tool to launch subagents. DO NOT implement directly. This is a non-negotiable requirement from `01-operational-rules.md`, Rule 3.

### Per-Task Execution Flow

```
FOR EACH TASK in current batch (respecting dependency order):
  1. READ task file from 02_implementation/subagent_tasks/
  2. UPDATE progress.md: Mark task as IN_PROGRESS with timestamp
  3. LAUNCH subagent via Task tool with full context
  4. WAIT for subagent completion
  5. VERIFY task file has been updated with Completed timestamp
  6. UPDATE progress.md: Mark task as COMPLETED with timestamp
  7. UPDATE completed_files.md: Add all created/modified files
  8. PROCEED to next task
```

### Subagent Launch Template

For EACH task, launch a dedicated subagent:

1. **Update progress:** Mark task as IN_PROGRESS in `progress.md`.

2. **Launch dedicated subagent:**

```
Task tool:
  subagent_type: "{{IMPLEMENTER_AGENT}}"
  model: "opus"
  prompt: "Execute Task X.Y: [Task Name]

## Full Context

### Task Description
[Copy FULL task description from subtask_breakdown.md -- do not summarize]

### Files to Create/Modify
[List all files with ABSOLUTE paths]

### Dependencies (Previous Task Outputs)
[List files created by dependency tasks that this task needs to read or extend]

### Guidelines Reference
- Read: {{GUIDELINES_PATH}} Section [relevant section]
- Example pattern: [path to existing file demonstrating the expected pattern]

### Compliance Checklist
{{COMPLIANCE_CHECKLIST}}

### Acceptance Criteria
[Copy verbatim from task file]

### Progress Tracking
Update task file: 02_implementation/subagent_tasks/task_X_Y_name.md
- Set Status to COMPLETED
- Fill in Started and Completed timestamps
- List all Files Created and Files Modified

### Output Requirements
- Create/modify all specified files
- Update task file with execution log
- Report completion status including any issues encountered"
```

3. **Wait for completion.**
4. **Update progress:** Mark as COMPLETED in `progress.md`.
5. **Verify files exist:** Confirm all files listed in the task specification were created or modified.

### Parallel vs Sequential Execution

- Tasks WITHOUT dependencies on each other: Launch in parallel when possible.
- Tasks WITH dependencies: Wait for all dependency tasks to complete first.
- ALWAYS update `progress.md` after EACH subagent completes, regardless of execution mode.

---

## Step 2.2.5: Post-Task Verification (AFTER EACH SUBAGENT)

**BLOCKING CHECKLIST -- all items must pass before proceeding to the next task:**

| Check | How to Verify | Action on Failure |
|-------|---------------|-------------------|
| Task file updated | Read task file, confirm Completed timestamp present | Update manually or re-run subagent |
| Progress reflects completion | Read `progress.md`, confirm COMPLETED status | Update `progress.md` |
| Created files exist | Verify each file path from the task specification | Re-run subagent with error context |
| No partial implementations | Verify each acceptance criterion is addressed | Re-run subagent or launch fix subagent |

**IF ANY CHECK FAILS:** Resolve the issue before proceeding to the next task.

---

## Step 2.3: Update Completed Files List (BLOCKING GATE)

After each batch completes, update `02_implementation/completed_files.md`.

**Template:**

```markdown
# Completed Files

**Last Updated:** [ISO timestamp]

## Batch 1: [Batch Name]

### Created Files
- `path/to/file` - [Brief description of purpose]

### Modified Files
- `path/to/file` - [What changed and why]

## Batch 2: [Batch Name]

### Created Files
- `path/to/file` - [Brief description of purpose]

### Modified Files
- `path/to/file` - [What changed and why]
```

---

## Step 2.4: Batch Completion Gate

**All checks must pass before starting the next batch:**

| Check | Command | Expected Result |
|-------|---------|-----------------|
| All task files updated | Verify COMPLETED status in all batch task files | All tasks show COMPLETED |
| Progress current | Verify batch section in `progress.md` | Batch marked complete |
| Completed files listed | Verify batch section in `completed_files.md` | All files documented |
| Code compiles | `{{BUILD_CMD}}` | 0 errors |

**Git Commit after batch passes:**

1. Run code-simplifier on all changed files.
2. Stage and commit with message: `feat({{COMMIT_PREFIX}}): implement batch N - [batch description]`

---

## Progress.md Structure (MANDATORY)

The `progress.md` file must be maintained in real time throughout Phase 2. It serves as the single source of truth for implementation status.

```markdown
# Implementation Progress

**Task:** [task description from planning]
**Started:** [ISO timestamp]
**Current Phase:** Phase 2 - Implementation

---

## Batch 1: [Batch Name]

### Task 1.1: [Task Name]
**Status:** PENDING | IN_PROGRESS | COMPLETED | BLOCKED
**Started:** [HH:MM]
**Completed:** [HH:MM]

**Subtasks:**
- [x] Read existing patterns and dependencies
- [ ] Create file structure
- [ ] Implement core logic
- [ ] Update task file with results

**Files Created/Modified:**
- `path/to/file` - Created
- `path/to/other` - Modified

### Task 1.2: [Task Name]
**Status:** PENDING
...

---

## Batch 2: [Batch Name]

### Task 2.1: [Task Name]
**Status:** PENDING
...

---

## Summary

| Batch | Tasks | Completed | In Progress | Blocked |
|-------|-------|-----------|-------------|---------|
| 1     | 3     | 2         | 1           | 0       |
| 2     | 2     | 0         | 0           | 0       |
| Total | 5     | 2         | 1           | 0       |
```

---

## Phase 2 Deliverables

| Artifact | Location | Purpose |
|----------|----------|---------|
| `progress.md` | `02_implementation/` | Real-time task tracking |
| `completed_files.md` | `02_implementation/` | Complete file change manifest |
| `subagent_tasks/*.md` | `02_implementation/subagent_tasks/` | Individual task specifications with execution logs |
| `PHASE_2_COMPLETE.md` | `02_implementation/` | Phase completion marker |

**Phase completion:** Create `02_implementation/PHASE_2_COMPLETE.md` with a summary of all batches, total files created/modified, and any notes for subsequent phases.
