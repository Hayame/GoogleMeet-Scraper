# Execute Task - Universal Task Router

**Purpose:** Automatyczne rozpoznanie typu zadania (kontekstowe!) i routing do odpowiedniego workflow

**Tech Stack:**
- Backend: .NET 10, C# 12, Entity Framework Core, Wolverine, PostgreSQL
- Frontend: React 19, TypeScript, Vite, Mantine, CSS Modules, Zustand

**Guidelines:**
- Backend: `docs/guidelines/backend.md`
- Frontend: `docs/guidelines/frontend.md`

**Usage:**
```bash
/execute-task "implement user authentication API endpoint"
/execute-task "ostyluj stronę logowania według designu"
/execute-task "dodaj funkcję eksportu zadań do PDF"
/execute-task docs/tasks/some-feature.md
```

**Output:** Depends on task type
- Backend: `.claude/backend-implementation/{timestamp}_{slug}/`
- Frontend: `.claude/frontend-implementation/{timestamp}_{slug}/`
- Mixed: Both directories + `.claude/execute-task/{timestamp}_{slug}/`
- General: `.claude/execute-task/{timestamp}_{slug}/`

**Task Types:**
- BACKEND - Server-side changes only
- FRONTEND - Client-side changes only
- MIXED - Changes in both layers (auto-split)
- GENERAL - Non-code tasks (docs, analysis, config)

---

## Instruction

You are a task router that analyzes tasks and delegates them to appropriate implementation workflows.

**Task:** $ARGUMENTS

---

## Step 1: Parse Input

**If $ARGUMENTS is a file path** (contains `/` or ends with `.md`):
1. Read file using Read tool
2. Extract task description from content
3. Use filename or first heading as task name
4. Generate task slug from filename/heading

**If $ARGUMENTS is a string:**
1. Use directly as task description
2. Extract task name from first 5-10 words
3. Generate task slug from task name

**Task Slug Rules:**
- Lowercase
- Spaces → underscores
- Max 50 characters
- Remove special characters

---

## Step 2: Create Base Output Directory

```bash
# Format: .claude/execute-task/{timestamp}_{task_slug}/
# Timestamp: YYYYMMDD_HHMMSS (e.g., 20260112_150000)
```

Create initial files:
- `00_task_description.md` - Original task description

---

## Step 3: Contextual Analysis (Explore Agent)

**CRITICAL:** Do NOT rely only on keyword matching. Use Explore Agent for intelligent context analysis.

**Launch Explore Agent with prompt:**

```markdown
Analyze this task description to determine what type of implementation is required in the GeoMarkup application.

**Task Description:**
[INSERT TASK DESCRIPTION HERE]

**Application Context:**
- Backend: .NET 10 + Entity Framework Core + Wolverine CQRS + PostgreSQL
  - Location: backend/GeoMarkup.*/
  - Patterns: Clean Architecture, DDD, Minimal API

- Frontend: React 19 + TypeScript + Vite + Mantine + CSS Modules
  - Location: src/
  - Patterns: Functional components, Zustand state, CSS Modules

**Analyze and determine:**

1. **What layers does this task affect?**
   - Backend only (API, database, services, authentication, business logic)
   - Frontend only (UI, components, styling, user interactions, state)
   - Both layers (full-stack feature)
   - Neither (documentation, DevOps, configuration, analysis)

2. **What specific work is required?**
   - Backend: List specific components (entities, repositories, handlers, endpoints)
   - Frontend: List specific components (components, hooks, styles, store changes)

3. **If both layers are affected, can the task be split?**
   - Identify clear separation points
   - Determine dependencies (does frontend need backend API first?)
   - List backend subtasks
   - List frontend subtasks

**Output format (STRICT):**

```
## Classification Result

**Primary Type:** [BACKEND | FRONTEND | MIXED | GENERAL]
**Confidence:** [HIGH | MEDIUM | LOW]

### Backend Scope
[Description of backend work required, or "None"]

### Frontend Scope
[Description of frontend work required, or "None"]

### Subtasks (if MIXED)

**Backend Subtasks (Execute First):**
1. [subtask description]
2. [subtask description]

**Frontend Subtasks (Execute After Backend):**
1. [subtask description]
2. [subtask description]

