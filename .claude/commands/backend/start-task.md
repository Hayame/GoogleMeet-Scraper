# Backend Feature Implementation

**Purpose:** Full-cycle backend development with automated 6-phase workflow and quality assurance

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
/backend:start-task "implement user authentication with license key validation"
/backend:start-task docs/tasks/phase-5-authentication.md
```

**Output:** `.claude/backend-implementation/{timestamp}_{task_slug}/`

**Note:** The `.claude` directory is at the project root level (same level as `backend/`), not inside the backend directory.

**Phases:**
1. Planning → 2. Implementation → 3. Compilation → 4. Tests → 5. Validation → 6. Fixes

**See Also:** `/backend:resume-task` (continue interrupted implementation)

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
| IMPLEMENTER_AGENT | "backend-implementer" |
| COMPILATION_FIXER_AGENT | "backend-compilation-fixer" |
| TEST_WRITER_AGENT | "backend-test-writer" |
| FIXER_AGENT | "backend-fixer" |

---

## EXPLORE_SCOPE

```
1. Similar features in `backend/GeoMarkup.Api/Features/`
2. Entity patterns in `backend/GeoMarkup.Domain/Entities/`
3. Repository patterns in `backend/GeoMarkup.Infrastructure/Repositories/`
4. Handler patterns (CQRS with Wolverine)
5. Database schema in migrations
```

---

## DESIGN_REQUIREMENTS

```
**Domain Layer:**
- Entities (inherit Entity base, factory methods)
- Value Objects (immutable)
- Enums

**Infrastructure Layer:**
- Repository interfaces (extend IRepository<T>)
- Repository implementations (EF Core)
- EF Core configurations (IEntityTypeConfiguration<T>)
- Database migrations

**Application Layer:**
- Commands (write operations)
- Queries (read operations)
- Handlers (Wolverine + OneOf)
- DTOs (record types)

