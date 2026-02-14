# Phase 1: Planning

Reference module defining the planning phase for all implementation workflows. This phase analyzes requirements, designs architecture, produces user stories with acceptance criteria, and creates a detailed implementation plan with subtask breakdown.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

**Goal:** Transform a task description into a complete, actionable implementation plan.
**Execution:** 4 dedicated subagents (Explore, Plan, User Stories, Implementation Plan), plus 2 conditional steps.
**Model:** ALL subagents use `model: "opus"`.

---

## Pre-Phase: Read AI Index (MANDATORY)

Before starting any planning work, load relevant context from the symbolic AI code index.

1. Read `docs/ai-index/.skill/SKILL.md` for indexing instructions and conventions.
2. Based on the task type, read the appropriate index files:

| Task Involves | Index Files to Read |
|---------------|---------------------|
| New endpoint or API | `05_API_SURFACE`, `06_TYPE_SYSTEM`, `07_MIDDLEWARE_PIPELINE`, `04_DATA_LAYER` |
| New component or page | `02_STRUCTURE_TREE`, `06_TYPE_SYSTEM`, `04_STATE_MAP`, `05_ROUTES_MAP` |
| New service or logic | `02_STRUCTURE_TREE`, `06_TYPE_SYSTEM`, `08_BUSINESS_RULES` |
| Database change | `04_DATA_LAYER`, `06_TYPE_SYSTEM`, `03_DEPENDENCY_GRAPH` |
| Bug fix | `03_DEPENDENCY_GRAPH`, `08_BUSINESS_RULES` + relevant domain file |
| Refactor | `03_DEPENDENCY_GRAPH`, `01_SYMBOL_REGISTRY`, `12_KNOWLEDGE_GRAPH_SUMMARY` |

3. Use the index to understand existing architecture, patterns, naming conventions, and integration points before exploring the codebase.

---

## Step 1.1: Explore

**Progress update:** Mark "Phase 1.1: Explore" as `IN_PROGRESS`.

Launch a dedicated subagent to investigate the existing codebase and gather context for the task.

```
Task tool:
  subagent_type: "Explore"
  model: "opus"
  prompt: "Analyze the existing codebase for implementing: [task description]

  ## Investigation Scope
  {{EXPLORE_SCOPE}}

  ## Documentation
  - Use Context7 MCP to retrieve latest documentation for any libraries involved.
  - Read {{GUIDELINES_PATH}} to understand coding standards.

  ## Required Output
  Provide a detailed analysis covering:
  1. Similar features, components, or services that already exist (with file paths).
  2. Established patterns to follow (naming, structure, data flow).
  3. Components, services, hooks, or utilities available for reuse.
  4. Integration requirements with existing systems.
  5. Dependencies, relationships, and potential conflicts.
  6. Any constraints or limitations discovered during exploration.

  ## Output File
  Save the analysis to: [output_dir]/01_planning/requirements_analysis.md"
```

**Progress update:** Mark "Phase 1.1: Explore" as `COMPLETED`.
**Deliverable:** `01_planning/requirements_analysis.md`

---

## Step 1.1.5: UI/UX Design (CONDITIONAL)

**Gate:** Execute this step ONLY if `{{UI_DESIGN_STEP}}` is `true`. Skip entirely otherwise.

This step is mandatory for tasks that involve visual components, user interfaces, or interaction design.

### Invocation

```
Skill tool:
  skill: "frontend-design"
  args: "[task description] - create UI/UX design document"
```

### Design Document Requirements

- **Save to:** `01_planning/ui_ux_design.md`
- Maintain visual consistency with the existing application design language.
- Use Mantine components wherever applicable.
- Include specifications for: layout structure, spacing, color usage (Mantine CSS variables), interactive states (hover, focus, disabled, loading, error), responsive breakpoints, and accessibility considerations.

**Deliverable:** `01_planning/ui_ux_design.md`

---

## Step 1.1.6: Shared Components Check (CONDITIONAL)

**Gate:** Execute this step ONLY if `{{SHARED_COMPONENTS_CHECK}}` is `true`. Skip entirely otherwise.

**Reference:** `docs/guidelines/shared-components.md`

### Checklist

Before creating any new component, verify the following:

1. **Quick Reference:** Check the Quick Reference table in `shared-components.md` for an existing match.
2. **Directory Search:** Search existing shared component directories for similar functionality.
3. **Reuse Decision:**
   - If a matching component exists: USE it directly or EXTEND it with additional props.
   - If no match exists: CREATE a new component following the shared component guidelines.
4. **Document:** Record the decision (reuse, extend, or create) in the architecture design.

---

## Step 1.2: Architecture Design

**Progress update:** Mark "Phase 1.2: Architecture Design" as `IN_PROGRESS`.

Launch a dedicated subagent to design the technical architecture based on the exploration findings.

```
Task tool:
  subagent_type: "Plan"
  model: "opus"
  prompt: "Design the architecture for: [task description]

  ## Context from Step 1.1
  [Include the FULL content of requirements_analysis.md]

  ## Design Requirements
  {{DESIGN_REQUIREMENTS}}

  ## Required Output
  Provide a complete architecture design including:
  1. File structure with full paths for all new and modified files.
  2. Class, component, or module names with their responsibilities.
  3. Data flow diagrams (described textually or as ASCII).
  4. Dependency relationships between new and existing modules.
  5. API contracts (request/response shapes, endpoints, methods).
  6. State management approach (if applicable).
  7. Error handling strategy.
  8. Compliance notes against {{GUIDELINES_PATH}}.

  ## Output File
  Save the design to: [output_dir]/01_planning/architecture_design.md"
```

**Progress update:** Mark "Phase 1.2: Architecture Design" as `COMPLETED`.
**Deliverable:** `01_planning/architecture_design.md`

