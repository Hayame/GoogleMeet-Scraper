# Operational Rules

Reference module defining mandatory behavioral rules for all implementation workflows. These rules are stack-agnostic and apply identically to frontend and backend skills.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Rule 1: Ask Questions Until Everything Is Clear

**Status:** MANDATORY -- no exceptions.

If ANY aspect of the task is unclear, ambiguous, or could be interpreted in more than one way, you must stop and ask before writing a single line of implementation code.

### Procedure

1. **STOP** before proceeding with implementation.
2. **ASK** clarifying questions using the `AskUserQuestion` tool.
3. **WAIT** for the user's response.
4. **REPEAT** steps 1-3 until every requirement is unambiguous.

### What Requires Clarification

- Vague or incomplete requirements, acceptance criteria, or success metrics.
- Ambiguous business logic, expected behavior, or UI/UX expectations.
- Missing information about entities, components, interactions, data flows, or error handling.
- Edge cases, boundary conditions, or failure modes not addressed in the task description.
- Naming conventions, design patterns, or architectural decisions not covered by `{{GUIDELINES_PATH}}`.
- Integration points with existing code, APIs, or third-party services.
- Performance expectations, data volume assumptions, or concurrency requirements.

### Prohibition

**DO NOT assume or guess.** It is always better to ask ten questions than to implement the wrong thing. Assumptions lead to rework; questions lead to correctness.

---

## Rule 2: Context Limit Management (90% Rule)

**Status:** MANDATORY -- context exhaustion causes silent failures.

Monitor context window usage throughout the implementation session. Claude does not receive an explicit percentage indicator, but the following heuristics apply: if the conversation has been running for a long time, if many large files have been read, or if multiple phases have been completed, assume context pressure is high.

### Threshold Actions

**At approximately 85% context usage:**
- Do NOT start a new phase or a new batch of tasks.
- Finish the current task or subtask you are actively working on.
- Prepare to hand off.

**At approximately 90% context usage:**

1. **COMPLETE** the current task or subtask (do not leave partial work).
2. **STOP** immediately after that task is done.
3. **SAVE** detailed progress to `progress.md` in the run output directory.
4. **NOTIFY** the user with the following message:

> Approaching 90% context limit. Current task completed and progress saved. Please clear context and use `/{{RESUME_SKILL}}` to continue from where I left off.

### Progress Save Requirements

The `progress.md` file must include:

| Section | Content |
|---------|---------|
| Completed Phases | List of phases fully finished, with timestamps |
| Completed Tasks | List of individual tasks done in the current phase |
| Current Phase | Phase number, name, and percentage complete |
| Current Task | Task ID, name, and what remains |
| Next Steps | Ordered list of actions to take after resume |
| Blockers | Any unresolved issues, questions, or dependencies |
| Files Modified | Full paths of all files created or changed in this session |
| Git Status | Current branch name and last commit hash |

### Prohibition

**DO NOT start a new task or phase if context usage is above 85%.** Complete current work, save, and stop.

---

## Rule 3: Dedicated Subagent Per Task (Absolute Requirement)

**Status:** CRITICAL -- non-negotiable under any circumstances.

Every defined implementation task MUST be executed by a dedicated subagent launched via the Task tool. The main orchestrator thread exists solely for coordination, never for implementation.

### Main Orchestrator Responsibilities (Permitted Actions)

- Coordination, sequencing, and progress tracking.
- Launching subagents via the Task tool.
- Updating `progress.md` and `completed_files.md`.
- Phase transitions and verification gate checks.
- Reading files to gather context for subagent prompts.
- Creating and updating planning documents.

### Main Orchestrator Prohibitions (Forbidden Actions)

- Writing implementation code using Edit or Write tools.
- Creating source files with application logic.
- Fixing compilation or lint errors directly.
- Creating or modifying test files.
- ANY work that produces or alters implementation artifacts.

### Required Workflow

```
Main Orchestrator                         Subagent (Task tool)
      |                                          |
      |-- Update progress.md (IN_PROGRESS) ----->|
      |                                          |
      |-- Launch Task tool ---------------------->|
      |     subagent_type: [specialized agent]     |
      |     model: "opus"                         |
      |     prompt: [full context]                | Execute implementation
      |                                          | (Read, Edit, Write)
      |                                          |
      |<-- Subagent completes -------------------|
      |                                          |
      |-- Update progress.md (COMPLETED) ------->|
      |                                          |
      |-- Proceed to next task ----------------->|
```

### Self-Check Protocol

Before performing ANY action, the orchestrator must answer these questions:

1. Am I about to use the Edit or Write tool on a source or test file? **STOP. Launch a subagent.**
2. Am I about to fix a compilation, lint, or runtime error directly? **STOP. Launch a subagent.**
3. Am I about to create or modify a test file? **STOP. Launch a subagent.**
4. Is this coordination, tracking, or planning work only? **Proceed in the main thread.**

### Consequence

Violating this rule constitutes an implementation failure. There are NO exceptions, regardless of task size, urgency, or simplicity. Even a one-line change must go through a subagent.