**Note:** For MIXED tasks, execution order is ALWAYS Backend → Frontend.
Frontend depends on backend API endpoints and data models.
```
```

**Save Explore Agent output to:** `00_task_classification.md`

---

## Step 4: Classification Decision

Based on Explore Agent output:

### If Confidence is HIGH:
- Use the Primary Type directly

### If Confidence is MEDIUM or LOW:
- Use keyword scoring as tiebreaker

**Backend Keywords (case-insensitive):**
```
dotnet, .net, c#, csharp, api, endpoint, entity, repository,
wolverine, keycloak, postgresql, postgres, migration, domain,
infrastructure, ef core, entity framework, handler, cqrs,
minimal api, service, backend, server, database, dto, query,
command, aggregate, value object
```

**Frontend Keywords (case-insensitive):**
```
react, typescript, component, hook, css, mantine, maplibre,
zustand, vite, ui, form, modal, sidebar, panel, button,
frontend, client, browser, tsx, jsx, styled, theme, layout,
responsive, animation, store, state, reducer, style, design,
color, page, view, screen, input, checkbox, dropdown
```

**Scoring:**
1. Count backend keyword matches → backend_score
2. Count frontend keyword matches → frontend_score
3. If backend_score > frontend_score by 2+ → BACKEND
4. If frontend_score > backend_score by 2+ → FRONTEND
5. If scores are close and both > 0 → Use AskUserQuestion

### If still unclear:
Use AskUserQuestion tool:
```
Question: "Jakiego typu jest to zadanie?"
Options:
- Backend (API, baza danych, serwisy)
- Frontend (UI, komponenty, style)
- Mixed (wymaga zmian w obu warstwach)
- General (dokumentacja, analiza, konfiguracja)
```

---

## Step 5: Route to Appropriate Workflow

### BACKEND Tasks

1. Display classification:
   ```
   📊 Task Classification: BACKEND
   📁 Routing to: /backend:start-task
   ```

2. Invoke `/backend:start-task` with original $ARGUMENTS:
   ```
   /backend:start-task $ARGUMENTS
   ```

3. **EXIT** - Let backend:start-task handle everything

---

### FRONTEND Tasks

1. Display classification:
   ```
   📊 Task Classification: FRONTEND
   📁 Routing to: /frontend:start-task
   ```

2. Invoke `/frontend:start-task` with original $ARGUMENTS:
   ```
   /frontend:start-task $ARGUMENTS
   ```

3. **EXIT** - Let frontend:start-task handle everything

---

### MIXED Tasks

**CRITICAL RULE:** Frontend ALWAYS depends on Backend (API endpoints, data models, services).
**Execution Order:** ALWAYS Backend first, then Frontend. No exceptions.

1. Display classification:
   ```
   📊 Task Classification: MIXED
   📁 Creating split plan...
   ⚠️ Execution Order: BACKEND → FRONTEND (frontend depends on backend API)
   ```

2. Create `00_task_split.md`:
   ```markdown
   # Task Split Plan

   **Original Task:** [description]
   **Execution Order:** BACKEND_FIRST (MANDATORY - frontend depends on backend)

   ## Backend Subtasks (Execute First)
   1. [subtask from classification]
   2. [subtask from classification]

   ## Frontend Subtasks (Execute After Backend)
   1. [subtask from classification]
   2. [subtask from classification]

   ## Execution Plan

   ### Phase 1: Backend Implementation (FIRST)
   Command: /backend:start-task "[combined backend subtasks]"
   Reason: Frontend requires API endpoints and data models from backend

   ### Phase 2: Frontend Implementation (AFTER BACKEND COMPLETES)
   Command: /frontend:start-task "[combined frontend subtasks]"
   Reason: Can now integrate with backend API
   ```

3. Execute in STRICT order (BACKEND → FRONTEND):

   **Step 5.1: Backend Phase (ALWAYS FIRST)**
   ```
   🔧 Phase 1/2: Starting Backend Implementation...
   /backend:start-task "[backend subtasks combined into description]"
   ```

   **WAIT for backend completion before proceeding.**
   Verify: Backend build succeeds, tests pass, API endpoints available.

   **Step 5.2: Frontend Phase (ONLY AFTER BACKEND)**

   **CRITICAL:** Frontend phase MUST follow the complete `/frontend:start-task` workflow:
   - All 6 phases (Planning → Implementation → Compilation → Tests → Validation → Fixes)
   - Full compliance with `docs/guidelines/frontend.md`
   - Pre-commit code review with code-simplifier
   - Progress tracking in `.claude/frontend-implementation/{timestamp}_{slug}/`

   ```
   🎨 Phase 2/2: Starting Frontend Implementation...
   /frontend:start-task "[frontend subtasks combined into description]"
   ```

   Wait for completion.

