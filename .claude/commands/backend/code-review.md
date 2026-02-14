# Backend Code Review

> **Purpose:** Comprehensive code review of .NET 10 backend changes before commit
> **Guidelines Reference:** `docs/guidelines/backend.md`
> **Stack:** .NET 10, C# 12, Minimal API, EF Core 10, PostgreSQL + PostGIS, Wolverine CQRS

---

## Instruction

Perform a comprehensive pre-commit code review of .NET 10 backend changes, validating compliance with `docs/guidelines/backend.md` guidelines.

**Task Description:** $ARGUMENTS

---

## Files to Review

Analyze the following:

1. **Staged files** - Files added to git staging area (`git diff --staged`)
2. **Untracked files** - New files in `backend/` directory not yet tracked by git
3. **Modified .csproj files** - Check for package versions and dependencies

---

## Analysis Categories

### 1. Code Style Compliance (backend.md Section II)

- [ ] **Top-to-bottom reading** - Private methods appear below their last usage
- [ ] **Method design** - Methods < 20 lines (soft), NEVER > 50 (hard), complexity < 10, parameters < 5
- [ ] **Lambda expressions** - Descriptive names (NO single letters: `t =>`, `u =>`, `x =>`, `s =>`)
- [ ] **Naming conventions** - NO abbreviations (except: Id, Url, Http, Dto, Sql, Json)
- [ ] **Braces policy** - ALWAYS use `{}` for if/else, try/catch, using, for, while
- [ ] **Modern C# 12 syntax** - File-scoped namespaces, primary constructors, collection expressions
- [ ] **Language** - English ONLY for all code and comments

### 2. Architecture Compliance (backend.md Section III)

- [ ] **Wolverine CQRS pattern** - Commands/Queries via IMessageBus
- [ ] **Vertical Slices** - Feature per file (Command + Handler + Endpoint)
- [ ] **TypedResults** - Explicit response types with `Results<T1, T2>`
- [ ] **Repository Pattern** - NO direct DbContext in handlers (CRITICAL)
- [ ] **Unit of Work** - Transaction management via IUnitOfWork
- [ ] **DDD patterns** - Entity, ValueObject, AggregateRoot, Domain Events
- [ ] **Clean Architecture layers** - Presentation -> Application -> Domain -> Infrastructure
- [ ] **Minimal Program.cs** - Configs extracted to extension methods

### 3. Entity Framework Core (backend.md Section IV)

- [ ] **Fluent API** - Separate `IEntityTypeConfiguration<T>` classes
- [ ] **SQL-based migrations** - Proper migration files
- [ ] **AsNoTracking** - Used for read-only queries
- [ ] **Projection** - Select only needed columns (`.Select(...)`)
- [ ] **Batching** - Use `AddRangeAsync()`, single `SaveChangesAsync()`
- [ ] **No N+1 queries** - Use `.Include()` or projection
- [ ] **PostgreSQL + PostGIS** - UseNetTopologySuite() configured

### 4. Design Patterns (backend.md Section V)

- [ ] **Strategy Pattern** - Used appropriately (not over-engineered)
- [ ] **Factory Pattern** - Complex object creation with initialization
- [ ] **Pattern application** - Value-adding, not theoretical

### 5. Additional Best Practices (backend.md Section VII)

- [ ] **Error handling** - OneOf for explicit error handling
- [ ] **Validation** - Manual or FluentValidation, returns `ValidationResult`
- [ ] **Logging** - Structured logging with `ILogger<T>`
- [ ] **Async/await** - CancellationToken in ALL async methods
- [ ] **DI lifetimes** - Correct lifetimes (Transient, Scoped, Singleton)
- [ ] **Security** - Authorization policies, input sanitization
- [ ] **NuGet packages** - Latest STABLE versions only

---

## Git Integration Commands

Execute the following bash commands to collect files for review:

```bash
# 1. Get staged files
git diff --staged --name-only | grep -E '\.(cs|csproj)$' > /tmp/dotnet_staged.txt

# 2. Get untracked backend files
git ls-files --others --exclude-standard backend/ | grep -E '\.(cs|csproj)$' > /tmp/dotnet_untracked.txt

# 3. Combine and sort unique
cat /tmp/dotnet_staged.txt /tmp/dotnet_untracked.txt | sort -u > /tmp/dotnet_all_files.txt

# 4. Count files
echo "Files to review: $(wc -l < /tmp/dotnet_all_files.txt)"
cat /tmp/dotnet_all_files.txt
```

### Anti-Pattern Detection Commands

Run these grep searches to detect common violations:

```bash
# Single-letter lambda parameters
echo "=== Single-Letter Lambdas ==="
grep -rn '\b[a-z]\s*=>' backend/ --include="*.cs" | grep -E '\bt\s*=>|\bu\s*=>|\bx\s*=>|\bs\s*=>|\be\s*=>|\bi\s*=>|\bc\s*=>' | head -20

# Direct DbContext usage (outside Repository.cs and Configuration.cs)
echo "=== Direct DbContext Access ==="
grep -rn 'AppDbContext' backend/ --include="*.cs" | grep -v 'Repository.cs' | grep -v 'Configuration.cs' | grep -v 'DbContext.cs' | grep -v 'UnitOfWork.cs' | head -20

# Missing CancellationToken
echo "=== Missing CancellationToken ==="
grep -rn 'async Task' backend/ --include="*.cs" | grep -v 'CancellationToken' | grep -v 'Test' | head -20

# Abbreviations in variable/parameter names
echo "=== Abbreviations ==="
grep -rn '\b(ctx|usr|msg|req|res|tmp|mgr|str|num|obj|arr|lst|dict)\b' backend/ --include="*.cs" | grep -v '\.cs:.*//.*\b(ctx|usr)' | head -20

# Methods exceeding limits (check manually for context and complexity)
echo "=== Methods Requiring Length Review ==="
# Manual check: >50 lines = CRITICAL, 20-50 lines = check complexity and context
# Valid contexts for 20-30 lines: validation, endpoint config, mapping, algorithms
```

---

## Output Structure

Create the following directory and files:

**Directory:** `.claude/backend-code-review/{timestamp}_{task_slug}/`

**Note:** The `.claude` directory is located at the project root level (same level as `backend/`), not inside the backend directory.

Where:
- `{timestamp}` = Current date/time in format `YYYYMMDD_HHMMSS`
- `{task_slug}` = Sanitized task description (lowercase, spaces -> underscores, max 50 chars)

**Example:** `.claude/backend-code-review/20260102_234500_phase4_database_ef_core/`

### Files to Generate:

