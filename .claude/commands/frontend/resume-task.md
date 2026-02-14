# Resume Frontend Implementation

**Purpose:** Continue interrupted frontend implementation from last completed phase

**Tech Stack:**
- React 19 + TypeScript 5.7
- Vite 6 + Mantine 8
- Zustand 5 + Immer
- CSS Modules + MapLibre GL
- Vitest + React Testing Library

**Guidelines:**
- `docs/guidelines/frontend.md` — React/TypeScript coding standards
- `docs/guidelines/frontend-stack.md` — Full technology stack details

**Usage:**
```bash
/frontend:resume-task .claude/frontend-implementation/20260106_150000_task_badge/
/frontend:resume-task path/to/implementation/
```

**Output:** Updates existing implementation directory (NO new directory created)

**Note:** The `.claude` directory is at the project root level (same level as `src/`).

**Workflow:** Detects last completed phase → Resumes from next phase → Continues normal workflow

**See Also:** `/frontend:start-task` (create new implementation)

---

## Config Block

| Parameter | Value |
|-----------|-------|
| STACK_ID | "frontend" |
| STACK_NAME | "React 19 + TypeScript 5.7" |
| GUIDELINES_PATH | "docs/guidelines/frontend.md" |
| BUILD_CMD | "npx tsc --noEmit --skipLibCheck" |
| LINT_CMD | "npm run lint" |
| TEST_CMD | "npm run test:run" |
| SOURCE_DIR | "src" |
| OUTPUT_DIR_PREFIX | ".claude/frontend-implementation" |
| COMMIT_PREFIX | "frontend" |
| CODE_REVIEW_SKILL | "frontend:code-review" |
| FIX_ISSUES_SKILL | "frontend:fix-issues" |
| RESUME_SKILL | "frontend:resume-task" |
| TEST_POLICY | "on-request" |
| UI_DESIGN_STEP | true |
| SHARED_COMPONENTS_CHECK | true |
| CONTEXT7_MANDATORY | false |
| COMPILATION_FIX_STRATEGY | "per-error" |

---

## Instruction

You are resuming a React 19 + TypeScript frontend implementation with 100% guideline compliance.

**Task:** Resume implementation from: $ARGUMENTS

---

## Workflow

### Step 1: Read Operational Rules

Read `shared/01-operational-rules.md` — follow ALL rules throughout execution.

### Step 2: Detect and Resume

Read `shared/10-resume-framework.md` and execute all steps:
1. Parse and validate input path
2. Detect completion state (which phases are done)
3. Handle special cases (all complete, no progress, abandoned, etc.)
4. Load context from completed phases
5. Display status and resume point

### Step 3: Continue Execution

Based on detected resume phase, read and execute the appropriate shared modules:

- **Resume from Phase 1:** Read `shared/03-phase-planning.md`
- **Resume from Phase 2:** Read `shared/04-phase-implementation.md`
- **Resume from Phase 3:** Read `shared/05-phase-compilation.md`
- **Resume from Phase 4:** Read `shared/06-phase-tests.md`
- **Resume from Phase 5:** Read `shared/07-phase-validation.md`
- **Resume from Phase 6:** Read `shared/08-phase-fixes.md`

Continue through all remaining phases until complete.

### Step 4: Final Summary

Read `shared/09-final-summary.md` and generate summary.

---

## Frontend-Specific Resume Notes

- Use EXPLORE_SCOPE, DESIGN_REQUIREMENTS, COMPLIANCE_CHECKLIST, and TEST_PATTERNS from `/frontend:start-task` when resuming planning or implementation phases
- Verify CSS Module compliance after resuming
- Check Zustand selector patterns after resuming
