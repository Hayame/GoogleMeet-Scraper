# Fix Backend Code Review Issues

**Purpose**: Automatically find and fix issues from the latest backend code review report

---

## Completion Policy (HARD REQUIREMENT)

**CRITICAL:** This task is considered complete ONLY when:
- Code review re-run shows **EXACTLY 0 issues**
- ALL priorities fixed: CRITICAL, HIGH, MEDIUM, LOW
- Build succeeds with 0 errors, 0 warnings

**DO NOT stop until 0 issues remain.** Partial fixes are NOT acceptable.

---

## Subagent Strategy

**Every issue fix = dedicated subagent via Task tool with `subagent_type: "backend-fixer"` and model: opus.**

Each issue from the code review is dispatched to a focused subagent that:
1. Reads the target file and the issue description
2. Applies the fix in isolation
3. Verifies the build for that single change
4. Reports success or failure back to the orchestrator

The orchestrator (this skill) manages sequencing, dependency ordering, and final verification.

---

## Instructions

You are a .NET code remediation specialist. Your task is to:

1. **FIND** the latest code review in `.claude/backend-code-review/`
2. **PARSE** issues from `compliance_issues.md` by priority (CRITICAL HIGH MEDIUM LOW)
3. **FIX** each issue systematically according to `docs/guidelines/backend.md`
   - Dispatch each fix as a dedicated subagent via Task tool with `subagent_type: "backend-fixer"` and model: opus
4. **VERIFY** compilation after each fix (`dotnet build backend/GeoMarkup.sln`)
5. **TRACK** progress using TodoWrite tool

---

## Discovery

Find latest review directory:
- Pattern: `YYYYMMDD_context` (e.g., `20260103_phase2_identity_openiddict`)
- Location: `.claude/backend-code-review/`
- Sort descending by date

**Example**:
```bash
# Find the most recent review directory
latest_review=$(ls -1 .claude/backend-code-review/ | grep -E '^[0-9]{8}_' | sort -r | head -1)
echo "Latest review: $latest_review"
```

---

## Parsing

From `compliance_issues.md`, extract:
- Priority level (CRITICAL, HIGH, MEDIUM, LOW)
- Issue number (`Issue #N`)
- File path
- Line numbers
- Description
- Current code (problematic)
- Required fix (solution)
- Guideline reference

**Structure to parse**:
```markdown
### Issue #N: [Title]

**File:** `path/to/file.cs`
**Lines:** [line range]
**Guideline:** backend.md Section X.Y
**Priority:** [CRITICAL/HIGH/MEDIUM/LOW]
**Estimated Fix Time:** [duration]

**Description:** [explanation]

**Current Code:**
[problematic code]

**Required Fix:**
[solution code]
```

---

## Execution Strategy

**Priority Order**: CRITICAL -> HIGH -> MEDIUM -> LOW

**Dependency-Aware Sequencing**:
- Check `fix_plan.md` for task dependencies
- Example: "Task 3 enables Task 2" -> do Task 3 first
- Respect recommended sequence from fix plan

**Fix Process** (per issue -- each dispatched as a subagent via Task tool with `subagent_type: "backend-fixer"` and model: opus):

1. **Read** file to be modified
2. **Apply** fix from `compliance_issues.md` "Required Fix" section
3. **Ensure** compliance with `docs/guidelines/backend.md`:
   - Methods < 20 lines (soft), NEVER > 50 (hard), complexity < 10 (Section II.2)
   - Context-aware: 20-30 lines OK for validation/endpoint/mapping/algorithms
   - No abbreviations (except Id, Url, Http, Dto, Sql, Json) (Section II.4)
   - Structured logging with `ILogger<T>` (Section VII.3)
   - DRY principle - no duplication (Core Principles)
   - Top-to-bottom reading - private methods BELOW usage (Section II.1)
   - Modern C# 12 syntax (file-scoped namespaces, primary constructors) (Section II.6)
   - Braces `{}` for all control structures (even single-line) (Section II.5)
   - Error Handling: Explicit exception handling with logging (Section VII.1)
4. **Build** - run `dotnet build backend/GeoMarkup.sln` to verify compilation
5. **Fix errors** if build fails, then rebuild
6. **Mark** issue as completed in TodoWrite

---

## Guidelines Compliance

**CRITICAL**: All fixes MUST comply with `docs/guidelines/backend.md`

### Key Rules:

#### Code Style (Section II)
- **Top-to-bottom reading**: Private methods appear BELOW their last usage
- **Method length limits**: < 20 lines (soft), NEVER > 50 (hard), complexity < 10 priority
- **Context-aware exceptions**: 20-30 lines acceptable for validation, endpoint config, mapping, algorithms
- **Parameters < 5**: Use parameter objects if more
- **Descriptive lambda names**: `user => user.Email` NOT `u => u.Email`
- **No abbreviations**: Except Id, Url, Http, Dto, Sql, Json
- **Braces policy**: ALWAYS use `{}` for if/else/try/catch (even single-line)
- **Modern C# 12**: File-scoped namespaces, primary constructors, collection expressions

#### Architecture (Section III)
- **Wolverine CQRS**: All operations via message bus
- **Repository Pattern**: NO direct DbContext in handlers
- **TypedResults**: Explicit `Results<T1, T2>` response types
- **OneOf**: For discriminated unions in handlers

#### EF Core (Section IV)
- **Fluent API**: In `IEntityTypeConfiguration<T>` classes
- **AsNoTracking**: For read-only queries
- **Projection**: Select only needed columns
- **Avoid N+1**: Use `.Include()` or projection

#### Best Practices (Section VII)
- **Error Handling**: OneOf for explicit errors, no bare catch blocks
- **Logging**: Structured logging with `ILogger<T>`
- **Async/await**: All the way, with `CancellationToken`
- **DI**: Constructor injection, proper lifetimes

---

## Library Version Verification (MANDATORY)

For issues involving external libraries or .NET framework APIs, use **Context7 MCP** to verify fixes align with current versions.

### When to Use Context7 MCP:

**Trigger Conditions:**
- Issue mentions specific library name (e.g., "EF Core", "Wolverine", "Polly")
- Error message references version-specific behavior
- Fix requires latest API pattern (not from .NET 8/9 examples)
- Deprecation warnings in build output
- Multiple solutions exist for same problem (version-dependent)

### Common Scenarios:

| Issue Type | Context7 Lookup | Example |
|------------|-----------------|---------|
| EF Core migration patterns | `resolve-library-id "Entity Framework Core 10"` | Async enumeration API changed in v10 |
| Dependency injection setup | `resolve-library-id "Microsoft.Extensions.DependencyInjection"` | Keyed services introduced in .NET 8 |
| Async/await patterns | `resolve-library-id ".NET 10 async patterns"` | `IAsyncEnumerable` best practices |
| JSON serialization | `resolve-library-id "System.Text.Json"` | Source generators in .NET 10 |
| Wolverine CQRS handlers | `resolve-library-id "Wolverine"` | Handler return type changes in v5.9 |
| KeyCloak integration | `resolve-library-id "Keycloak.AuthServices"` | IKeycloakClient API updates in v8.1 |

### Workflow:

```bash
# 1. Identify library from compliance_issues.md
# Example: Issue #5 - "Async enumeration deprecated in EF Core 10"

# 2. Lookup latest documentation
resolve-library-id "Entity Framework Core 10"
get-library-docs [library-id]

# 3. Find correct pattern for .NET 10
# Discover: Use ToListAsync() instead of AsAsyncEnumerable()

# 4. Apply version-correct fix
# Old (.NET 8): await query.AsAsyncEnumerable().ToListAsync()
# New (.NET 10): await query.ToListAsync(cancellationToken)

# 5. Verify build succeeds
dotnet build backend/GeoMarkup.sln
```

### Benefits:

- Prevents applying outdated fixes from .NET 8/9 examples
- Ensures fixes use current API surface (.NET 10 LTS)
- Discovers new features (e.g., compiled queries in EF Core 10)
- Avoids deprecation warnings immediately after "fixing"
- Reduces rework from version-incompatible patterns

### When to Search Web Instead:

- Context7 MCP doesn't have the library/framework
- Need community troubleshooting for specific error codes
- Looking for migration guides (e.g., "EF Core 8 to 10 migration")
- Researching workarounds for known bugs

---

## Verification

After all fixes:

### 1. Build Verification
```bash
dotnet build backend/GeoMarkup.sln
# Expected: "Build succeeded. 0 Warning(s), 0 Error(s)"
```

### 2. Code Review Re-run (REQUIRED)
```bash
/backend:code-review "Fixes applied - verify resolution"
# Expected: 0 issues found
```

**Pass Criteria:**
- Code review output: "0 issues found"
- ANY issues remaining: Continue fixing until 0 issues

**If issues remain after fixes:**
1. Analyze why fixes didn't resolve issues
2. Apply additional corrections
3. Re-run code review again
4. Repeat until 0 issues

---

## Progress Tracking

