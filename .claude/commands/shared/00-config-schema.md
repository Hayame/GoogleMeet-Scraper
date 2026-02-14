# Config Schema

Reference module defining the parameter contract that every entry point skill must satisfy. Shared modules use `{{PARAMETER}}` tokens throughout; entry point skills provide a config block with concrete values that Claude substitutes mentally when reading both files together.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Required Parameters

| Parameter | Type | Description | Frontend Example | Backend Example |
|-----------|------|-------------|------------------|-----------------|
| `STACK_ID` | string | Machine-readable stack identifier | `"frontend"` | `"backend"` |
| `STACK_NAME` | string | Human-readable technology label | `"React 19 + TypeScript 5.7"` | `".NET 10 + C# 12"` |
| `GUIDELINES_PATH` | path | Coding standards document | `"docs/guidelines/frontend.md"` | `"docs/guidelines/backend.md"` |
| `BUILD_CMD` | shell | Compilation / type-check command | `"npx tsc --noEmit --skipLibCheck"` | `"dotnet build backend/GeoMarkup.sln"` |
| `LINT_CMD` | shell | Linting command (empty string if N/A) | `"npm run lint"` | `""` |
| `TEST_CMD` | shell | Test runner invocation | `"npm run test:run"` | `"dotnet test backend/GeoMarkup.sln --logger \"console;verbosity=detailed\""` |
| `SOURCE_DIR` | path | Root of source code tree | `"src"` | `"backend"` |
| `OUTPUT_DIR_PREFIX` | path | Base directory for run artifacts | `".claude/frontend-implementation"` | `".claude/backend-implementation"` |
| `COMMIT_PREFIX` | string | Scope token in commit messages | `"frontend"` | `"backend"` |
| `CODE_REVIEW_SKILL` | skill | Skill name for code review phase | `"frontend:code-review"` | `"backend:code-review"` |
| `FIX_ISSUES_SKILL` | skill | Skill name for automated fixes | `"frontend:fix-issues"` | `"backend:fix-issues"` |
| `RESUME_SKILL` | skill | Skill name for resuming work | `"frontend:resume-task"` | `"backend:resume-task"` |
| `TEST_POLICY` | enum | When tests are created: `"mandatory"` or `"on-request"` | `"on-request"` | `"mandatory"` |
| `IMPLEMENTER_AGENT` | subagent | Subagent type for implementation tasks | `"frontend-implementer"` | `"backend-implementer"` |
| `COMPILATION_FIXER_AGENT` | subagent | Subagent type for compilation fixes | `"compilation-fixer"` | `"backend-compilation-fixer"` |
| `TEST_WRITER_AGENT` | subagent | Subagent type for test creation | `"test-writer"` | `"backend-test-writer"` |
| `FIXER_AGENT` | subagent | Subagent type for code review fixes | `"frontend-fixer"` | `"backend-fixer"` |

---

## Conditional Flags

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `UI_DESIGN_STEP` | bool | Include UI/UX design step during planning (Step 1.1.5) | `false` |
| `SHARED_COMPONENTS_CHECK` | bool | Search for reusable shared components before creating new ones (Step 1.1.6) | `false` |
| `CONTEXT7_MANDATORY` | bool | Require Context7 MCP lookups for any library referenced in the task | `false` |
| `COMPILATION_FIX_STRATEGY` | enum | Error resolution approach: `"per-error"` (fix one, rebuild, repeat) or `"batch"` (fix all visible, rebuild once) | `"per-error"` |

---

## Stack-Specific Blocks

Entry point skills define the following blocks inline. They are NOT config parameters; they are markdown sections embedded directly in the entry point file and referenced by shared modules via their block name.

| Block | Purpose | Consumed By |
|-------|---------|-------------|
| `EXPLORE_SCOPE` | Directories, file patterns, and areas to investigate during the explore step | `03-phase-planning.md` Step 1.1 |
| `DESIGN_REQUIREMENTS` | Architectural layers, design elements, and structural constraints | `03-phase-planning.md` Step 1.2 |
| `COMPLIANCE_CHECKLIST` | Coding standard items the subagent must verify before marking work complete | Phase 2 subagent tasks |
| `TEST_PATTERNS` | Test framework, conventions, file naming, and example references | Phase 4 test creation |

Entry point skills embed these blocks as fenced sections so that shared modules can reference them by name without additional indirection.