### Context-Aware Continuation (MANDATORY)

**RULE:** After backend phase completes successfully, IMMEDIATELY assess context usage:

1. **If context < 70%:**
   - Proceed directly to frontend phase WITHOUT waiting for user
   - Display: "✅ Backend complete. Context at X%. Continuing to frontend..."
   - Execute `/frontend-implementation` automatically

2. **If context 70-85%:**
   - Proceed to frontend phase BUT monitor closely
   - Display: "⚠️ Backend complete. Context at X%. Starting frontend with monitoring..."
   - If context reaches 90% during frontend, follow 90% Rule

3. **If context > 85%:**
   - STOP and save progress
   - Display: "⚠️ Backend complete. Context at X%. Too high for frontend. Save progress and resume with `/frontend:resume-task`"
   - Create detailed handoff document in `00_frontend_handoff.md`

4. Create `final_summary.md` with combined results

---

### GENERAL Tasks

Execute 4-phase internal workflow (see below).

---

## Phase 1: Planning (GENERAL Tasks Only)

**Goal:** Analyze requirements and create execution plan

### Step 1.1: Launch Explore Agent

**Agent Type:** `Explore`

**Agent Prompt:**
```markdown
Analyze this general task and understand what needs to be done:

**Task:** [task description]

**Investigate:**
1. What files/areas of the project are involved?
2. What are the dependencies?
3. What tools/commands will be needed?
4. Are there existing patterns to follow?

**Provide:**
- Detailed analysis of what the task requires
- List of files to create/modify
- Potential challenges
- Recommended approach
```

**Save output:** `01_planning/requirements_analysis.md`

### Step 1.2: Launch Plan Agent

**Agent Type:** `Plan`

**Agent Prompt:**
```markdown
Create an action plan for this task:

**Task:** [task description]
**Analysis:** [from requirements_analysis.md]

**Create:**
1. Step-by-step action plan
2. Acceptance criteria (measurable)
3. Subtask breakdown for subagents (if applicable)
```

**Save outputs:**
- `01_planning/action_plan.md`
- `01_planning/acceptance_criteria.md`
- `01_planning/subtask_breakdown.md` (if subagents needed)

### Step 1.3: Create Phase Marker

Create `01_planning/PHASE_1_COMPLETE.md`:
```markdown
# Phase 1: Planning - COMPLETE

**Completed:** [timestamp]

## Summary
[Brief summary]

## Deliverables
- requirements_analysis.md
- action_plan.md
- acceptance_criteria.md
- subtask_breakdown.md (if applicable)

## Status
✅ Ready for Phase 2
```

---

## Phase 2: Execution (GENERAL Tasks Only)

**Goal:** Execute the plan using subagents where applicable

### Step 2.1: Prepare Execution

Read `01_planning/action_plan.md` and identify tasks.

### Step 2.2: Execute Tasks

**If subagents needed** (from subtask_breakdown.md):

For each subtask:
1. Create task file in `02_execution/subagent_tasks/task_N.md`
2. Launch appropriate subagent:
   - `frontend-implementer` for frontend implementation tasks
   - `backend-implementer` for backend implementation tasks
   - `fullstack-developer` for mixed implementation tasks
   - `general-purpose` for research/analysis tasks
3. Track progress in `02_execution/progress.md`

**If no subagents needed:**
1. Execute tasks directly
2. Update progress after each step

### Step 2.3: Track Progress

Maintain `02_execution/progress.md`:
```markdown
# Execution Progress

## [HH:MM] Task 1: [name]
Status: ✅ COMPLETED
Output: [description or file reference]

## [HH:MM] Task 2: [name]
Status: 🔄 IN PROGRESS
Notes: [current status]
```

### Step 2.4: Track Files

Maintain `02_execution/completed_files.md`:
```markdown
# Completed Files

## Created
- [file path]

## Modified
- [file path]
```

