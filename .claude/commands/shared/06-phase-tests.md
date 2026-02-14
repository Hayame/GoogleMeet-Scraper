# Phase 4: Tests

Reference module defining the test creation phase. This phase determines whether tests are required based on the configured policy, creates tests when needed, and verifies they pass.

This file is not user-invocable. It is read by Claude as part of the skill resolution chain.

---

## Overview

**Goal:** Create tests based on policy (`{{TEST_POLICY}}`) and verify they pass
**Execution:** Intelligent batching by domain area
**Model:** ALL subagents use `model: "opus"`

---

## Step 4.1: Determine Test Requirement

**Configured Policy: `{{TEST_POLICY}}`**

### Policy: "mandatory" (Backend default)

Tests are ALWAYS created. No conditions to evaluate.

1. Read `01_planning/acceptance_criteria.md`.
2. Read `02_implementation/completed_files.md` to identify all implementation files.
3. Create a test coverage matrix mapping acceptance criteria to test cases.

**Test Coverage Matrix Template:**

```markdown
| AC ID | Acceptance Criteria | Test File | Test Method | Coverage Type | Status |
|-------|---------------------|-----------|-------------|---------------|--------|
| AC-1 | [Happy path description] | [File]Tests | Method_ValidInput_ReturnsSuccess | Unit | [ ] |
| AC-2 | [Error case description] | [File]Tests | Method_InvalidInput_ReturnsError | Unit | [ ] |
| AC-3 | [Integration scenario] | [File]IntegrationTests | Method_Scenario_ExpectedResult | Integration | [ ] |
```

Proceed directly to Step 4.3.

### Policy: "on-request" (Frontend default)

Tests are created only when explicitly requested or when complexity warrants them.

**Check 1 -- Explicit Request:**

Scan the original task description for any of these phrases (case-insensitive):
- "write tests", "add tests", "create tests"
- "with unit tests", "with tests"
- "test coverage", "include tests"
- "testy", "napisz testy" (Polish equivalents)

If found: Proceed to Step 4.3.

**Check 2 -- Complexity-Based Recommendation:**

Even if not explicitly requested, RECOMMEND tests (and proceed to Step 4.3) if the implementation includes any of the following:

| Indicator | Example | Why Tests Are Valuable |
|-----------|---------|------------------------|
| Complex state transitions | Multi-step form, state machine | Prevents regression in state logic |
| Business logic calculations | Price computation, date ranges | Validates correctness of formulas |
| Error handling branches | Try/catch, fallback logic | Ensures error paths work correctly |
| Multi-step user flows | Wizard, checkout process | Catches integration issues between steps |
| Custom hooks with side effects | Data fetching, subscriptions | Verifies lifecycle and cleanup behavior |

**Check 3 -- Skip Tests:**

Skip tests if the implementation consists ONLY of:
- Simple UI rendering with no logic
- Basic prop passing between components
- CSS or styling changes
- Static content updates
- Configuration file changes

If skipping: Proceed to Step 4.2.

---

## Step 4.2: Tests Not Required

Create `04_tests/test_plan.md`:

```markdown
# Test Plan

## Decision: Tests Skipped

**Policy:** {{TEST_POLICY}}
**Reason:** [Tests were not explicitly requested / Implementation is purely presentational]

## Acceptance Criteria Review

| AC ID | Description | Why Tests Not Needed |
|-------|-------------|----------------------|
| AC-1 | [Description] | [e.g., Visual-only change, verified by inspection] |
| AC-2 | [Description] | [e.g., Static content, no logic to test] |

## Recommended Future Tests
- [Component/hook name] - [What could be tested and when it would become valuable]
```

Create `04_tests/PHASE_4_COMPLETE.md`:

```markdown
# Phase 4: Tests -- Complete (Skipped)

**Completed:** [ISO timestamp]
**Decision:** Tests skipped
**Reason:** [Brief explanation]
```

---