Use TodoWrite tool with these todos:
- One todo per issue from code review
- Status: `pending` -> `in_progress` -> `completed`
- Include issue number and file name
- Update **immediately** after each fix

**Example**:
```typescript
todos: [
  {
    content: "Fix Issue #3: Extract JWT secret to constructor",
    activeForm: "Fixing Issue #3: Extract JWT secret to constructor",
    status: "completed"
  },
  {
    content: "Fix Issue #1: Add logging to ValidateToken",
    activeForm: "Fixing Issue #1: Add logging to ValidateToken",
    status: "in_progress"
  },
  {
    content: "Fix Issue #2: Refactor GenerateAccessToken",
    activeForm: "Fixing Issue #2: Refactor GenerateAccessToken",
    status: "pending"
  }
]
```

---

## Fix Patterns

### Bare Catch Block Fix

**Find:**
```csharp
try
{
    await service.ProcessAsync(data);
}
catch
{
    return false;
}
```

**Replace with:**
```csharp
try
{
    await service.ProcessAsync(data);
}
catch (OperationCanceledException)
{
    throw; // Do not swallow cancellation
}
catch (Exception exception)
{
    _logger.LogError(exception, "Failed to process data for {EntityId}", data.Id);
    return false;
}
```

---

### Method Length Refactoring

**Find:**
```csharp
// Method exceeding 50 lines with mixed concerns
public async Task<Result> HandleAsync(Command command, CancellationToken cancellationToken)
{
    // validation logic (10 lines)
    // business logic (20 lines)
    // persistence logic (15 lines)
    // notification logic (10 lines)
}
```

**Replace with:**
```csharp
public async Task<Result> HandleAsync(Command command, CancellationToken cancellationToken)
{
    var validationResult = ValidateCommand(command);
    if (validationResult.IsFailure)
    {
        return validationResult;
    }

    var entity = await ProcessBusinessLogicAsync(command, cancellationToken);
    await PersistChangesAsync(entity, cancellationToken);
    await NotifyAsync(entity, cancellationToken);

    return Result.Success();
}

// Private methods appear BELOW their usage (top-to-bottom reading)
private ValidationResult ValidateCommand(Command command) { ... }
private async Task<Entity> ProcessBusinessLogicAsync(Command command, CancellationToken cancellationToken) { ... }
private async Task PersistChangesAsync(Entity entity, CancellationToken cancellationToken) { ... }
private async Task NotifyAsync(Entity entity, CancellationToken cancellationToken) { ... }
```

---

### DRY Violation Fix

**Find:**
```csharp
// Duplicated logic in multiple handlers
public class HandlerA
{
    private string FormatUserName(User user) => $"{user.FirstName} {user.LastName}";
}

public class HandlerB
{
    private string FormatUserName(User user) => $"{user.FirstName} {user.LastName}";
}
```

**Replace with:**
```csharp
// Extract to shared extension or service
public static class UserExtensions
{
    public static string GetFullName(this User user) => $"{user.FirstName} {user.LastName}";
}
```

---

### Single-Letter Lambda Fix

**Find:**
```csharp
users.Where(u => u.IsActive)
tasks.Select(t => t.Title)
items.OrderBy(x => x.CreatedAt)
```

**Replace with:**
```csharp
users.Where(user => user.IsActive)
tasks.Select(task => task.Title)
items.OrderBy(item => item.CreatedAt)
```

---

### Missing Structured Logging Fix

**Find:**
```csharp
_logger.LogInformation($"User {userId} logged in at {DateTime.Now}");
_logger.LogError($"Failed to process order {orderId}: {ex.Message}");
```

**Replace with:**
```csharp
_logger.LogInformation("User {UserId} logged in", userId);
_logger.LogError(exception, "Failed to process order {OrderId}", orderId);
```

---

## Output Format

Provide:

1. **Summary** of issues found (count by priority)
2. **Execution sequence** (order of fixes with dependencies)
3. **Live progress** updates as issues are resolved
4. **Final verification** results (build output + code review re-run)
5. **Commit message** template (ready to copy/paste)

---

## Example Execution

