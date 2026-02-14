# Frontend Code Review

> **Purpose:** Comprehensive code review of React/TypeScript frontend changes before commit
> **Guidelines Reference:** `docs/guidelines/frontend.md`
> **Stack:** React 19, TypeScript 5.7, Vite 6, Mantine 8, Zustand 5, MapLibre GL

---

## Instruction

Perform a comprehensive pre-commit code review of React/TypeScript frontend changes, validating compliance with `docs/guidelines/frontend.md` guidelines.

**Task Description:** $ARGUMENTS

---

## Files to Review

Analyze the following:

1. **Staged files** - Files added to git staging area (`git diff --staged`)
2. **Untracked files** - New files in `src/` directory not yet tracked by git
3. **Modified package.json** - Check for dependency versions

---

## Analysis Categories

### 1. Code Style Compliance (frontend.md Section II)

- [ ] **Naming conventions** - camelCase (variables), PascalCase (components), UPPER_SNAKE_CASE (constants)
- [ ] **Lambda expressions** - Descriptive names (NO single letters: `t =>`, `u =>`, `x =>`, `s =>`)
- [ ] **Component size** - < 200 lines (soft), NEVER > 300 (hard)
- [ ] **Function size** - < 20 lines (soft), NEVER > 50 (hard)
- [ ] **Props limit** - <= 7 (soft), <= 10 (hard)
- [ ] **Hooks limit** - <= 5 (soft), <= 7 (hard)
- [ ] **JSX nesting** - <= 2 (soft), <= 3 (hard)
- [ ] **TypeScript strict** - No `any`, prefer `unknown`
- [ ] **Magic numbers** - Extract to `src/constants/` (ZERO hardcoded values)
- [ ] **Language** - English ONLY for all code and comments

### 2. Architecture Compliance (frontend.md Section III)

- [ ] **Zustand atomic selectors** - Primitives only, NO object subscriptions
- [ ] **useShallow for arrays** - `useShallow()` wrapper for array/object selectors
- [ ] **Custom hooks pattern** - Action-only hooks (0 re-renders), state hooks (atomic)
- [ ] **Component structure** - Proper file organization (ComponentName/, hooks/, types/)
- [ ] **memo() usage** - Components with expensive renders wrapped in memo()
- [ ] **React 19 hooks** - useActionState, useOptimistic, useFormStatus where appropriate
- [ ] **Type organization** - 1 type/interface per file, domain-separated

### 3. Styling Compliance (frontend.md Section IV)

- [ ] **CSS Modules 100%** - ZERO inline styles (`style={{}}`)
- [ ] **Mantine variables** - Use `var(--mantine-*)` for colors, spacing, radius
- [ ] **Dark/light mode** - Use `light-dark()` function for theme switching
- [ ] **Z-index constants** - NEVER hardcode z-index numbers, use `src/constants/zIndex.ts`

### 4. Device Detection & Responsive (frontend.md Section V)

- [ ] **useDeviceLayout()** - ALWAYS use hook helpers (isMobile, isTouch, hasHover)
- [ ] **NEVER direct comparisons** - No `layoutMode === 'mobile'` or `inputMode === 'touch'`
- [ ] **Breakpoints aligned** - CSS media queries match JS constants

### 5. Date Handling (frontend.md Section VI)

- [ ] **useLocalizedDate()** - ALWAYS use for date formatting
- [ ] **NEVER local functions** - No custom `formatDate()` functions
- [ ] **dateHelpers.ts** - Use for date calculations only

### 6. Testing Philosophy (frontend.md Section VII)

- [ ] **Business logic only** - Tests for calculations, validations, state management
- [ ] **NO trivial tests** - No tests for static content, CSS, simple props passing
- [ ] **Quality over quantity** - 80% coverage for critical business logic

### 7. Performance (frontend.md Section VIII)

- [ ] **Memoization** - useMemo/useCallback for expensive operations
- [ ] **Code splitting** - React.lazy + Suspense for heavy components
- [ ] **Bundle awareness** - < 250KB (gzipped) target

### 8. Error Handling (frontend.md Section IX)

- [ ] **Error boundaries** - Wrap critical sections with ErrorBoundary
- [ ] **Async error handling** - try/catch with proper notifications
- [ ] **Logging** - console.error for errors (never console.log)

### 9. i18n (frontend.md Section X)

- [ ] **useTranslation()** - All user-visible text via t() function
- [ ] **Interpolation** - Use `{{variable}}` syntax for dynamic values
- [ ] **Both languages** - Keys in both `en.json` and `pl.json`

### 10. Import Organization (frontend.md Section XI)

- [ ] **Order** - React -> Mantine -> Zustand -> Local components -> Utils -> Types -> Styles
- [ ] **Type imports** - Use `import type` for type-only imports

### 11. Security & Best Practices (frontend.md Section XI)

- [ ] **Environment variables** - All secrets via `import.meta.env.VITE_*`
- [ ] **No hardcoded secrets** - Zero API keys, tokens in code
- [ ] **Input sanitization** - Use DOMPurify for user input
- [ ] **No console.log** - Remove all debug logs (console.warn/error OK in dev)

---

## Git Integration Commands

Execute the following bash commands to collect files for review:

```bash
# 1. Get staged files
git diff --staged --name-only | grep -E '\.(ts|tsx|css)$' > /tmp/frontend_staged.txt

# 2. Get untracked src files
git ls-files --others --exclude-standard src/ | grep -E '\.(ts|tsx|css)$' > /tmp/frontend_untracked.txt

# 3. Combine and sort unique
cat /tmp/frontend_staged.txt /tmp/frontend_untracked.txt | sort -u > /tmp/frontend_all_files.txt

# 4. Count files
echo "Files to review: $(wc -l < /tmp/frontend_all_files.txt)"
cat /tmp/frontend_all_files.txt
```

### Anti-Pattern Detection Commands

Run these grep searches to detect common violations:

```bash
# Single-letter lambda parameters
echo "=== Single-Letter Lambdas ==="
grep -rn '\b[a-z]\s*=>' src/ --include="*.ts" --include="*.tsx" | grep -E '\bt\s*=>|\bu\s*=>|\bx\s*=>|\bs\s*=>|\be\s*=>|\bi\s*=>|\bc\s*=>' | head -20

# Inline styles
echo "=== Inline Styles ==="
grep -rn 'style={{' src/ --include="*.tsx" | head -20

# Object Zustand selectors (not atomic)
echo "=== Object Zustand Selectors ==="
grep -rn 'useGeoMarkupStore(.*=>\s*s\.[a-z]\+)' src/ --include="*.ts" --include="*.tsx" | grep -v 'state\.\w\+\.\w\+\.\w\+' | head -20

# Magic z-index values
echo "=== Hardcoded Z-Index ==="
grep -rn 'zIndex:\s*[0-9]' src/ --include="*.tsx" --include="*.ts" | head -20

# console.log statements
echo "=== Console.log Statements ==="
grep -rn 'console\.log' src/ --include="*.ts" --include="*.tsx" | grep -v '__tests__' | grep -v '\.test\.' | head -20

# any type usage
echo "=== Any Type Usage ==="
grep -rn ': any\b' src/ --include="*.ts" --include="*.tsx" | grep -v '__tests__' | head -20

# Direct date formatting
echo "=== Direct Date Formatting ==="
grep -rn 'toLocaleDateString\|toLocaleTimeString\|new Intl\.DateTimeFormat' src/ --include="*.ts" --include="*.tsx" | head -20

# Direct layoutMode comparison
echo "=== Direct Layout Mode Comparison ==="
grep -rn "layoutMode\s*===\s*['\"]" src/ --include="*.ts" --include="*.tsx" | head -20

# Magic numbers in styles (common patterns)
echo "=== Potential Magic Numbers ==="
grep -rn "'line-width':\s*[0-9]\|'line-opacity':\s*0\.[0-9]\|padding:\s*[0-9]\+px" src/ --include="*.ts" --include="*.tsx" | head -20

# Missing useCallback/useMemo (handlers defined in render)
echo "=== Potential Missing Memoization ==="
grep -rn 'const handle\w\+ = (' src/ --include="*.tsx" | grep -v 'useCallback' | head -20
```

---

## Subagent Strategy

**IMPORTANT:** Every file analysis MUST be performed by a dedicated subagent via the Task tool with `subagent_type: "frontend-reviewer"` and `model: "opus"`. This ensures:

- Each file gets thorough, isolated attention without context window pressure
- The orchestrator (this skill) focuses on coordination, aggregation, and report generation
- Subagents receive the full checklist inline so they can validate independently
- The reviewer agent is read-only (no Write/Edit tools) -- it can only analyze, not modify
- Parallel analysis of multiple files is possible when files are independent

**Subagent launch template:**

```
Task tool:
  subagent_type: "frontend-reviewer"
  model: "opus"
  prompt: "Review [file_path] against docs/guidelines/frontend.md..."
```

**Subagent responsibilities:**
- Read the file content
- Cross-reference against the full checklist from this skill
- Return structured findings (issues with line numbers, priority, code examples, fix suggestions)

**Orchestrator responsibilities:**
- Collect files for review (git commands)
- Dispatch file analyses to subagents
- Run anti-pattern detection commands
- Aggregate results into final reports
- Generate the commit decision

---

## Output Structure

Create the following directory and files:

**Directory:** `.claude/frontend-code-review/{timestamp}_{task_slug}/`

**Note:** The `.claude` directory is located at the project root level (same level as `src/`).

Where:
- `{timestamp}` = Current date/time in format `YYYYMMDD_HHMMSS`
- `{task_slug}` = Sanitized task description (lowercase, spaces -> underscores, max 50 chars)

**Example:** `.claude/frontend-code-review/20260106_143000_task_form_refactor/`

### Files to Generate:

1. **review_report.md** - Executive summary with compliance matrix
2. **compliance_issues.md** - Detailed issues with code examples
3. **fix_plan.md** - Remediation plan with priorities and time estimates
4. **files/** - Directory with per-file analyses (e.g., `files/TaskForm.tsx.md`)

---

## Report File Formats

### 1. review_report.md (Executive Summary)

```markdown
# FRONTEND CODE REVIEW REPORT

**Date:** {YYYY-MM-DD HH:MM:SS}
**Task:** {task_description}
**Files Analyzed:** {count}
**Branch:** {current_git_branch}

---

## Executive Summary

- **Overall Assessment:** [CRITICAL / HIGH PRIORITY / MEDIUM / GOOD]
- **Total Issues:** {count}
  - CRITICAL: {count}
  - HIGH: {count}
  - MEDIUM: {count}
  - LOW: {count}
- **Estimated Fix Time:** {total_hours}h
  - Critical: {critical_hours}h
  - High: {high_hours}h
  - Medium: {medium_hours}h

---

## Compliance Matrix

| Guideline Category | Status | Issues | Blockers |
|-------------------|--------|--------|----------|
| Code Style | FAIL/WARN/PASS | {count} | {critical_count} |
| Architecture | FAIL/WARN/PASS | {count} | {critical_count} |
| Styling | FAIL/WARN/PASS | {count} | {critical_count} |
| Device Detection | FAIL/WARN/PASS | {count} | {critical_count} |
| Date Handling | FAIL/WARN/PASS | {count} | {critical_count} |
| Testing | FAIL/WARN/PASS | {count} | {critical_count} |
| Performance | FAIL/WARN/PASS | {count} | {critical_count} |
| i18n | FAIL/WARN/PASS | {count} | {critical_count} |
| Security | FAIL/WARN/PASS | {count} | {critical_count} |

**Legend:**
- PASS: Compliant (0 critical, 0-2 minor issues)
- WARN: Partial compliance (3-10 issues, no blockers)
- FAIL: Non-compliant (>10 issues or critical blockers)

---

## Critical Blockers (Must Fix Before Commit)

{If no critical issues:}
**No critical blockers detected!**

{If critical issues exist:}
1. **{Issue title}** - File: `{file_path}`, Lines: {line_range}
2. **{Issue title}** - File: `{file_path}`, Lines: {line_range}
...

---

## Summary by Category

### Code Style ({count} issues)

- Naming conventions: {pass/fail}
- Descriptive lambda names: {violations_count} violations in {files_count} files
- Component size limits: {pass/fail} ({violations_count} >300 lines)
- TypeScript strict mode: {pass/fail} ({any_count} `any` types)
- Magic numbers: {violations_count} hardcoded values

**Key Issues:**
- Single-letter lambdas: {count} occurrences in {list_of_files}
- Hardcoded values: {count} occurrences ({list_most_common})

### Architecture ({count} issues)

- Zustand atomic selectors: {pass/fail}
- Custom hooks pattern: {missing_count} opportunities
- Component structure: {pass/fail}
- memo() usage: {pass/fail}
- Type organization: {pass/fail}

**Key Issues:**
- Object selectors: {count} occurrences (should be atomic)
- Missing useShallow: {count} array/object selectors

### Styling ({count} issues)

- CSS Modules: {inline_styles_count} inline styles found
- Mantine variables: {pass/fail}
- Z-index constants: {hardcoded_count} hardcoded values
- Dark/light mode: {pass/fail}

**Key Issues:**
- Inline styles in: {list_of_files}
- Hardcoded z-index in: {list_of_files}

### Device Detection ({count} issues)

- useDeviceLayout() usage: {pass/fail}
- No direct comparisons: {pass/fail}

**Key Issues:**
- Direct layoutMode comparisons: {list_of_files}

### Date Handling ({count} issues)

- useLocalizedDate() usage: {pass/fail}
- No local formatting: {pass/fail}

**Key Issues:**
- Local date functions in: {list_of_files}

### Performance ({count} issues)

- Memoization: {missing_count} missing useCallback/useMemo
- Code splitting: {pass/fail}

**Key Issues:**
- Missing memoization in: {list_of_files}

### Best Practices ({count} issues)

- console.log: {count} statements found
- Environment variables: {pass/fail}
- i18n coverage: {pass/fail}

---

## Files Requiring Attention

### Top 10 Files with Most Issues:

1. **{file_name}** - {total_issues} issues (CRITICAL: {critical}, HIGH: {high}, MEDIUM: {medium}, LOW: {low})
   - Critical: {issue_summary}
   - High: {issue_summary}

2. **{file_name}** - {total_issues} issues (...)
...

---

## Recommendations

### Before Commit (CRITICAL - Fix Now):

{If critical issues:}
1. {Recommendation with time estimate}
2. {Recommendation with time estimate}
...

{If no critical:}
No blocking issues - ready for commit!

### Next Sprint (Improvements):

1. {Recommendation}
2. {Recommendation}
...

---

## Commit Decision

{If critical issues > 0:}
**DO NOT COMMIT YET**

**Reason:** {count} critical issue(s) must be resolved first
**Estimated Fix Time:** {hours}h
**Action:** Fix issues listed in `compliance_issues.md` and re-run code review

{If critical issues == 0 but high > 10:}
**COMMIT WITH CAUTION**

**Reason:** {count} high-priority issues detected
**Recommendation:** Schedule fixes for next sprint (see `fix_plan.md`)

{If critical == 0 and high < 10:}
**READY TO COMMIT**

**Quality:** {assessment} (Total issues: {count})
**Recommendation:** Address remaining issues in next sprint (see `fix_plan.md`)

---

## Quick Stats

- **Lines of Code Reviewed:** ~{estimate}
- **Average Issues per File:** {average}
- **Files with 0 Issues:** {count} ({percentage}%)
- **Most Common Issue:** {issue_type} ({count} occurrences)
- **Review Completed At:** {timestamp}

---

## Next Steps

1. Read detailed issues in `compliance_issues.md`
2. Follow remediation plan in `fix_plan.md`
3. Review per-file analyses in `files/` directory
4. Re-run code review after fixes: `/frontend:code-review "{task}"`
```

---

### 2. compliance_issues.md (Detailed Issues)

```markdown
# COMPLIANCE ISSUES

**Task:** {task_description}
**Date:** {timestamp}
**Total Issues:** {count}

---

## CRITICAL PRIORITY (Fix Before Commit)

{If no critical issues:}
**No critical issues detected!**

{For each critical issue:}
### Issue #{number}: {Title}

**File:** `{file_path}`
**Lines:** {line_start}-{line_end}
**Guideline:** frontend.md Section {section_number} - {section_name}
**Priority:** CRITICAL
**Estimated Fix Time:** {minutes} minutes

**Description:**
{Detailed description of the issue and why it violates guidelines}

**Current Code:**
```typescript
{code_snippet_showing_violation}
```

**Required Fix:**
```typescript
{code_snippet_showing_correct_implementation}
```

**Impact:** {Impact description}

**Why This Matters:**
{Explanation of consequences if not fixed}

---

## HIGH PRIORITY (Fix Within 1-2 Days)

{For each high priority issue - same format as critical}

### Issue #{number}: Single-Letter Lambda Parameters

**File:** `src/components/tasks/TaskList.tsx`
**Lines:** 45-48
**Guideline:** frontend.md Section 2.1 - Lambda Expressions
**Priority:** HIGH
**Estimated Fix Time:** 5 minutes

**Description:**
Lambda expressions use single-letter parameter names (`t`, `u`) instead of descriptive names.
This violates the MANDATORY naming convention from frontend.md.

**Current Code:**
```typescript
const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
const taskIds = tasks.map(t => t.id);
```

**Required Fix:**
```typescript
const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
const taskIds = tasks.map(task => task.id);
```

**Impact:** Code readability

**Why This Matters:**
Descriptive parameter names improve code comprehension and make debugging easier.

---

## MEDIUM PRIORITY (Fix Within 3-5 Days)

{For each medium priority issue - same format}

---

## LOW PRIORITY (Optional Improvements)

{For each low priority issue - same format}

---

## Issue Summary by File

### {file_name}

- Total Issues: {count}
- Breakdown: CRITICAL: {critical} | HIGH: {high} | MEDIUM: {medium} | LOW: {low}
- Issues: #{issue_numbers}

{Repeat for each file with issues}

---

## Issue Summary by Type

### Single-Letter Lambda Parameters
- Priority: HIGH
- Occurrences: {count}
- Files: {file_list}
- Total Fix Time: {minutes} minutes

### Inline Styles
- Priority: HIGH
- Occurrences: {count}
- Files: {file_list}
- Total Fix Time: {minutes} minutes

{Repeat for each issue type}

---

## References

All issues are based on guidelines from:
- **Primary:** `docs/guidelines/frontend.md`
- **Sections:** II (Code Style), III (Architecture), IV (Styling), V (Device), VI (Date), VII (Testing), VIII (Performance), XI (Best Practices)

For detailed explanations and examples, refer to the guidelines document.
```

---

### 3. fix_plan.md (Remediation Plan)

```markdown
# REMEDIATION PLAN

**Task:** {task_description}
**Date:** {timestamp}
**Total Estimated Effort:** {total_hours}h

---

## Pre-Commit Blockers (Must Complete Before Commit)

**Total Time:** {critical_hours}h

{If no critical issues:}
**No pre-commit blockers detected!**

{For each critical task:}
### Task {number}: {Task Title}

**Priority:** CRITICAL
**Estimated Time:** {hours}h
**Affected Files:** {count}

**Files:**
- `{file_path_1}`
- `{file_path_2}`
...

**Subtasks:**
- [ ] {Subtask description} (time: {minutes}min)
- [ ] {Subtask description} (time: {minutes}min)
- [ ] {Subtask description} (time: {minutes}min)

**Related Issues:** #{issue_numbers}

**Acceptance Criteria:**
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] Re-run code review shows 0 critical issues

---

## High Priority (Fix Within 1-2 Days)

**Total Time:** {high_hours}h

### Task {number}: Fix Lambda Parameter Names

**Priority:** HIGH
**Estimated Time:** 30min
**Affected Files:** 12

**Files:**
- `src/components/tasks/TaskList.tsx`
- `src/components/tasks/TaskItem.tsx`
- `src/hooks/useFilters.ts`
...

**Subtasks:**
- [ ] Search all lambda expressions with single-letter params (10min)
- [ ] Replace with descriptive names: `t` -> `task`, `u` -> `user`, etc. (15min)
- [ ] Run `npx tsc --noEmit` to verify no compilation errors (5min)

**Related Issues:** #1, #5, #12, #18, #23

**Acceptance Criteria:**
- [ ] Zero single-letter lambda parameters in source files
- [ ] TypeScript compiles without errors
- [ ] Grep search returns 0 results

---

### Task {number}: Convert Inline Styles to CSS Modules

**Priority:** HIGH
**Estimated Time:** 45min
**Affected Files:** 8

**Files:**
- `src/components/ui/Button.tsx` (3 inline styles)
- `src/components/tasks/TaskCard.tsx` (5 inline styles)
...

**Subtasks:**
- [ ] Identify all inline style objects (10min)
- [ ] Create/update corresponding .module.css files (20min)
- [ ] Replace inline styles with className references (15min)

**Related Issues:** #3, #7, #15

**Acceptance Criteria:**
- [ ] Zero `style={{}}` in TSX files
- [ ] All styles in CSS Modules
- [ ] Visual appearance unchanged

---

### Task {number}: Extract Magic Numbers to Constants

**Priority:** HIGH
**Estimated Time:** 20min
**Affected Files:** 5

**Files:**
- `src/components/map/layers/RoadLayer.tsx`
- `src/components/map/layers/TaskMarkerLayer.tsx`
...

**Subtasks:**
- [ ] Identify hardcoded numeric values (5min)
- [ ] Create constants in `src/constants/` (10min)
- [ ] Replace hardcoded values with constant references (5min)

**Related Issues:** #8, #14, #21

**Acceptance Criteria:**
- [ ] All numeric values use named constants
- [ ] Constants have descriptive names
- [ ] TypeScript compiles without errors

---

## Medium Priority (Fix Within 3-5 Days)

**Total Time:** {medium_hours}h

{For each medium task - same format}

---

## Low Priority (Schedule for Next Sprint)

**Total Time:** {low_hours}h

{For each low task - same format}

---

## Estimated Effort Breakdown

| Priority | Tasks | Issues | Time |
|----------|-------|--------|------|
| CRITICAL | {count} | {count} | {hours}h |
| HIGH | {count} | {count} | {hours}h |
| MEDIUM | {count} | {count} | {hours}h |
| LOW | {count} | {count} | {hours}h |
| **TOTAL** | **{count}** | **{count}** | **{hours}h** |

---

## Quick Wins (Fastest to Fix)

These issues can be resolved in < 10 minutes each:

1. **{Issue title}** - {file} - {time}min
2. **{Issue title}** - {file} - {time}min
...

**Total Quick Wins Time:** {minutes}min

---

## Dependencies

Some tasks may depend on others. Follow this order:

1. {Task} (blocks: {tasks})
2. {Task} (blocks: {tasks})
...

---

## Verification Checklist

After completing fixes, verify:

- [ ] `npx tsc --noEmit` - Successful TypeScript compilation
- [ ] `npm run lint` - ESLint passes with 0 errors
- [ ] `npm run build` - Production build succeeds
- [ ] `/frontend:code-review "{task}"` - Re-run code review
- [ ] Critical issues: 0
- [ ] High issues: < 5 (acceptable)
- [ ] Git commit with clean slate

---

## Recommended Workflow

### Phase 1: Critical Fixes (Blocking)
1. Fix all CRITICAL issues
2. Run `npx tsc --noEmit` to verify
3. Re-run code review
4. Proceed to commit if 0 critical

### Phase 2: High Priority (Same Day/Next Day)
1. Fix HIGH issues in batches
2. Start with "Quick Wins" for momentum
3. Commit fixes incrementally with descriptive messages

### Phase 3: Medium Priority (This Week)
1. Schedule time for MEDIUM issues
2. Group similar issues (e.g., all memoization improvements)
3. Commit when category is complete

### Phase 4: Low Priority (Next Sprint)
1. Add LOW issues to backlog
2. Include in next sprint planning
3. Optional: Fix during downtime

---

## Notes

- Time estimates are conservative (buffer included)
- Some issues may be fixed faster with IDE refactoring tools
- Re-run code review after each phase to track progress
- Document any guideline exceptions with justification
```

---

### 4. files/[FileName].md (Per-File Analysis)

Create a separate file for each analyzed file with issues.

**Filename format:** `files/{sanitized_file_name}.md`

**Example:** `files/TaskList.tsx.md`

```markdown
# Analysis: {FileName}

**Full Path:** `{absolute_or_relative_path}`
**Category:** {Component/Hook/Utility/Store/Type/etc.}
**Lines of Code:** {count}
**Last Modified:** {git_log_date}
**Overall Assessment:** GOOD / NEEDS IMPROVEMENT / CRITICAL ISSUES

---

## Summary

{Brief description of the file's purpose and overall code quality}

**Key Strengths:**
- {Positive aspect 1}
- {Positive aspect 2}

**Areas for Improvement:**
- {Issue category 1}
- {Issue category 2}

---

## Issues Found

**Total:** {count} ({breakdown_by_priority})

{For each issue in this file:}
### Issue #{global_issue_number}: {Title}

**Priority:** {LEVEL}
**Lines:** {start}-{end}
**Guideline:** frontend.md Section {number} - {name}

**Description:**
{What's wrong and why}

**Current Code:**
```typescript
{code_snippet_with_line_numbers}
```

**Required Fix:**
```typescript
{corrected_code_snippet}
```

**Explanation:**
{Why this fix is needed and how it aligns with guidelines}

**Estimated Fix Time:** {minutes} minutes

---

{Repeat for all issues in this file}

---

## Guideline Compliance Checklist

### Code Style
- [x] Naming conventions
- [!] Descriptive lambda names ({violations} violations)
- [x] Component size within limits
- [x] Props limit
- [x] TypeScript strict mode

### Architecture
- [x] Zustand atomic selectors
- [x] Custom hooks pattern
- [x] Proper component structure
- [!] memo() usage (missing)

### Styling
- [!] CSS Modules ({inline_styles} inline styles)
- [x] Mantine variables
- [x] Z-index constants

### Performance
- [!] Memoization ({missing_count} opportunities)
- [x] Code splitting

### Best Practices
- [x] No console.log
- [x] i18n coverage
- [x] Type safety

---

## Recommendations

### Immediate (This File):
1. {Specific recommendation for this file}
2. {Specific recommendation for this file}

### Future Improvements:
1. {Optional enhancement}
2. {Optional enhancement}

---

## Code Metrics

- **Complexity:** {Low/Medium/High}
- **Lines of Code:** {count}
- **Number of Functions:** {count}
- **Number of Hooks:** {count}
- **Props Count:** {count}

---

## Related Files

{If this file has dependencies or is related to others:}
- **Used by:** `{file_path_1}`, `{file_path_2}`
- **Depends on:** `{file_path_1}`, `{file_path_2}`
- **Types from:** `{types_file}`
- **Styles from:** `{css_module_file}`

---

## Review Notes

{Any additional observations, context, or notes about this file}

**Reviewed by:** Claude Code Review Agent
**Review Date:** {timestamp}
```

---

## Priority Classification Rules

### CRITICAL (Blocking Commit)

**Definition:** Issues that violate mandatory patterns, cause build errors, or create security vulnerabilities.

**Examples:**
- Components > 300 lines (hard limit)
- Functions > 50 lines (hard limit)
- `any` type usage without justification
- Security vulnerabilities (hardcoded secrets, XSS risk)
- Build-breaking code (TypeScript errors)
- Missing error boundaries in critical sections

**Action:** MUST be fixed before commit

---

### HIGH (Fix Within 1-2 Days)

**Definition:** Issues that significantly impact code quality, readability, or violate important guidelines.

**Examples:**
- Single-letter lambda parameters (`t =>`, `u =>`, `x =>`)
- Inline styles (`style={{}}`)
- Magic numbers/strings (hardcoded values)
- Object Zustand selectors (should be atomic)
- Hardcoded z-index values
- Missing useShallow for array selectors
- console.log statements
- Components 200-300 lines (soft limit exceeded)

**Action:** Fix soon, schedule in current sprint

---

### MEDIUM (Fix Within 3-5 Days)

**Definition:** Issues that reduce code quality but don't block functionality.

**Examples:**
- Missing useMemo/useCallback (performance opportunity)
- Code duplication (DRY principle)
- Missing memo() wrapper (optional optimization)
- Import order violations
- Functions 20-50 lines (soft limit exceeded)
- Missing TypeScript types (using inferred types)

**Action:** Include in next sprint or current sprint if time allows

---

### LOW (Nice to Have)

**Definition:** Minor improvements, optimizations, or stylistic preferences.

**Examples:**
- Minor naming improvements
- Optional refactoring opportunities
- Additional type annotations
- Comment improvements
- Test coverage improvements

**Action:** Backlog, address when convenient

---

## Common Violations Examples

### Single-Letter Lambda Parameters

**WRONG:**
```typescript
// Single letters are NOT descriptive
tasks.filter(t => t.status === 'COMPLETED')
users.map(u => u.name)
items.sort((a, b) => a.priority - b.priority)
```

**CORRECT:**
```typescript
// Use full, descriptive names
tasks.filter(task => task.status === 'COMPLETED')
users.map(user => user.name)
items.sort((itemA, itemB) => itemA.priority - itemB.priority)
```

**Guideline:** frontend.md Section 2.1
**Priority:** HIGH

---

### Inline Styles

**WRONG:**
```typescript
<div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px' }}>
  <span style={{ color: 'red', fontWeight: 'bold' }}>Error!</span>
</div>
```

**CORRECT:**
```typescript
// Button.module.css
.container {
  padding: var(--mantine-spacing-md);
  background-color: var(--mantine-color-white);
  border-radius: var(--mantine-radius-md);
}

.errorText {
  color: var(--mantine-color-red-6);
  font-weight: var(--mantine-font-weight-bold);
}

// Button.tsx
import styles from './Button.module.css';

<div className={styles.container}>
  <span className={styles.errorText}>Error!</span>
</div>
```

**Guideline:** frontend.md Section 4.1
**Priority:** HIGH

---

### Object Zustand Selectors

**WRONG:**
```typescript
// Re-renders on ANY ui change - performance issue!
const ui = useGeoMarkupStore(state => state.ui);
const taskForm = ui.taskForm;

// Also wrong - selecting entire slice
const tasks = useGeoMarkupStore(state => state.tasks);
```

**CORRECT:**
```typescript
// Atomic selector - only re-renders when THIS specific value changes
const isOpen = useGeoMarkupStore(state => state.ui.taskForm.isOpen);
const mode = useGeoMarkupStore(state => state.ui.taskForm.mode);

// For arrays/objects, use useShallow
import { useShallow } from 'zustand/react/shallow';
const tasks = useGeoMarkupStore(useShallow(state => state.tasks.items));
```

**Guideline:** frontend.md Section 3.1
**Priority:** HIGH

---

### Magic Numbers (Hardcoded Values)

**WRONG:**
```typescript
const layerPaint = {
  'line-color': '#ef4444',
  'line-width': 3,
  'line-opacity': 0.25,
  'line-blur': 2,
};

setTimeout(callback, 500);
<Modal zIndex={9999} />
```

**CORRECT:**
```typescript
import {
  DEFAULT_LINE_COLOR,
  LINE_DEFAULT_WIDTH,
  GLOW_OPACITY,
  BLUR_SELECTED,
  ANIMATION_DURATION_MS,
} from '@/constants';
import { Z_INDEX_MODAL } from '@/constants/zIndex';

const layerPaint = {
  'line-color': DEFAULT_LINE_COLOR,
  'line-width': LINE_DEFAULT_WIDTH,
  'line-opacity': GLOW_OPACITY,
  'line-blur': BLUR_SELECTED,
};

setTimeout(callback, ANIMATION_DURATION_MS);
<Modal zIndex={Z_INDEX_MODAL} />
```

**Guideline:** frontend.md Section 2.4
**Priority:** HIGH

---

### Direct Date Formatting

**WRONG:**
```typescript
// Local function - violates single source of truth
const formatDate = (date: Date) => date.toLocaleDateString('pl-PL');

// Direct API usage
const formatted = new Date(task.dueDate).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
```

**CORRECT:**
```typescript
import { useLocalizedDate } from '@/hooks';

function TaskCard({ task }: TaskCardProps) {
  const { formatDateShort, formatRelativeTime } = useLocalizedDate();

  return (
    <div>
      <span>{formatDateShort(task.dueDate)}</span>
      <span>{formatRelativeTime(task.createdAt)}</span>
    </div>
  );
}
```

**Guideline:** frontend.md Section 6.1
**Priority:** HIGH

---

### Direct Device Detection Comparisons

**WRONG:**
```typescript
// Direct comparison - violates abstraction
if (layoutMode === 'mobile') {
  return <MobileLayout />;
}

if (inputMode === 'touch') {
  enableGestures();
}
```

**CORRECT:**
```typescript
import { useDeviceLayout } from '@/hooks';

function ResponsiveComponent() {
  const { isMobile, isTouch, hasHover } = useDeviceLayout();

  if (isMobile) {
    return <MobileLayout />;
  }

  if (isTouch) {
    enableGestures();
  }

  if (hasHover) {
    enableHoverEffects();
  }

  return <DesktopLayout />;
}
```

**Guideline:** frontend.md Section 5.1
**Priority:** HIGH

---

### Missing Memoization

**WRONG:**
```typescript
function TaskList({ tasks, filter }: TaskListProps) {
  // Recalculates on every render
  const filteredTasks = tasks.filter(task => task.status === filter);

  // New function reference on every render
  const handleClick = (id: string) => {
    selectTask(id);
  };

  return (
    <div>
      {filteredTasks.map(task => (
        <TaskItem key={task.id} onClick={handleClick} />
      ))}
    </div>
  );
}
```

**CORRECT:**
```typescript
import { useMemo, useCallback, memo } from 'react';

const TaskList = memo(function TaskList({ tasks, filter }: TaskListProps) {
  // Only recalculates when dependencies change
  const filteredTasks = useMemo(
    () => tasks.filter(task => task.status === filter),
    [tasks, filter]
  );

  // Stable function reference
  const handleClick = useCallback((id: string) => {
    selectTask(id);
  }, [selectTask]);

  return (
    <div>
      {filteredTasks.map(task => (
        <TaskItem key={task.id} onClick={handleClick} />
      ))}
    </div>
  );
});
```

**Guideline:** frontend.md Section 8.2
**Priority:** MEDIUM

---

### console.log in Production Code

**WRONG:**
```typescript
function handleSubmit(data: FormData) {
  console.log('Submitting:', data);
  console.log('User:', currentUser);
  // ...
}
```

**CORRECT:**
```typescript
function handleSubmit(data: FormData) {
  // console.log removed - use DevTools for debugging

  // Only errors are acceptable
  try {
    await submitForm(data);
  } catch (error) {
    console.error('Failed to submit form:', error);
    showNotification({ type: 'error', message: t('errors.submitFailed') });
  }
}

// For development-only logging:
if (import.meta.env.DEV) {
  console.warn('Development warning:', debugInfo);
}
```

**Guideline:** frontend.md Section 11.2
**Priority:** HIGH

---

### any Type Usage

**WRONG:**
```typescript
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

const handleEvent = (event: any) => {
  console.log(event.target.value);
};
```

**CORRECT:**
```typescript
interface DataItem {
  value: string;
  id: string;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value);
}

// For unknown external data, use unknown with type guards
function processUnknownData(data: unknown): DataItem[] {
  if (isDataItemArray(data)) {
    return data;
  }
  throw new Error('Invalid data format');
}

const handleEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
  console.log(event.target.value);
};
```

**Guideline:** frontend.md Section 2.3
**Priority:** CRITICAL

---

## Execution Steps

Follow these steps to perform the code review:

### Step 1: Read Guidelines Reference

```bash
# Load the source of truth for all compliance checks
cat docs/guidelines/frontend.md
```

Keep the "Summary Checklist" section (at the end of frontend.md) as your primary reference.

### Step 2: Collect Files for Review

Run the git integration commands to get list of files:

```bash
# Execute the commands from "Git Integration Commands" section above
git diff --staged --name-only | grep -E '\.(ts|tsx|css)$' > /tmp/frontend_staged.txt
git ls-files --others --exclude-standard src/ | grep -E '\.(ts|tsx|css)$' > /tmp/frontend_untracked.txt
cat /tmp/frontend_staged.txt /tmp/frontend_untracked.txt | sort -u > /tmp/frontend_all_files.txt
```

### Step 3: Analyze Each File

For each file in the list, dispatch a **dedicated subagent via the Task tool (model: opus)** to perform the analysis. Each subagent should:

1. **Read file content** using Read tool
2. **Cross-reference against guidelines** from frontend.md
3. **Document issues** with:
   - Exact line numbers
   - Guideline section reference
   - Code examples (current vs. required)
   - Priority assignment
   - Time estimate

4. **Prioritize files:**
   - Components (src/components/)
   - Hooks (src/hooks/)
   - Store (src/store/)
   - Utils (src/utils/)
   - Types (src/types/)
   - CSS Modules (*.module.css)

### Step 4: Search for Common Anti-Patterns

Run the grep commands from "Anti-Pattern Detection Commands" section:

```bash
# Execute all anti-pattern searches
# Cross-reference results with manual file analysis
# Add any missed issues to the report
```

### Step 5: Generate Reports

Create output directory:

```bash
mkdir -p .claude/frontend-code-review/{timestamp}_{task_slug}/files/
```

Generate all 4 reports using the templates above:

1. **review_report.md** - Start with executive summary, fill in compliance matrix
2. **compliance_issues.md** - List all issues by priority with code examples
3. **fix_plan.md** - Create remediation tasks with time estimates
4. **files/*.md** - Generate per-file analysis for each file with issues

### Step 6: Summary and Decision

Print to console:

```
====================================
FRONTEND CODE REVIEW COMPLETE
====================================

Files Analyzed: {count}
Total Issues: {count}
  CRITICAL: {count}
  HIGH: {count}
  MEDIUM: {count}
  LOW: {count}

{If critical > 0:}
COMMIT BLOCKED
Critical issues must be fixed first!

{If critical == 0:}
READY TO COMMIT
Review summary: {assessment}

Reports saved to:
.claude/frontend-code-review/{timestamp}_{task_slug}/

Next steps:
1. Review detailed issues in compliance_issues.md
2. Follow remediation plan in fix_plan.md
3. Re-run after fixes: /frontend:code-review "{task}"
```

---

## Tips for Effective Review

### File Reading Strategy

- **Read file once**, take notes on all issues
- **Don't re-read** unless necessary (performance)
- **Use grep** to quickly find patterns across all files
- **Group similar issues** (e.g., all single-letter lambdas)

### Issue Documentation

- **Be specific**: Include line numbers and code snippets
- **Be helpful**: Show both current and correct code
- **Be educational**: Explain WHY it's an issue
- **Be practical**: Provide realistic time estimates

### Priority Assignment

- **Critical**: Ask "Does this block the commit?" -> YES = Critical
- **High**: Ask "Does this significantly impact quality?" -> YES = High
- **Medium**: Ask "Is this a nice improvement?" -> YES = Medium
- **Low**: Ask "Is this optional?" -> YES = Low

### Time Estimates

- **Single-letter lambda**: 2-5 min per occurrence
- **Inline style -> CSS Module**: 5-10 min per component
- **Magic number extraction**: 3-5 min per value
- **Object selector -> atomic**: 5-10 min per selector
- **console.log removal**: 1-2 min per occurrence

### Common Patterns

Look for these patterns in React/TypeScript code:

- **Components**: Inline styles, magic numbers, missing memo()
- **Hooks**: Object selectors, missing dependencies, no memoization
- **Store**: Object subscriptions, missing useShallow
- **Utils**: any types, single-letter lambdas
- **CSS Modules**: Hardcoded colors, missing Mantine variables

---

## Quality Assurance

Before finalizing the review, verify:

- [ ] All files from git list have been analyzed
- [ ] All grep anti-pattern results have been cross-referenced
- [ ] Every issue has a priority, file path, line numbers, and code example
- [ ] Time estimates are realistic and sum correctly
- [ ] Compliance matrix status (PASS/WARN/FAIL) is accurate
- [ ] Commit decision matches critical issue count
- [ ] All 4 reports are generated and complete
- [ ] File analyses exist for all files with issues
- [ ] References to frontend.md sections are correct

---

## Final Notes

- This review is based on `docs/guidelines/frontend.md` as the single source of truth
- All priority classifications follow the rules defined in this skill
- Time estimates include buffer for unexpected issues
- The goal is to ensure code quality while being pragmatic about delivery timelines
- When in doubt, prioritize architecture violations (Zustand patterns, CSS Modules) as HIGH
- Re-run this review after fixing issues to verify improvements
- To automatically fix detected issues, run `/frontend:fix-issues` with the review report

**End of Skill Definition**