## Step 4.3: Create Tests

### a) Create Test Plan

Create `04_tests/test_plan.md` with the test coverage matrix from Step 4.1 (mandatory policy) or a similar matrix derived from the implementation files (on-request policy).

### b) Group Tests into Subagent Batches

Use intelligent batching based on the domain area and complexity of each test file.

**Grouping Strategy:**

| Area Type | Examples | Batch Size | Rationale |
|-----------|----------|------------|-----------|
| Feature Tests | Related handlers, hooks, services | 2-4 test files per subagent | Shared context reduces setup |
| Domain Tests | Entities, value objects, utilities | 2-5 test files per subagent | Similar patterns, low complexity |
| Complex Tests | 10+ test cases, extensive mocking | 1 test file per subagent | Requires focused attention |
| Integration Tests | API endpoints, database operations | 1-2 test files per subagent | External dependencies need care |

### c) Launch Test-Writing Subagents

For each batch, launch a subagent:

```
Task tool:
  subagent_type: "{{TEST_WRITER_AGENT}}"
  model: "opus"
  prompt: "Create Tests -- Batch #[N]

## Test Files to Create
[List test files with absolute paths]

## Source Files Under Test
[List the implementation files being tested, with absolute paths]

## Test Coverage Matrix (this batch)
[Subset of the coverage matrix for this batch]

## Test Patterns and Conventions
{{TEST_PATTERNS}}

## Guidelines Reference
{{GUIDELINES_PATH}}

## Requirements
- Follow existing test patterns in the codebase
- Each test must be independent and deterministic
- Use descriptive test names that explain the scenario
- Cover both happy path and error cases per the coverage matrix
- Update the task file with completion status"
```

### d) Run Tests

After all test-writing subagents complete, run the test suite:

```bash
{{TEST_CMD}}
```

Save output to `04_tests/test_results.md`:

```markdown
# Test Results

**Command:** `{{TEST_CMD}}`
**Executed:** [ISO timestamp]
**Result:** PASS | FAIL

## Output
[Full command output]

## Summary
- Total tests: [count]
- Passed: [count]
- Failed: [count]
- Skipped: [count]
```

### e) Handle Test Failures

If any tests fail:

1. Analyze the failure output.
2. Determine if the failure is in the TEST (incorrect assertion) or the IMPLEMENTATION (bug).
3. Launch a fix subagent:

```
Task tool:
  subagent_type: "{{TEST_WRITER_AGENT}}"
  model: "opus"
  prompt: "Fix Failing Test(s)

## Failing Tests
[List test names and failure messages]

## Test File(s)
[Absolute paths]

## Source File(s) Under Test
[Absolute paths]

## Failure Analysis
[Is this a test bug or implementation bug?]

## Fix Requirements
- Fix the [test / implementation] to make the test pass
- Do not weaken assertions to hide real issues
- Follow {{GUIDELINES_PATH}}"
```

4. Re-run `{{TEST_CMD}}` after fixes.
5. Repeat until all tests pass (maximum 3 iterations).

### f) Commit

1. Run code-simplifier on all test files.
2. Create Git commit: `test({{COMMIT_PREFIX}}): add tests for [feature description]`

---

## Phase 4 Deliverables

| Artifact | Location | Purpose |
|----------|----------|---------|
| `test_plan.md` | `04_tests/` | Test decision and coverage matrix |
| `test_results.md` | `04_tests/` | Test execution output |
| `coverage_notes.md` | `04_tests/` | Coverage decisions and trade-offs (optional) |
| `PHASE_4_COMPLETE.md` | `04_tests/` | Phase completion marker |

Create `04_tests/PHASE_4_COMPLETE.md`:

```markdown
# Phase 4: Tests -- Complete

**Completed:** [ISO timestamp]
**Policy:** {{TEST_POLICY}}
**Tests Created:** [count]
**Tests Passed:** [count] / [count]
**Fix Iterations:** [count]
```