1. **review_report.md** - Executive summary with compliance matrix
2. **compliance_issues.md** - Detailed issues with code examples
3. **fix_plan.md** - Remediation plan with priorities and time estimates
4. **files/** - Directory with per-file analyses (e.g., `files/TaskRepository.cs.md`)

---

## Report File Formats

### 1. review_report.md (Executive Summary)

```markdown
# .NET CODE REVIEW REPORT

**Date:** {YYYY-MM-DD HH:MM:SS}
**Task:** {task_description}
**Files Analyzed:** {count}
**Branch:** {current_git_branch}

---

## Executive Summary

- **Overall Assessment:** [RED CRITICAL / ORANGE HIGH PRIORITY / YELLOW MEDIUM / GREEN GOOD]
- **Total Issues:** {count}
  - RED CRITICAL: {count}
  - ORANGE HIGH: {count}
  - YELLOW MEDIUM: {count}
  - GREEN LOW: {count}
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
| EF Core | FAIL/WARN/PASS | {count} | {critical_count} |
| Design Patterns | FAIL/WARN/PASS | {count} | {critical_count} |
| Best Practices | FAIL/WARN/PASS | {count} | {critical_count} |

**Legend:**
- PASS Compliant (0 critical, 0-2 minor issues)
- WARN Partial compliance (3-10 issues, no blockers)
- FAIL Non-compliant (>10 issues or critical blockers)

---

## Critical Blockers (Must Fix Before Commit)

{If no critical issues:}
PASS **No critical blockers detected!**

{If critical issues exist:}
1. **{Issue title}** - File: `{file_path}`, Lines: {line_range}
2. **{Issue title}** - File: `{file_path}`, Lines: {line_range}
...

---

## Summary by Category

### Code Style ({count} issues)

- PASS Top-to-bottom reading: {pass/fail}
- PASS Methods within limits: {pass/fail} ({critical_violations_count} >50 lines, {high_violations_count} 20-50 without valid context, {soft_violations_count} >20 soft limit)
- WARN Descriptive lambda names: {violations_count} violations in {files_count} files
- PASS NO abbreviations: {pass/fail} ({violations_count} violations)
- WARN Braces policy: {violations_count} violations
- PASS Modern C# 12 syntax: {pass/fail}
- PASS English only: {pass/fail}

**Key Issues:**
- Single-letter lambdas: {count} occurrences in {list_of_files}
- Abbreviations: {count} occurrences ({list_most_common})

### Architecture ({count} issues)

- PASS Wolverine CQRS: {pass/fail}
- PASS Repository Pattern: {pass/fail} (NO direct DbContext PASS)
- PASS Unit of Work: {pass/fail}
- PASS DDD patterns: {pass/fail}
- PASS TypedResults: {pass/fail}
- PASS Clean Architecture layers: {pass/fail}
- PASS Minimal Program.cs: {pass/fail}

**Key Issues:**
- {List any architecture violations}

### Entity Framework Core ({count} issues)

- PASS Fluent API configurations: {pass/fail}
- WARN AsNoTracking for reads: {missing_count} queries missing
- WARN Projection optimizations: {count} opportunities
- PASS No N+1 queries: {pass/fail}
- PASS PostgreSQL + PostGIS: {pass/fail}

**Key Issues:**
- AsNoTracking missing in: {list_of_methods}

### Best Practices ({count} issues)

- PASS OneOf error handling: {pass/fail}
- WARN Structured logging: {missing_count} files without logging
- PASS CancellationToken: {pass/fail} ({missing_count} missing)
- PASS Latest STABLE packages: {pass/fail}
- PASS Authorization + sanitization: {pass/fail}

---

## Files Requiring Attention

### Top 10 Files with Most Issues:

1. **{file_name}** - {total_issues} issues (RED {critical}, ORANGE {high}, YELLOW {medium}, GREEN {low})
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
PASS No blocking issues - ready for commit!

### Next Sprint (Improvements):

1. {Recommendation}
2. {Recommendation}
...

---

## Commit Decision

{If critical issues > 0:}
FAIL **DO NOT COMMIT YET**

**Reason:** {count} critical issue(s) must be resolved first
**Estimated Fix Time:** {hours}h
**Action:** Fix issues listed in `compliance_issues.md` and re-run code review

{If critical issues == 0 but high > 10:}
WARN **COMMIT WITH CAUTION**

**Reason:** {count} high-priority issues detected
**Recommendation:** Schedule fixes for next sprint (see `fix_plan.md`)

{If critical == 0 and high < 10:}
PASS **READY TO COMMIT**

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
4. Re-run code review after fixes: `/backend:code-review "{task}"`
```

---

### 2. compliance_issues.md (Detailed Issues)

```markdown
# COMPLIANCE ISSUES

**Task:** {task_description}
**Date:** {timestamp}
**Total Issues:** {count}

---

## RED CRITICAL PRIORITY (Fix Before Commit)

{If no critical issues:}
PASS **No critical issues detected!**

{For each critical issue:}
### Issue #{number}: {Title}

**File:** `{file_path}`
**Lines:** {line_start}-{line_end}
**Guideline:** backend.md Section {section_number} - {section_name}
**Priority:** RED CRITICAL
**Estimated Fix Time:** {minutes} minutes

**Description:**
{Detailed description of the issue and why it violates guidelines}

**Current Code:**
```csharp
{code_snippet_showing_violation}
```

**Required Fix:**
```csharp
{code_snippet_showing_correct_implementation}
```

**Impact:** {Impact description - e.g., "Architecture violation", "Runtime error", etc.}

**Why This Matters:**
{Explanation of consequences if not fixed}

---

## ORANGE HIGH PRIORITY (Fix Within 1-2 Days)

{For each high priority issue - same format as critical}

### Issue #{number}: Single-Letter Lambda Parameters

**File:** `backend/GeoMarkup.Infrastructure/Repositories/TaskRepository.cs`
**Lines:** 38-42
**Guideline:** backend.md Section 2.3 - Lambda Expressions
**Priority:** ORANGE HIGH
**Estimated Fix Time:** 5 minutes

**Description:**
Lambda expressions use single-letter parameter names (`t`, `u`) instead of descriptive names.
This violates the MANDATORY naming convention from backend.md.

**Current Code:**
```csharp
var query = _dbSet
    .Where(t => t.WorkspaceId == workspaceId)
    .Where(t => t.Status == status);
```

**Required Fix:**
```csharp
var query = _dbSet
    .Where(task => task.WorkspaceId == workspaceId)
    .Where(task => task.Status == status);
```

**Impact:** Code readability

**Why This Matters:**
Descriptive parameter names improve code comprehension and make debugging easier.
Single-letter names are acceptable only in very short, obvious contexts (e.g., `(x, y) => x + y`),
but NOT in business logic queries.

---

## YELLOW MEDIUM PRIORITY (Fix Within 3-5 Days)

{For each medium priority issue - same format}

---

## GREEN LOW PRIORITY (Optional Improvements)

{For each low priority issue - same format}

---

## Issue Summary by File

### {file_name}

- Total Issues: {count}
- Breakdown: RED {critical} | ORANGE {high} | YELLOW {medium} | GREEN {low}
- Issues: #{issue_numbers}

{Repeat for each file with issues}

---

## Issue Summary by Type

### Single-Letter Lambda Parameters
- Priority: ORANGE HIGH
- Occurrences: {count}
- Files: {file_list}
- Total Fix Time: {minutes} minutes

### Missing AsNoTracking
- Priority: ORANGE HIGH
- Occurrences: {count}
- Files: {file_list}
- Total Fix Time: {minutes} minutes

{Repeat for each issue type}

---

## References

All issues are based on guidelines from:
- **Primary:** `docs/guidelines/backend.md`
- **Sections:** II (Code Style), III (Architecture), IV (EF Core), VII (Best Practices)

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
PASS **No pre-commit blockers detected!**

{For each critical task:}
### Task {number}: {Task Title}

**Priority:** RED CRITICAL
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

**Priority:** ORANGE HIGH
**Estimated Time:** 30min
**Affected Files:** 8

**Files:**
- `backend/GeoMarkup.Infrastructure/Repositories/TaskRepository.cs`
- `backend/GeoMarkup.Infrastructure/Repositories/UserRepository.cs`
- `backend/GeoMarkup.Infrastructure/Repositories/WorkspaceRepository.cs`
...

**Subtasks:**
- [ ] Search all lambda expressions with single-letter params (10min)
- [ ] Replace with descriptive names: `t` -> `task`, `u` -> `user`, etc. (15min)
- [ ] Run `dotnet build` to verify no compilation errors (5min)

**Related Issues:** #1, #5, #12, #18, #23

**Acceptance Criteria:**
- [ ] Zero single-letter lambda parameters in repository files
- [ ] Code compiles without errors
- [ ] Grep search `grep -rn '\bt\s*=>' backend/` returns 0 results

---

### Task {number}: Add AsNoTracking to Read Queries

**Priority:** ORANGE HIGH
**Estimated Time:** 20min
**Affected Files:** 3

**Files:**
- `backend/GeoMarkup.Infrastructure/Repositories/TaskRepository.cs` (2 queries)
- `backend/GeoMarkup.Infrastructure/Repositories/UserRepository.cs` (1 query)

**Subtasks:**
- [ ] Identify all read-only queries (10min)
- [ ] Add `.AsNoTracking()` after `_dbSet` (5min)
- [ ] Test queries return correct results (5min)

**Related Issues:** #7, #14

**Acceptance Criteria:**
- [ ] All read-only queries use AsNoTracking
- [ ] Performance improvement measurable (optional)
- [ ] Integration tests pass (if available)

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
| RED CRITICAL | {count} | {count} | {hours}h |
| ORANGE HIGH | {count} | {count} | {hours}h |
| YELLOW MEDIUM | {count} | {count} | {hours}h |
| GREEN LOW | {count} | {count} | {hours}h |
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

- [ ] `dotnet build backend/` - Successful compilation
- [ ] `dotnet test backend/` - All tests pass (if available)
- [ ] `/backend:code-review "{task}"` - Re-run code review
- [ ] Critical issues: 0
- [ ] High issues: < 5 (acceptable)
- [ ] Git commit with clean slate

---

## Recommended Workflow

### Phase 1: Critical Fixes (Blocking)
1. Fix all RED CRITICAL issues
2. Run `dotnet build` to verify
3. Re-run code review
4. Proceed to commit if 0 critical

### Phase 2: High Priority (Same Day/Next Day)
1. Fix ORANGE HIGH issues in batches
2. Start with "Quick Wins" for momentum
3. Commit fixes incrementally with descriptive messages

### Phase 3: Medium Priority (This Week)
1. Schedule time for YELLOW MEDIUM issues
2. Group similar issues (e.g., all logging improvements)
3. Commit when category is complete

### Phase 4: Low Priority (Next Sprint)
1. Add GREEN LOW issues to backlog
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

**Example:** `files/TaskRepository.cs.md`

**IMPORTANT: Subagent Delegation** - Each file analysis MUST be performed by a dedicated subagent using the Task tool with `subagent_type: "backend-reviewer"` and `model: opus`. Pass the file path, the full analysis checklist (from the Analysis Categories section above), and the guidelines reference to each subagent. This ensures thorough, isolated analysis of each file without context window pressure on the orchestrator.

```markdown
# Analysis: {FileName}

**Full Path:** `{absolute_or_relative_path}`
**Category:** {Entity/Repository/Configuration/Handler/etc.}
**Lines of Code:** {count}
**Last Modified:** {git_log_date}
**Overall Assessment:** PASS GOOD / WARN NEEDS IMPROVEMENT / FAIL CRITICAL ISSUES

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
**Guideline:** backend.md Section {number} - {name}

**Description:**
{What's wrong and why}

**Current Code:**
```csharp
{code_snippet_with_line_numbers}
```

**Required Fix:**
```csharp
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
- [x] Top-to-bottom reading
- [x] Methods within limits: < 20 (soft) / < 50 (hard), complexity < 10 (longest: {max_lines})
- [WARN] Descriptive lambda names ({violations} violations)
- [x] NO abbreviations
- [x] Braces policy
- [x] Modern C# 12 syntax
- [x] English only

### Architecture
- [x] Repository Pattern implementation
- [x] Proper inheritance structure
- [x] Clean Architecture layers
- [x] CancellationToken in async methods

### Entity Framework Core
- [x] Proper LINQ usage
- [x] Include for eager loading where needed
- [WARN] AsNoTracking missing in {count} read query(ies)
- [x] No N+1 queries detected
- [x] Spatial queries (PostGIS) - if applicable

### Best Practices
- [x] Error handling with OneOf (if applicable)
- [WARN] Structured logging missing
- [x] Async/await patterns
- [x] Proper DI usage

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
- **Maintainability:** {score_if_available}
- **Test Coverage:** {percentage_if_available}
- **Dependencies:** {count_of_injected_dependencies}

---

## Related Files

{If this file has dependencies or is related to others:}
- **Used by:** `{file_path_1}`, `{file_path_2}`
- **Depends on:** `{file_path_1}`, `{file_path_2}`
- **Related entities:** `{Entity1}`, `{Entity2}`

---

## Review Notes

{Any additional observations, context, or notes about this file}

**Reviewed by:** Claude Code Review Agent
**Review Date:** {timestamp}
```

---

## Priority Classification Rules

### RED CRITICAL (Blocking Commit)

**Definition:** Issues that violate mandatory architecture patterns, cause compilation errors, or create security vulnerabilities.

**Examples:**
- Direct DbContext usage in handlers (violates Repository Pattern)
- Missing required patterns (IEntityTypeConfiguration, IUnitOfWork)
- Methods > 50 lines (hard limit - NEVER acceptable)
- Methods 20-50 lines with cyclomatic complexity > 10
- Methods 20-50 lines without valid context (validation, endpoint config, mapping, algorithm)
- Architecture layer violations (e.g., Domain depending on Infrastructure)
- Compilation errors
- Security vulnerabilities (SQL injection risk, missing authorization)
- Missing CancellationToken in async methods (can cause resource leaks)

**Action:** MUST be fixed before commit

---

### ORANGE HIGH (Fix Within 1-2 Days)

**Definition:** Issues that significantly impact code quality, readability, or violate important guidelines.

**Examples:**
- Single-letter lambda parameters (`t =>`, `u =>`, `x =>`)
- Abbreviations in names (`ctx`, `usr`, `msg`)
- Missing braces in control structures
- Missing AsNoTracking in read queries (performance impact)
- N+1 query issues
- Methods 20-30 lines without valid context (validation/endpoint config/mapping/algorithm)
- Methods 30-50 lines (approaching hard limit)
- Missing error handling with OneOf

**Action:** Fix soon, schedule in current sprint

---

### YELLOW MEDIUM (Fix Within 3-5 Days)

**Definition:** Issues that reduce code quality but don't block functionality.

**Examples:**
- Code duplication (DRY principle)
- Missing XML documentation
- Suboptimal EF Core queries (could be more efficient)
- Long parameter lists (4-5 parameters)
- Minor pattern misuse
- Incomplete structured logging
- Methods 20-30 lines in valid contexts (validation/endpoint/mapping) with complexity <10
- Methods 10-20 lines that could benefit from extraction (repeated logic, nested loops)

**Action:** Include in next sprint or current sprint if time allows

---

### GREEN LOW (Nice to Have)

**Definition:** Minor improvements, optimizations, or stylistic preferences.

**Examples:**
- Minor style inconsistencies
- Verbose code that could be simplified with modern C# features
- Optimization opportunities (minimal performance gain)
- Comment improvements
- Variable naming improvements (already descriptive but could be better)
- Optional refactorings

**Action:** Backlog, address when convenient

---

## Common Violations Examples

### WRONG: Single-Letter Lambda Parameters

**WRONG:**
```csharp
// Single letters are NOT descriptive
users.Where(u => u.IsActive)
tasks.Select(t => t.Title)
workspaces.OrderBy(w => w.Name)
```

**CORRECT:**
```csharp
// Use full, descriptive names
users.Where(user => user.IsActive)
tasks.Select(task => task.Title)
workspaces.OrderBy(workspace => workspace.Name)
```

**Guideline:** backend.md Section 2.3
**Priority:** ORANGE HIGH

---

### WRONG: Direct DbContext Access in Handlers

**WRONG:**
```csharp
// Handler directly uses DbContext - violates Repository Pattern
public sealed class CreateTaskHandler(AppDbContext dbContext, ILogger<CreateTaskHandler> logger)
{
    public async Task<OneOf<TaskResponse, ValidationErrors>> Handle(
        CreateTaskCommand command,
        CancellationToken cancellationToken)
    {
        var task = new Task { Title = command.Title, ... };
        await dbContext.Tasks.AddAsync(task, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new TaskResponse(task.Id, task.Title);
    }
}
```

**CORRECT:**
```csharp
// Handler uses IUnitOfWork abstraction - follows Repository Pattern
public sealed class CreateTaskHandler(IUnitOfWork unitOfWork, ILogger<CreateTaskHandler> logger)
{
    public async Task<OneOf<TaskResponse, ValidationErrors>> Handle(
        CreateTaskCommand command,
        CancellationToken cancellationToken)
    {
        var task = Task.Create(command.WorkspaceId, command.Title, command.AnchorPoint, command.CreatedBy);
        await unitOfWork.Tasks.AddAsync(task, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return new TaskResponse(task.Id, task.Title);
    }
}
```

**Guideline:** backend.md Section 3.4
**Priority:** RED CRITICAL

---

### WRONG: Missing Braces in Control Structures

**WRONG:**
```csharp
if (task.IsCompleted) return;

if (user == null)
    throw new NotFoundException("User not found");

for (int i = 0; i < tasks.Count; i++)
    tasks[i].Status = TaskStatus.Completed;
```

**CORRECT:**
```csharp
if (task.IsCompleted)
{
    return;
}

if (user == null)
{
    throw new NotFoundException("User not found");
}

for (int i = 0; i < tasks.Count; i++)
{
    tasks[i].Status = TaskStatus.Completed;
}
```

**Exception:** Expression-bodied members don't need braces:
```csharp
// This is OK
public string GetTitle() => task.Title;
public bool IsCompleted => Status == TaskStatus.Completed;
```

**Guideline:** backend.md Section 2.5
**Priority:** ORANGE HIGH

---

### WRONG: Abbreviations in Names

**WRONG:**
```csharp
var ctx = new AppDbContext();
var usr = await GetUserAsync(userId);
var msg = "Task created successfully";
var req = new CreateTaskRequest();
var res = await handler.Handle(req);
```

**CORRECT:**
```csharp
var context = new AppDbContext();
var user = await GetUserAsync(userId);
var message = "Task created successfully";
var request = new CreateTaskRequest();
var response = await handler.Handle(request);
```

**Allowed exceptions:**
- Id, Url, Http, Dto, Sql, Json (industry-standard abbreviations)

**Guideline:** backend.md Section 2.4
**Priority:** ORANGE HIGH

---

### WRONG: Missing Entity Configuration

**WRONG - Fluent API in OnModelCreating:**
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // All configuration in one place - hard to maintain
    modelBuilder.Entity<Task>().HasKey(t => t.Id);
    modelBuilder.Entity<Task>().Property(t => t.Title).HasMaxLength(100).IsRequired();
    modelBuilder.Entity<Task>().Property(t => t.Description).HasMaxLength(2000);
    modelBuilder.Entity<User>().HasKey(u => u.Id);
    modelBuilder.Entity<User>().Property(u => u.Email).HasMaxLength(256).IsRequired();
    // ... many more lines
}
```

**CORRECT - Separate IEntityTypeConfiguration:**
```csharp
// TaskConfiguration.cs
public sealed class TaskConfiguration : IEntityTypeConfiguration<Task>
{
    public void Configure(EntityTypeBuilder<Task> builder)
    {
        builder.HasKey(task => task.Id);

        builder.Property(task => task.Title)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(task => task.Description)
            .HasMaxLength(2000);

        builder.HasOne(task => task.Workspace)
            .WithMany(workspace => workspace.Tasks)
            .HasForeignKey(task => task.WorkspaceId);
    }
}

// AppDbContext.cs
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
}
```

**Guideline:** backend.md Section 4.1
**Priority:** RED CRITICAL

---

### WRONG: Missing AsNoTracking for Read Queries

**WRONG:**
```csharp
public async Task<IReadOnlyList<Task>> GetTasksByWorkspaceAsync(
    Guid workspaceId,
    CancellationToken cancellationToken = default)
{
    // EF Core tracks these entities unnecessarily
    return await _dbSet
        .Where(task => task.WorkspaceId == workspaceId)
        .ToListAsync(cancellationToken);
}
```

**CORRECT:**
```csharp
public async Task<IReadOnlyList<Task>> GetTasksByWorkspaceAsync(
    Guid workspaceId,
    CancellationToken cancellationToken = default)
{
    // AsNoTracking = better performance for read-only queries
    return await _dbSet
        .AsNoTracking()
        .Where(task => task.WorkspaceId == workspaceId)
        .ToListAsync(cancellationToken);
}
```

**When to use AsNoTracking:**
- Read-only queries (no updates afterward)
- DTOs or projections
- Large result sets

**When NOT to use:**
- Write operations (Create, Update, Delete)
- Queries where you'll modify entities afterward

**Guideline:** backend.md Section 4.2
**Priority:** ORANGE HIGH

---

### WRONG: Methods Exceeding Length Limits (Context-Aware)

**WRONG:**
```csharp
public async Task<IReadOnlyList<Task>> GetTasksFilteredAsync(
    Guid workspaceId,
    TaskStatus? status,
    Priority? priority,
    Guid? assigneeId,
    DateTime? dueDateFrom,
    DateTime? dueDateTo,
    CancellationToken cancellationToken = default)
{
    var query = _dbSet.Where(t => t.WorkspaceId == workspaceId);

    if (status.HasValue)
    {
        query = query.Where(t => t.Status == status.Value);
    }

    if (priority.HasValue)
    {
        query = query.Where(t => t.Priority == priority.Value);
    }

    if (assigneeId.HasValue)
    {
        query = query.Where(t => t.AssigneeId == assigneeId.Value);
    }

    if (dueDateFrom.HasValue)
    {
        query = query.Where(t => t.DueDate >= dueDateFrom.Value);
    }

    if (dueDateTo.HasValue)
    {
        query = query.Where(t => t.DueDate <= dueDateTo.Value);
    }

    return await query
        .OrderByDescending(t => t.CreatedAt)
        .ToListAsync(cancellationToken);
}
// Total: 28 lines - exceeds 20 line limit!
```

**CORRECT - Extract to private methods:**
```csharp
public async Task<IReadOnlyList<Task>> GetTasksFilteredAsync(
    Guid workspaceId,
    TaskStatus? status,
    Priority? priority,
    Guid? assigneeId,
    DateTime? dueDateFrom,
    DateTime? dueDateTo,
    CancellationToken cancellationToken = default)
{
    var query = _dbSet.Where(task => task.WorkspaceId == workspaceId);
    query = ApplyStatusFilter(query, status);
    query = ApplyPriorityFilter(query, priority);
    query = ApplyAssigneeFilter(query, assigneeId);
    query = ApplyDueDateFilter(query, dueDateFrom, dueDateTo);

    return await query
        .OrderByDescending(task => task.CreatedAt)
        .ToListAsync(cancellationToken);
}

private IQueryable<Task> ApplyStatusFilter(IQueryable<Task> query, TaskStatus? status)
{
    return status.HasValue ? query.Where(task => task.Status == status.Value) : query;
}

private IQueryable<Task> ApplyPriorityFilter(IQueryable<Task> query, Priority? priority)
{
    return priority.HasValue ? query.Where(task => task.Priority == priority.Value) : query;
}

private IQueryable<Task> ApplyAssigneeFilter(IQueryable<Task> query, Guid? assigneeId)
{
    return assigneeId.HasValue ? query.Where(task => task.AssigneeId == assigneeId.Value) : query;
}

private IQueryable<Task> ApplyDueDateFilter(IQueryable<Task> query, DateTime? from, DateTime? to)
{
    if (from.HasValue)
    {
        query = query.Where(task => task.DueDate >= from.Value);
    }
    if (to.HasValue)
    {
        query = query.Where(task => task.DueDate <= to.Value);
    }
    return query;
}
// Each method < 10 lines - follows guideline!
```

**Guideline:** backend.md Section 2.2
**Priority:** RED CRITICAL

---

### WRONG: Missing CancellationToken

**WRONG:**
```csharp
public async Task<User?> GetUserByEmailAsync(string email)
{
    return await _dbSet.FirstOrDefaultAsync(u => u.Email == email);
}
```

**CORRECT:**
```csharp
public async Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken = default)
{
    return await _dbSet.FirstOrDefaultAsync(user => user.Email == email, cancellationToken);
}
```

**Why it matters:**
- Allows canceling long-running operations
- Prevents resource leaks
- Improves responsiveness

**Guideline:** backend.md Section 7.5
**Priority:** RED CRITICAL (if missing) / ORANGE HIGH (if present but not passed through)

---

## Execution Steps

Follow these steps to perform the code review:

### Step 1: Read Guidelines Reference

```bash
# Load the source of truth for all compliance checks
cat docs/guidelines/backend.md
```

Keep the "Summary Checklist" section (at the end of backend.md) as your primary reference.

### Step 2: Collect Files for Review

Run the git integration commands to get list of files:

```bash
# Execute the commands from "Git Integration Commands" section above
git diff --staged --name-only | grep -E '\.(cs|csproj)$' > /tmp/dotnet_staged.txt
git ls-files --others --exclude-standard backend/ | grep -E '\.(cs|csproj)$' > /tmp/dotnet_untracked.txt
cat /tmp/dotnet_staged.txt /tmp/dotnet_untracked.txt | sort -u > /tmp/dotnet_all_files.txt
```

### Step 3: Analyze Each File

**IMPORTANT: Subagent Delegation** - Each file MUST be analyzed by a dedicated subagent spawned via the Task tool with `subagent_type: "backend-reviewer"` and `model: opus`. Pass each subagent the file path to analyze, the full Analysis Categories checklist (Section above), and the guidelines reference (`docs/guidelines/backend.md`). The subagent should return a structured per-file analysis matching the `files/[FileName].md` template. This ensures deep, isolated analysis per file without exhausting the orchestrator's context window.

For each file in the list:

1. **Spawn a dedicated subagent** via the Task tool with `model: opus`
2. **Pass to the subagent:** file path, Analysis Categories checklist, guidelines reference
3. **The subagent reads the file content** using Read tool
4. **The subagent cross-references against guidelines** from backend.md
5. **The subagent documents issues** with:
   - Exact line numbers
   - Guideline section reference
   - Code examples (current vs. required)
   - Priority assignment
   - Time estimate

6. **Prioritize files:**
   - Entities (Domain/Entities/)
   - Repositories (Infrastructure/Repositories/)
   - Configurations (Infrastructure/Data/Configurations/)
   - Extensions (Api/Extensions/)
   - Handlers (Api/Features/) - if present
   - Program.cs
   - .csproj files

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
mkdir -p .claude/backend-code-review/{timestamp}_{task_slug}/files/
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
.NET CODE REVIEW COMPLETE
====================================

Files Analyzed: {count}
Total Issues: {count}
  RED CRITICAL: {count}
  ORANGE HIGH: {count}
  YELLOW MEDIUM: {count}
  GREEN LOW: {count}

{If critical > 0:}
FAIL COMMIT BLOCKED
Critical issues must be fixed first!

{If critical == 0:}
PASS READY TO COMMIT
Review summary: {assessment}

Reports saved to:
.claude/backend-code-review/{timestamp}_{task_slug}/

Next steps:
1. Review detailed issues in compliance_issues.md
2. Follow remediation plan in fix_plan.md
3. Re-run after fixes: /backend:code-review "{task}"
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
- **Missing AsNoTracking**: 5 min per query
- **Method > 20 lines**: 15-30 min per method (refactoring)
- **Direct DbContext**: 10-20 min per handler (architecture change)
- **Missing braces**: 1-2 min per occurrence

### Common Patterns

Look for these patterns in .NET code:

- **Repositories**: Single-letter lambdas, missing AsNoTracking
- **Entities**: Missing factory methods, public setters without validation
- **Configurations**: All config in OnModelCreating (should be separate)
- **Handlers**: Direct DbContext usage, missing OneOf pattern
- **Extensions**: Long methods, complex DI setup

---

## Quality Assurance

Before finalizing the review, verify:

- [ ] All files from git list have been analyzed
- [ ] All grep anti-pattern results have been cross-referenced
- [ ] Every issue has a priority, file path, line numbers, and code example
- [ ] Time estimates are realistic and sum correctly
- [ ] Compliance matrix status (PASS/WARN/FAIL) is accurate
- [ ] Commit decision (PASS/FAIL) matches critical issue count
- [ ] All 4 reports are generated and complete
- [ ] File analyses exist for all files with issues
- [ ] References to backend.md sections are correct

---

## Final Notes

- This review is based on `docs/guidelines/backend.md` as the single source of truth
- All priority classifications follow the rules defined in this skill
- Time estimates include buffer for unexpected issues
- The goal is to ensure code quality while being pragmatic about delivery timelines
- When in doubt, prioritize architecture violations (Repository Pattern, CQRS) as CRITICAL
- Re-run this review after fixing issues to verify improvements

**End of Skill Definition**