```
Code Review Analysis
Latest review: 20260103_phase2_identity_openiddict

Issues found:
- CRITICAL: 0
- HIGH: 1 (bare catch block)
- MEDIUM: 2 (method length, DRY violation)
- LOW: 0

Total: 3 issues, 35 min estimated

Execution Plan
Order: Task 3 -> Task 1 -> Task 2 (dependency-aware)

1. [MEDIUM] Issue #3: Extract JWT secret to constructor (10 min) -- subagent
2. [HIGH] Issue #1: Add logging to ValidateToken (10 min) -- subagent
3. [MEDIUM] Issue #2: Refactor GenerateAccessToken (15 min) -- subagent

Fixing Issue #3: Extract JWT secret to constructor [subagent via Task tool, model: opus]
- Added readonly field _jwtSecret
- Initialized in constructor with validation
- Updated GenerateAccessToken to use field
- Updated ValidateToken to use field
- Build: SUCCESS

Fixing Issue #1: Add logging to ValidateToken [subagent via Task tool, model: opus]
- Added ILogger<JwtTokenService> to constructor
- Replaced bare catch with specific handlers
- Added structured logging
- Build: SUCCESS

Fixing Issue #2: Refactor GenerateAccessToken [subagent via Task tool, model: opus]
- Extracted BuildAccessTokenClaims method (15 lines)
- Reduced GenerateAccessToken to 14 lines
- Method appears below GenerateAccessToken (top-to-bottom)
- Build: SUCCESS

All issues resolved! (3/3)

Build Verification
dotnet build backend/GeoMarkup.sln
Build succeeded. 0 Warning(s), 0 Error(s)

Re-running Code Review (MANDATORY)
/backend:code-review "Phase 2.1 fixes verified"
0 issues found - TASK COMPLETE!

If ANY issues remain: Continue fixing and re-run review until 0 issues.

Suggested Commit Message:
git add backend/GeoMarkup.Identity/Services/JwtTokenService.cs
git commit -m "refactor(identity): improve JwtTokenService code quality

- Extract JWT secret to constructor for fail-fast validation
- Add structured logging for token validation failures
- Refactor GenerateAccessToken to 14 lines with reduced complexity (extract BuildAccessTokenClaims)

Fixes 3 code review issues: bare catch block, method length, DRY violation
Compliance: backend.md Sections II.2, VII.1"

Ready to commit! Run the commands above when ready.
```

---

## Task Argument

Optional task description for context:
```bash
/backend:fix-issues "Phase 2.1: OpenIddict Configuration"
```

If no argument provided, use review directory name as context.

---

## Error Handling

### Build Fails
1. Show full error output
2. Analyze error and suggest fix
3. Apply fix
4. Rebuild
5. Repeat until build succeeds

### No Code Review Found
```
No code review reports found in .claude/backend-code-review/
Run /backend:code-review first to generate a review.
```

### File Not Found
```
File not found: {file_path}
Check if the file was moved or renamed.
Verify the path in compliance_issues.md is correct.
```

---

## Success Criteria

After execution, verify:

- **0 issues remaining** (verified by code review re-run) - HARD REQUIREMENT
- ALL priorities fixed: CRITICAL, HIGH, MEDIUM, LOW
- `dotnet build backend/GeoMarkup.sln` succeeds with 0 errors, 0 warnings
- All fixes comply with `backend.md` guidelines
- Progress tracked via TodoWrite throughout
- Commit message generated (but NOT committed)
- Code review re-run shows 0 issues

---

## Configuration

**Settings** (based on user preferences):

- **Full Automation**: No interactive prompts, apply all fixes automatically
- **Subagent Dispatch**: Every issue fix = dedicated subagent via Task tool with model: opus
- **Fix All Priorities**: CRITICAL, HIGH, MEDIUM, LOW (until 0 issues remain)
- **No Auto-Commit**: Generate commit message only, user commits manually
- **Re-run Code Review**: Verify 0 issues after fixes via `/backend:code-review`
- **Context7 MCP**: Mandatory for library version verification

---

## Notes

- This skill is **generic** - works with ANY backend code review report
- **Subagent-driven** - each issue fix is dispatched as a dedicated subagent via Task tool with model: opus
- **Priority-aware** - processes CRITICAL first, then HIGH, MEDIUM, LOW
- **Dependency-aware** - reads `fix_plan.md` for task dependencies
- **Build-safe** - verifies compilation after each fix (`dotnet build backend/GeoMarkup.sln`)
- **Guideline-compliant** - enforces `backend.md` compliance
- **Context7 MCP** - mandatory for library version verification before applying fixes
- **Trackable** - TodoWrite integration for progress tracking
- **Reusable** - can be used multiple times for different review sessions
- **Double verification** - both `dotnet build` and code review re-run via `/backend:code-review`

---

## References

- `docs/guidelines/backend.md` - .NET 10 C# Coding Guidelines
- `.claude/backend-code-review/{latest}/compliance_issues.md` - Detailed issues
- `.claude/backend-code-review/{latest}/fix_plan.md` - Remediation plan with dependencies
- `.claude/backend-code-review/{latest}/review_report.md` - Executive summary
