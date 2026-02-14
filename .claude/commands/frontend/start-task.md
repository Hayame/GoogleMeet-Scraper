# Frontend Feature Implementation

**Purpose:** Full-cycle frontend development with automated 6-phase workflow and quality assurance

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
/frontend:start-task "create a task priority badge component"
/frontend:start-task docs/tasks/feature-task-filters.md
```

**Output:** `.claude/frontend-implementation/{timestamp}_{task_slug}/`

**Note:** The `.claude` directory is at the project root level (same level as `src/`).

**Phases:**
1. Planning → 2. Implementation → 3. Compilation → 4. Tests → 5. Validation → 6. Fixes

**See Also:** `/frontend:resume-task` (continue interrupted implementation)

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
| IMPLEMENTER_AGENT | "frontend-implementer" |
| COMPILATION_FIXER_AGENT | "compilation-fixer" |
| TEST_WRITER_AGENT | "test-writer" |
| FIXER_AGENT | "frontend-fixer" |

---

## EXPLORE_SCOPE

```
1. Similar components in `src/components/`
2. Existing hooks in `src/hooks/`
3. Store slices in `src/store/`
4. Type patterns in `src/types/`
5. Utility patterns in `src/utils/`
6. Constant organization in `src/constants/`
7. CSS Module patterns (look at existing .module.css files)
```

---

## DESIGN_REQUIREMENTS

```
**Types & Interfaces:**
- Type definitions (1 type per file in src/types/)
- Props interfaces
- State types (if using Zustand)

**Constants:**
- Values to extract to src/constants/
- Z-index values (use constants from src/constants/zIndex.ts)
- Color values (use Mantine CSS variables)
- Sizing values

**CSS Modules:**
- Class structure
- Mantine variable usage (var(--mantine-*))
- Dark/light mode support (light-dark())
- Responsive breakpoints

**Components:**
- Component hierarchy
- Props definition (max 10 props)
- Hook usage (max 7 hooks)
- Memoization strategy (memo, useMemo, useCallback)

**Custom Hooks (if needed):**
- Hook purpose and interface
- Zustand atomic selectors
- Memoization strategy

**Store Integration (if needed):**
- Slice modifications
- Selector patterns (atomic only)
- Action definitions
```

---

## COMPLIANCE_CHECKLIST

Every implementation subagent must verify:

- [ ] Descriptive lambda names (`task =>` NOT `t =>`)
- [ ] Components < 300 lines (hard), < 200 lines (soft)
- [ ] Functions < 50 lines (hard), < 20 lines (soft)
- [ ] Props <= 10, Hooks <= 7
- [ ] Zero inline styles (CSS Modules only)
- [ ] Mantine CSS variables (`var(--mantine-*)`)
- [ ] Atomic Zustand selectors (primitives only)
- [ ] Z-index from constants (never hardcoded)
- [ ] No magic numbers (extract to constants)
- [ ] No `any` type (use `unknown` with type guards)

---

## TEST_PATTERNS

```
- Stack: Vitest + React Testing Library
- Test directory: src/**/__tests__/
- Naming: [module].test.ts or [module].test.tsx
- Focus: Business logic, custom hooks, state management
- Skip: Static content, CSS, simple prop passing, third-party behavior
```

---

## Instruction

You are a React 19 + TypeScript frontend architect implementing features with 100% guideline compliance.

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
- Step 1.1.5: UI/UX Design (enabled: UI_DESIGN_STEP = true)
- Step 1.1.6: Shared Components Check (enabled: SHARED_COMPONENTS_CHECK = true)
- Step 1.2: Architecture Design (use DESIGN_REQUIREMENTS above)
- Step 1.3: User Stories & AC
- Step 1.4: Implementation Plan

### Phase 2: Implementation

Read `shared/04-phase-implementation.md` and execute:
- Use COMPLIANCE_CHECKLIST above for every subagent
- Follow batch execution with progress tracking

### Phase 3: Compilation

Read `shared/05-phase-compilation.md` and execute:
- Strategy: per-error (COMPILATION_FIX_STRATEGY = "per-error")
- Build: `npx tsc --noEmit --skipLibCheck`
- Lint: `npm run lint`

### Phase 4: Tests

Read `shared/06-phase-tests.md` and execute:
- Policy: on-request (TEST_POLICY = "on-request")
- If tests needed: use TEST_PATTERNS above

### Phase 5: Validation

Read `shared/07-phase-validation.md` and execute:
- Invoke `/frontend:code-review`
- Verify acceptance criteria coverage
- Run code-simplifier review
- Verify AI index updates

### Phase 6: Fixes

Read `shared/08-phase-fixes.md` and execute:
- Invoke `/frontend:fix-issues` if issues found

### Final Summary

Read `shared/09-final-summary.md` and generate summary.

---

## Code Guidelines Reference

**For templates, patterns, compliance checklists, and coding standards:**
→ `docs/guidelines/frontend.md` (authoritative source)

**ALWAYS use Context7 MCP** before implementing — run `resolve-library-id` + `get-library-docs` for any library (Mantine, Zustand, MapLibre, etc.).

---

## Tips & Best Practices

### Planning Phase
- Understand existing patterns before designing
- Identify all dependencies upfront

### Implementation Phase
- Follow guidelines exactly (`docs/guidelines/frontend.md`)
- Keep components small (< 200 lines soft limit)
- Update progress.md after EACH task

### Testing Phase
- Skip tests by default (unless explicitly requested)
- If tests needed: test business logic ONLY

### Code Review Phase
- Fix ALL issues (no exceptions)
- 100% compliance is non-negotiable

### Common Pitfalls
- Single-letter lambda params → Use descriptive names
- Inline styles → Use CSS Modules
- Object Zustand selectors → Use atomic primitives
- Magic numbers/z-index → Extract to constants
- Local date formatting → Use useLocalizedDate()
- Direct device comparison → Use useDeviceLayout()
- Skipping phases → Follow all 6 phases

---

## Error Handling

### TypeScript Compilation Fails
1. Show full error output
2. Analyze root cause
3. Fix via dedicated subagent
4. Re-run TypeScript
5. Repeat until success

### ESLint Fails
1. Run `npm run lint:fix` for auto-fixable issues
2. Manual fix for remaining
3. Re-run ESLint

### Code Review Finds Issues
- Don't skip Phase 6
- Fix ALL issues (including LOW priority)
- Re-run code review until 0 issues

---

## Quality Gates

**Before marking implementation COMPLETE:**

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit --skipLibCheck` | 0 errors |
| ESLint | `npm run lint` | 0 errors, 0 warnings |
| Review | `/frontend:code-review` | 0 issues |
| Guidelines | `docs/guidelines/frontend.md` | 100% compliance |

**Trust the process. Follow all phases. Deliver quality code.**