### Step 2.5: Create Phase Marker

Create `02_execution/PHASE_2_COMPLETE.md`:
```markdown
# Phase 2: Execution - COMPLETE

**Completed:** [timestamp]

## Summary
[What was accomplished]

## Tasks Completed
1. [task] - ✅
2. [task] - ✅

## Files Changed
- Created: [count]
- Modified: [count]

## Status
✅ Ready for Phase 3
```

---

## Phase 3: Validation (GENERAL Tasks Only)

**Goal:** Verify acceptance criteria are met

### Step 3.1: Check Acceptance Criteria

Read `01_planning/acceptance_criteria.md` and verify each criterion:

```markdown
# Validation Report

## Acceptance Criteria Check

### Criterion 1: [name]
- Expected: [what was expected]
- Actual: [what was delivered]
- Status: ✅ PASS / ❌ FAIL

### Criterion 2: [name]
...
```

### Step 3.2: Document Issues

If any issues found, create `03_validation/issues_found.md`:
```markdown
# Issues Found

## Issue 1: [name]
- Severity: [HIGH/MEDIUM/LOW]
- Description: [what's wrong]
- Resolution: [how to fix]
```

### Step 3.3: Create Validation Report

Save to `03_validation/validation_report.md`

### Step 3.4: Create Phase Marker

Create `03_validation/PHASE_3_COMPLETE.md`:
```markdown
# Phase 3: Validation - COMPLETE

**Completed:** [timestamp]

## Summary
[Validation summary]

## Results
- Criteria Passed: [count]
- Criteria Failed: [count]
- Issues Found: [count]

## Status
✅ Ready for Phase 4
```

---

## Phase 4: Documentation (GENERAL Tasks Only)

**Goal:** Create final summary and documentation

### Step 4.1: Create Final Summary

Generate `final_summary.md`:

```markdown
# Task Execution Summary

**Task:** [description]
**Type:** GENERAL
**Started:** [timestamp]
**Completed:** [timestamp]
**Status:** ✅ COMPLETED

---

## Results

### Files Created
[List from completed_files.md]

### Files Modified
[List from completed_files.md]

---

## Phase Summary

### Phase 1: Planning
✅ Requirements analyzed
✅ Action plan created
✅ Acceptance criteria defined

### Phase 2: Execution
✅ [count] tasks completed
✅ [count] files created/modified

### Phase 3: Validation
✅ All acceptance criteria passed
[or: ⚠️ X issues identified]

### Phase 4: Documentation
✅ Summary generated

---

## Acceptance Criteria Results

| Criterion | Status |
|-----------|--------|
| [name] | ✅ PASS |
| [name] | ✅ PASS |

---

## Deliverables

1. [Main deliverable]
2. [Secondary deliverable]

---

## Next Steps (if any)

- [Recommendation 1]
- [Recommendation 2]
```

### Step 4.2: Create Phase Marker

Create `04_documentation/PHASE_4_COMPLETE.md`

### Step 4.3: Console Output

Print summary to console:
```
🎉 Task Execution COMPLETED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: [description]
Type: GENERAL
Output: .claude/execute-task/{timestamp}_{slug}/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE RESULTS:

✅ Planning        - Requirements + action plan
✅ Execution       - [X] tasks completed
✅ Validation      - All criteria passed
✅ Documentation   - Summary generated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Full Summary: final_summary.md
```

---

## Error Handling

### Explore Agent Returns Unclear Result
- Fall back to keyword scoring
- If still unclear, use AskUserQuestion

### Subagent Fails
- Log error in progress.md
- Attempt manual resolution
- If critical, ask user for guidance

### Acceptance Criteria Not Met
- Document in issues_found.md
- Attempt resolution
- Report to user if cannot resolve

### File Path Invalid
- Display clear error message
- Ask user to verify path

---

## Tips & Best Practices

### Task Classification
- Trust Explore Agent for context understanding
- Keywords are fallback, not primary method
- When in doubt, ask user

### Mixed Tasks
- Always execute backend first if frontend depends on API
- Can parallelize if truly independent
- Document split clearly

### General Tasks
- Use subagents for implementation work
- Track progress diligently
- Verify all acceptance criteria

### Quality
- Every phase must have PHASE_X_COMPLETE.md
- Progress tracking is mandatory
- Final summary is always required
