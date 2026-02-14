# Resume Backend Implementation

**Purpose:** Continue interrupted backend implementation from last completed phase

**Tech Stack:**
- .NET 10 (LTS) + C# 12
- Entity Framework Core 10.0 + PostgreSQL + PostGIS
- Wolverine CQRS + OneOf error handling
- xUnit + NSubstitute

**Guidelines:**
- `docs/guidelines/backend.md` — C# coding standards
- `docs/guidelines/backend-stack.md` — Architecture patterns

**Usage:**
```bash
/backend:resume-task .claude/backend-implementation/20260103_150000_user_auth/
/backend:resume-task path/to/implementation/
```

**Output:** Updates existing implementation directory (NO new directory created)

**Note:** The `.claude` directory is at the project root level (same level as `backend/`), not inside the backend directory.

**Workflow:** Detects last completed phase → Resumes from next phase → Continues normal workflow

**See Also:** `/backend:start-task` (create new implementation)

---

## Config Block

| Parameter | Value |
|-----------|-------|
| STACK_ID | "backend" |
| STACK_NAME | ".NET 10 + C# 12" |
| GUIDELINES_PATH | "docs/guidelines/backend.md" |
| BUILD_CMD | "dotnet build backend/GeoMarkup.sln" |
| LINT_CMD | "" |
| TEST_CMD | "dotnet test backend/GeoMarkup.sln --logger \"console;verbosity=detailed\"" |
| SOURCE_DIR | "backend" |
| OUTPUT_DIR_PREFIX | ".claude/backend-implementation" |
| COMMIT_PREFIX | "backend" |
| CODE_REVIEW_SKILL | "backend:code-review" |
| FIX_ISSUES_SKILL | "backend:fix-issues" |
| RESUME_SKILL | "backend:resume-task" |
| TEST_POLICY | "mandatory" |
| UI_DESIGN_STEP | false |
| SHARED_COMPONENTS_CHECK | false |
| CONTEXT7_MANDATORY | true |
| COMPILATION_FIX_STRATEGY | "batch" |

---

## Instruction

You are resuming a .NET 10 backend implementation with 100% guideline compliance.

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

### Step 3: Context7 Library Version Check

**MANDATORY on resume:** Before continuing implementation, verify library versions are still current:

```
resolve-library-id for "Entity Framework Core"
resolve-library-id for "Wolverine"
resolve-library-id for "OneOf"
```

Check if any library versions have changed since the implementation started. If so, note changes in progress.md.

### Step 4: Continue Execution

Based on detected resume phase, read and execute the appropriate shared modules:

- **Resume from Phase 1:** Read `shared/03-phase-planning.md`
- **Resume from Phase 2:** Read `shared/04-phase-implementation.md`
- **Resume from Phase 3:** Read `shared/05-phase-compilation.md`
- **Resume from Phase 4:** Read `shared/06-phase-tests.md`
- **Resume from Phase 5:** Read `shared/07-phase-validation.md`
- **Resume from Phase 6:** Read `shared/08-phase-fixes.md`

Continue through all remaining phases until complete.

### Step 5: Final Summary

Read `shared/09-final-summary.md` and generate summary.

---

## Backend-Specific Resume Notes

- Use EXPLORE_SCOPE, DESIGN_REQUIREMENTS, COMPLIANCE_CHECKLIST, and TEST_PATTERNS from `/backend:start-task` when resuming planning or implementation phases
- Verify repository pattern compliance after resuming
- Check Wolverine CQRS patterns after resuming
- Verify CancellationToken in all async methods
- Context7 MCP is MANDATORY for library documentation