**Presentation Layer:**
- Minimal API endpoints
- Route definitions
- TypedResults responses
```

---

## COMPLIANCE_CHECKLIST

Every implementation subagent must verify:

- [ ] File-scoped namespaces (`namespace GeoMarkup.Domain.Entities;`)
- [ ] Primary constructors where applicable
- [ ] Descriptive lambda names (`user =>` NOT `u =>`)
- [ ] No abbreviations (except: Id, Url, Http, Dto, Sql, Json)
- [ ] Wolverine CQRS for ALL operations
- [ ] Vertical Slices (Command/Query + Handler + Endpoint in ONE file)
- [ ] TypedResults with explicit `Results<T1, T2>` types
- [ ] Repository Pattern (NO direct DbContext in handlers)
- [ ] OneOf for explicit error handling
- [ ] CancellationToken in ALL async methods
- [ ] Methods < 50 lines (hard), < 20 lines (soft), complexity < 10
- [ ] Braces `{}` for all control structures

---

## TEST_PATTERNS

```
- Stack: xUnit + NSubstitute
- Test directory: backend/GeoMarkup.Api.Tests/
- Naming: Method_Scenario_ExpectedResult
- Use xUnit assertions: Assert.True(), Assert.Equal(), Assert.NotNull()
- Focus: Handlers (business logic), Entities (validation), Value Objects
- Skip: Repositories (integration), DTOs (no logic), Configurations
```

---

## Instruction

You are a .NET 10 backend architect implementing features with 100% guideline compliance.

**Task:** $ARGUMENTS

---

## Workflow

Read and follow these shared modules in order. Substitute config values from the Config Block above for all `{{PLACEHOLDER}}` tokens.

### Phase 0: Preparation

1. Read `shared/01-operational-rules.md` — follow ALL rules throughout execution
2. Read `shared/02-orchestrator-framework.md` — follow input parsing, output directory, git workflow, subagent strategy
3. Read `shared/11-ai-index-integration.md` — read relevant index files before planning

### Phase 1: Planning

Read `shared/03-phase-planning.md` and execute all steps:
- Step 1.1: Explore (use EXPLORE_SCOPE above)
- Step 1.1.5: UI/UX Design (SKIPPED: UI_DESIGN_STEP = false)
- Step 1.1.6: Shared Components Check (SKIPPED: SHARED_COMPONENTS_CHECK = false)
- Step 1.2: Architecture Design (use DESIGN_REQUIREMENTS above)
- Step 1.3: User Stories & AC
- Step 1.4: Implementation Plan

### Phase 2: Implementation

Read `shared/04-phase-implementation.md` and execute:
- Use COMPLIANCE_CHECKLIST above for every subagent
- Follow batch execution with progress tracking

### Phase 3: Compilation

Read `shared/05-phase-compilation.md` and execute:
- Strategy: batch (COMPILATION_FIX_STRATEGY = "batch")
- Build: `dotnet build backend/GeoMarkup.sln`
- No linting step (LINT_CMD is empty)

### Phase 4: Tests

Read `shared/06-phase-tests.md` and execute:
- Policy: mandatory (TEST_POLICY = "mandatory")
- Use TEST_PATTERNS above

### Phase 5: Validation

Read `shared/07-phase-validation.md` and execute:
- Invoke `/backend:code-review`
- Verify acceptance criteria coverage
- Run code-simplifier review
- Verify AI index updates

### Phase 6: Fixes

Read `shared/08-phase-fixes.md` and execute:
- Invoke `/backend:fix-issues` if issues found

### Final Summary

Read `shared/09-final-summary.md` and generate summary.

---

## Documentation Lookup (MANDATORY)

**ALWAYS use Context7 MCP** before implementing any feature:

1. **Resolve library ID:** `resolve-library-id for "[library name]"`
2. **Get latest documentation:** `get-library-docs for [library-id]`

**Required scenarios:**
- Before using any .NET library (EF Core, Wolverine, OneOf, etc.)
- When implementing patterns from guidelines
- When troubleshooting library-specific issues

---

## Code Template References

Instead of duplicating code examples, use these references:

| Template | Guideline | Example |
|----------|-----------|---------|
| Domain Entities | backend.md Section 3.5 | `backend/GeoMarkup.Domain/Entities/User.cs` |
| Value Objects | backend.md Section 3.5 | Record type, static factory |
| Repository Interfaces | backend.md Section 3.4 | `backend/GeoMarkup.Domain/Repositories/I*Repository.cs` |
| Repository Implementations | backend.md Section 3.4 | `backend/GeoMarkup.Infrastructure/Repositories/` |
| EF Core Configurations | backend.md Section 4.1 | `backend/GeoMarkup.Infrastructure/Data/Configurations/` |
| CQRS Command Handlers | backend.md Section 3.1, 3.3 | Vertical slice pattern |
| CQRS Query Handlers | backend.md Section 3.1, 3.3 | AsNoTracking, projection |
| Minimal API Endpoints | backend.md Section 3.3 | Extension methods, TypedResults |
| Unit Tests | backend.md Section 6 | xUnit + NSubstitute |

---

## Continuation to Frontend (MIXED Tasks Only)

**IMPORTANT:** If this backend implementation is part of a MIXED task (routed from `/execute-task`):

After Phase 6 completion (or Phase 5 if no fixes needed):

1. **If context < 70%:** Continue to `/frontend:start-task` immediately
2. **If context 70-85%:** Proceed with caution, monitor context
3. **If context > 85%:** Create `frontend_handoff.md` and stop

---

## Tips & Best Practices

### Planning Phase
- Understand existing patterns before designing
- Identify all dependencies upfront

### Implementation Phase
- Follow templates exactly (see Code Template References)
- Keep methods small (< 20 lines soft, NEVER > 50 hard)
- Complexity < 10 is MORE important than line count
- Update progress.md after EACH task

### Testing Phase
- Test happy path first, then error cases
- Use Theory for parameterized tests
- Mock external dependencies only

### Code Review Phase
- Fix ALL issues (no exceptions)
- 100% compliance is non-negotiable

### Common Pitfalls
- Direct DbContext in handlers → Use repositories
- Single-letter lambda params → Use descriptive names
- Methods > 50 lines → ALWAYS extract
- Magic numbers/strings → Use named constants
- Abbreviations → Use full words
- Missing CancellationToken → Add to all async methods

---

## Quality Gates

**Before marking implementation COMPLETE:**

| Check | Command | Expected |
|-------|---------|----------|
| Build | `dotnet build backend/GeoMarkup.sln` | 0 errors, 0 warnings |
| Tests | `dotnet test backend/GeoMarkup.sln` | All passing |
| Review | `/backend:code-review` | 0 issues |
| Guidelines | `docs/guidelines/backend.md` | 100% compliance |

**Trust the process. Follow all phases. Deliver quality code.**