---

## Step 1.3: User Stories and Acceptance Criteria

**Progress update:** Mark "Phase 1.3: User Stories & AC" as `IN_PROGRESS`.

Launch a dedicated subagent to define user stories and testable acceptance criteria.

```
Task tool:
  subagent_type: "requirements-analyst"
  model: "opus"
  prompt: "Create User Stories and Acceptance Criteria for: [task description]

  ## Context from Previous Steps

  ### Requirements Analysis
  [Include the FULL content of requirements_analysis.md]

  ### Architecture Design
  [Include the FULL content of architecture_design.md]

  ## User Story Format

  For each story:
  - US-[N]: As a [role], I want [capability], so that [benefit].
  - Priority: [HIGH | MEDIUM | LOW]
  - Related architecture components: [list]

  ## Acceptance Criteria Format

  For each criterion:
  - AC-[N]: Given [precondition], When [action], Then [expected outcome].
  - Linked to: US-[N]
  - Testable: Yes

  ## Guidelines

  - Each acceptance criterion must be independently verifiable.
  - Cover both success paths and error/failure scenarios.
  - Address edge cases, boundary conditions, and empty states.
  - Each AC should map to at least one test case (when tests are created).
  - Include accessibility requirements where relevant.

  ## Output Files
  1. Save user stories to: [output_dir]/01_planning/user_stories.md
  2. Save acceptance criteria to: [output_dir]/01_planning/acceptance_criteria.md"
```

**Progress update:** Mark "Phase 1.3: User Stories & AC" as `COMPLETED`.
**Deliverables:** `01_planning/user_stories.md`, `01_planning/acceptance_criteria.md`

---

## Step 1.4: Implementation Plan and Subtask Breakdown

**Progress update:** Mark "Phase 1.4: Implementation Plan" as `IN_PROGRESS`.

Launch a dedicated subagent to produce a detailed, dependency-aware implementation plan with individual subtask definitions.

```
Task tool:
  subagent_type: "requirements-analyst"
  model: "opus"
  prompt: "Create an Implementation Plan and Subtask Breakdown for: [task description]

  ## Context from All Previous Steps
  [Include the FULL content of requirements_analysis.md, architecture_design.md,
   user_stories.md, and acceptance_criteria.md]

  ## Implementation Plan Structure

  ### Task Definitions
  For each task, specify:
  - Task ID (e.g., T-1, T-2)
  - Task name
  - Priority (1 = highest)
  - Complexity (Low / Medium / High)
  - Files to create or modify (full absolute paths)
  - Dependencies (which tasks must complete first, by ID)
  - Linked acceptance criteria (by AC ID)
  - Estimated effort (relative, e.g., S / M / L)

  ### Dependency Graph
  Show which tasks can execute in parallel versus which require sequential ordering.
  Use a clear notation:
  - T-1, T-2 (parallel, no dependencies)
  - T-3 -> T-1 (T-3 depends on T-1)

  ### Execution Batches
  Group tasks into batches based on the dependency graph:
  - Batch 1: Tasks with no dependencies (can run in parallel)
  - Batch 2: Tasks depending only on Batch 1 completions
  - Batch 3: Tasks depending on Batch 1 and Batch 2
  - Continue until all tasks are assigned to a batch

  ## Subtask Breakdown

  For EACH task, create a subtask definition file containing:
  - File path: 02_implementation/subagent_tasks/task_[batch]_[seq]_[name].md
  - Subagent type: {{IMPLEMENTER_AGENT}}
  - Model: opus
  - Files to create or modify (full paths)
  - Template and guideline references (specific sections of {{GUIDELINES_PATH}})
  - Example files in the codebase to use as reference
  - Compliance checklist (items from {{COMPLIANCE_CHECKLIST}})
  - Completion criteria (how the subagent verifies it is done)

  ## Output Files
  1. Save implementation plan to: [output_dir]/01_planning/implementation_plan.md
  2. Save subtask breakdown to: [output_dir]/01_planning/subtask_breakdown.md"
```

**Progress update:** Mark "Phase 1.4: Implementation Plan" as `COMPLETED`.
**Deliverables:** `01_planning/implementation_plan.md`, `01_planning/subtask_breakdown.md`

---

## Phase 1 Deliverables Summary

| File | Purpose |
|------|---------|
| `requirements_analysis.md` | What to build -- exploration findings and context |
| `architecture_design.md` | How to structure -- technical design and file layout |
| `ui_ux_design.md` | How it looks -- visual design (conditional, when `UI_DESIGN_STEP` is true) |
| `user_stories.md` | Who benefits -- user-facing stories with priorities |
| `acceptance_criteria.md` | How to verify -- testable criteria linked to stories |
| `implementation_plan.md` | Execution order -- tasks, dependencies, and batches |
| `subtask_breakdown.md` | Subagent assignments -- detailed task definitions |

---

## Phase Completion

After all steps are finished, create the phase completion marker:

**File:** `01_planning/PHASE_1_COMPLETE.md`

```markdown
# Phase 1: Planning - COMPLETE

**Completed:** [ISO 8601 timestamp]
**Duration:** [elapsed time]

## Summary
[Brief description of the planning outcomes and key decisions]

## Deliverables
- 01_planning/requirements_analysis.md
- 01_planning/architecture_design.md
- 01_planning/ui_ux_design.md (if applicable)
- 01_planning/user_stories.md
- 01_planning/acceptance_criteria.md
- 01_planning/implementation_plan.md
- 01_planning/subtask_breakdown.md

## Key Decisions
- [List significant architectural or design decisions made during planning]

## Risks and Mitigations
- [Any identified risks and their proposed mitigations]

## Status
All planning tasks completed successfully. Ready for Phase 2: Implementation.
```
