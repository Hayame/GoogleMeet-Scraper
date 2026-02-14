# Fix Frontend Code Review Issues

**Purpose**: Automatically find and fix issues from the latest frontend code review report

---

## Completion Policy (HARD REQUIREMENT)

**CRITICAL:** This task is considered complete ONLY when:
- Code review re-run shows **EXACTLY 0 issues**
- ALL priorities fixed: CRITICAL, HIGH, MEDIUM, LOW
- TypeScript compilation succeeds with 0 errors
- ESLint passes with 0 errors, 0 warnings

**DO NOT stop until 0 issues remain.** Partial fixes are NOT acceptable.

---

## Subagent Strategy

**Every issue fix = dedicated subagent via Task tool with `subagent_type: "frontend-fixer"` and `model: "opus"`.**

Each issue from the code review is dispatched to a focused subagent that:
1. Reads the target file and the issue description
2. Applies the minimal fix in isolation (Edit only, no new files)
3. Verifies build and lint for that single change
4. Reports success or failure back to the orchestrator

The orchestrator (this skill) manages sequencing, dependency ordering, and final verification.

---

## Instructions

You are a React/TypeScript code remediation specialist. Your task is to:

1. **FIND** the latest code review in `.claude/frontend-code-review/`
2. **PARSE** issues from `compliance_issues.md` by priority (CRITICAL HIGH MEDIUM LOW)
3. **FIX** each issue systematically according to `docs/guidelines/frontend.md`
   - Dispatch each fix as a dedicated subagent via Task tool with model: opus
4. **VERIFY** compilation after each fix (`npx tsc --noEmit --skipLibCheck` and `npm run lint`)
5. **TRACK** progress using TodoWrite tool

---

## Discovery

Find latest review directory:
- Pattern: `YYYYMMDD_context` (e.g., `20260106_task_form_refactor`)
- Location: `.claude/frontend-code-review/`
- Sort descending by date

**Example**:
```bash
# Find the most recent review directory
latest_review=$(ls -1 .claude/frontend-code-review/ | grep -E '^[0-9]{8}_' | sort -r | head -1)
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

**File:** `path/to/file.tsx`
**Lines:** [line range]
**Guideline:** frontend.md Section X.Y
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

**Fix Process** (per issue -- each dispatched as a subagent via Task tool with model: opus):

1. **Read** file to be modified
2. **Apply** fix from `compliance_issues.md` "Required Fix" section
3. **Ensure** compliance with `docs/guidelines/frontend.md`:
   - Components < 200 lines (soft), NEVER > 300 (hard) (Section II.2)
   - Functions < 20 lines (soft), NEVER > 50 (hard) (Section II.2)
   - Descriptive lambda names: `task =>` NOT `t =>` (Section II.1)
   - Zero inline styles - use CSS Modules (Section IV.1)
   - Zustand atomic selectors (Section III.1)
   - Magic numbers extracted to constants (Section II.4)
   - useLocalizedDate() for date formatting (Section VI.1)
   - useDeviceLayout() for device detection (Section V.1)
   - No console.log (only console.error/warn) (Section XI.2)
   - No `any` type - use `unknown` with type guards (Section II.3)
4. **Build** - run `npx tsc --noEmit --skipLibCheck` to verify compilation
5. **Lint** - run `npm run lint` to verify code style
6. **Fix errors** if build/lint fails, then re-verify
7. **Mark** issue as completed in TodoWrite

---

## Guidelines Compliance

**CRITICAL**: All fixes MUST comply with `docs/guidelines/frontend.md`

### Key Rules:

#### Code Style (Section II)
- **Naming conventions**: camelCase (vars), PascalCase (components), UPPER_SNAKE_CASE (constants)
- **Lambda expressions**: `task => task.id` NOT `t => t.id`
- **Component size**: < 200 (soft), NEVER > 300 (hard)
- **Function size**: < 20 (soft), NEVER > 50 (hard)
- **Props limit**: <= 7 (soft), <= 10 (hard)
- **Hooks limit**: <= 5 (soft), <= 7 (hard)
- **TypeScript strict**: No `any`, use `unknown` with type guards
- **Magic numbers**: Extract to `src/constants/`

#### Architecture (Section III)
- **Zustand atomic selectors**: `s => s.ui.taskForm.isOpen` NOT `s => s.ui`
- **useShallow**: For array/object selectors
- **Custom hooks**: Extract repeated logic (>= 2 times)
- **memo()**: Wrap expensive components
- **Type organization**: 1 type per file, domain-separated

#### Styling (Section IV)
- **CSS Modules 100%**: Zero `style={{}}`
- **Mantine variables**: Use `var(--mantine-*)` for colors, spacing
- **Z-index constants**: Use `src/constants/zIndex.ts`, NEVER hardcode
- **Dark/light mode**: Use `light-dark()` function

#### Device Detection (Section V)
- **useDeviceLayout()**: ALWAYS use for device detection
- **NEVER direct comparisons**: No `layoutMode === 'mobile'`

#### Date Handling (Section VI)
- **useLocalizedDate()**: ALWAYS use for date formatting
- **NEVER local functions**: No custom `formatDate()` helpers
- **dateHelpers.ts**: For calculations only

#### Performance (Section VIII)
- **useMemo**: For expensive calculations
- **useCallback**: For function props passed to children
- **React.lazy**: For code splitting heavy components

#### Best Practices (Section XI)
- **No console.log**: Only console.error/warn (console.warn OK in dev only)
- **Environment variables**: Use `import.meta.env.VITE_*`
- **i18n**: All user text via `t()` function
- **Import order**: React -> Mantine -> Zustand -> Local -> Utils -> Types -> Styles

---

## Library Version Verification (MANDATORY)

For issues involving React, Mantine, Zustand, or other libraries, use **Context7 MCP** to verify fixes align with current versions.

### When to Use Context7 MCP:

**Trigger Conditions:**
- Issue mentions specific library (e.g., "Mantine 8", "Zustand 5", "React 19")
- Error message references version-specific behavior
- Fix requires latest API pattern
- Deprecation warnings in TypeScript/ESLint output
- Multiple solutions exist for same problem (version-dependent)

### Common Scenarios:

| Issue Type | Context7 Lookup | Example |
|------------|-----------------|---------|
| Mantine component props | `resolve-library-id "Mantine 8"` | `sx` prop removed in v7+ |
| Zustand patterns | `resolve-library-id "Zustand 5"` | `useShallow` import location |
| React 19 hooks | `resolve-library-id "React 19"` | `useActionState` vs `useFormState` |
| CSS-in-JS migration | `resolve-library-id "Mantine"` | CSS Modules pattern in v8 |
| MapLibre GL JS | `resolve-library-id "MapLibre GL JS"` | React wrapper changes |

### Workflow:

```bash
# 1. Identify library from compliance_issues.md
# Example: Issue #5 - "sx prop removed in Mantine 8"

# 2. Lookup latest documentation
resolve-library-id "Mantine 8"
get-library-docs [library-id]

# 3. Find correct pattern
# Discover: Use CSS Modules instead of sx prop

# 4. Apply version-correct fix
# Old (Mantine 6): <Button sx={{ padding: 12 }}>
# New (Mantine 8): <Button className={styles.button}>

# 5. Verify build succeeds
npx tsc --noEmit --skipLibCheck && npm run lint
```

---

## Verification

After all fixes:

### 1. TypeScript Compilation
```bash
npx tsc --noEmit --skipLibCheck
# Expected: No errors
```

### 2. ESLint Check
```bash
npm run lint
# Expected: 0 errors, 0 warnings
```

### 3. Production Build (Optional but Recommended)
```bash
npm run build
# Expected: Build succeeds
```

### 4. Code Review Re-run (REQUIRED)
```bash
/frontend:code-review "Fixes applied - verify resolution"
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
    content: "Fix Issue #1: Replace single-letter lambda in TaskList.tsx",
    activeForm: "Fixing Issue #1: Replacing single-letter lambda in TaskList.tsx",
    status: "completed"
  },
  {
    content: "Fix Issue #2: Convert inline styles to CSS Module in TaskCard.tsx",
    activeForm: "Fixing Issue #2: Converting inline styles to CSS Module",
    status: "in_progress"
  },
  {
    content: "Fix Issue #3: Extract magic numbers to constants",
    activeForm: "Fixing Issue #3: Extracting magic numbers to constants",
    status: "pending"
  }
]
```

---

## Fix Templates

### Single-Letter Lambda Fix

**Find:**
```typescript
tasks.filter(t => t.status === 'COMPLETED')
users.map(u => u.name)
items.sort((a, b) => a.priority - b.priority)
```

**Replace with:**
```typescript
tasks.filter(task => task.status === 'COMPLETED')
users.map(user => user.name)
items.sort((itemA, itemB) => itemA.priority - itemB.priority)
```

---

### Inline Style to CSS Module Fix

**Find (in .tsx):**
```typescript
<div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px' }}>
```

**Create/Update CSS Module (.module.css):**
```css
.container {
  padding: var(--mantine-spacing-md);
  background-color: var(--mantine-color-white);
  border-radius: var(--mantine-radius-md);
}
```

**Replace with:**
```typescript
import styles from './Component.module.css';

<div className={styles.container}>
```

---

### Magic Number Extraction Fix

**Find:**
```typescript
const layerPaint = {
  'line-width': 3,
  'line-opacity': 0.25,
};
setTimeout(callback, 500);
<Modal zIndex={9999} />
```

**Add to constants file (src/constants/*.ts):**
```typescript
// src/constants/geometryRendering.ts
export const LINE_DEFAULT_WIDTH = 3;
export const GLOW_OPACITY = 0.25;

// src/constants/ui.ts
export const ANIMATION_DURATION_MS = 500;

// src/constants/zIndex.ts
export const Z_INDEX_MODAL = 3001;
```

**Replace with:**
```typescript
import { LINE_DEFAULT_WIDTH, GLOW_OPACITY } from '@/constants';
import { ANIMATION_DURATION_MS } from '@/constants/ui';
import { Z_INDEX_MODAL } from '@/constants/zIndex';

const layerPaint = {
  'line-width': LINE_DEFAULT_WIDTH,
  'line-opacity': GLOW_OPACITY,
};
setTimeout(callback, ANIMATION_DURATION_MS);
<Modal zIndex={Z_INDEX_MODAL} />
```

---

### Object Selector to Atomic Selector Fix

**Find:**
```typescript
// Bad - re-renders on ANY ui change
const ui = useGeoMarkupStore(state => state.ui);
const isOpen = ui.taskForm.isOpen;
```

**Replace with:**
```typescript
// Good - only re-renders when isOpen changes
const isOpen = useGeoMarkupStore(state => state.ui.taskForm.isOpen);

// For arrays/objects, use useShallow
import { useShallow } from 'zustand/react/shallow';
const tasks = useGeoMarkupStore(useShallow(state => state.tasks.items));
```

---

### console.log Removal Fix

**Find:**
```typescript
console.log('Debug:', data);
console.log('User:', currentUser);
```

**Replace with:**
```typescript
// Remove completely for debug logs

// For errors, keep as console.error:
console.error('Failed to load:', error);

// For dev-only warnings:
if (import.meta.env.DEV) {
  console.warn('Development warning:', info);
}
```

---

### any Type to Proper Type Fix

**Find:**
```typescript
function processData(data: any): any {
  return data.value;
}
```

**Replace with:**
```typescript
interface DataInput {
  value: string;
}

function processData(data: DataInput): string {
  return data.value;
}

// For unknown external data:
function processUnknownData(data: unknown): string {
  if (isDataInput(data)) {
    return data.value;
  }
  throw new Error('Invalid data format');
}

function isDataInput(data: unknown): data is DataInput {
  return typeof data === 'object' && data !== null && 'value' in data;
}
```

---

### Missing Memoization Fix

**Find:**
```typescript
function TaskList({ tasks, filter }: Props) {
  // Recalculates every render
  const filtered = tasks.filter(task => task.status === filter);

  // New function every render
  const handleClick = (id: string) => selectTask(id);

  return <div>{filtered.map(task => <Task onClick={handleClick} />)}</div>;
}
```

**Replace with:**
```typescript
import { useMemo, useCallback, memo } from 'react';

const TaskList = memo(function TaskList({ tasks, filter }: Props) {
  // Only recalculates when deps change
  const filtered = useMemo(
    () => tasks.filter(task => task.status === filter),
    [tasks, filter]
  );

  // Stable reference
  const handleClick = useCallback((id: string) => {
    selectTask(id);
  }, [selectTask]);

  return <div>{filtered.map(task => <Task onClick={handleClick} />)}</div>;
});
```

---

## Output Format

Provide:

1. **Summary** of issues found (count by priority)
2. **Execution sequence** (order of fixes with dependencies)
3. **Live progress** updates as issues are resolved
4. **Final verification** results (TypeScript + ESLint + code review re-run)
5. **Commit message** template (ready to copy/paste)

---

## Example Execution

```
Code Review Analysis
Latest review: 20260106_task_form_refactor

Issues found:
- CRITICAL: 0
- HIGH: 4 (single-letter lambdas, inline styles, object selector, console.log)
- MEDIUM: 2 (missing memoization, import order)
- LOW: 1 (naming improvement)

Total: 7 issues, 45 min estimated

Execution Plan
Order: Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6 -> Task 7

1. [HIGH] Issue #1: Fix single-letter lambdas in TaskList.tsx (5 min) -- subagent
2. [HIGH] Issue #2: Convert inline styles to CSS Module in TaskCard.tsx (10 min) -- subagent
3. [HIGH] Issue #3: Fix object Zustand selector in useTaskForm.ts (5 min) -- subagent
4. [HIGH] Issue #4: Remove console.log statements (3 min) -- subagent
5. [MEDIUM] Issue #5: Add useMemo to filtered tasks (5 min) -- subagent
6. [MEDIUM] Issue #6: Fix import order in TaskDetails.tsx (3 min) -- subagent
7. [LOW] Issue #7: Rename variable for clarity (2 min) -- subagent

Fixing Issue #1: Single-letter lambdas in TaskList.tsx [subagent via Task tool, model: opus]
- Replaced `t =>` with `task =>` (3 occurrences)
- TypeScript: SUCCESS
- ESLint: SUCCESS

Fixing Issue #2: Inline styles in TaskCard.tsx [subagent via Task tool, model: opus]
- Created TaskCard.module.css with 3 classes
- Replaced style={{}} with className references
- Added Mantine CSS variables
- TypeScript: SUCCESS
- ESLint: SUCCESS

Fixing Issue #3: Object selector in useTaskForm.ts [subagent via Task tool, model: opus]
- Changed `s => s.ui` to atomic `s => s.ui.taskForm.isOpen`
- Added separate selector for mode
- TypeScript: SUCCESS
- ESLint: SUCCESS

Fixing Issue #4: console.log statements [subagent via Task tool, model: opus]
- Removed 2 debug console.log calls
- TypeScript: SUCCESS
- ESLint: SUCCESS

Fixing Issue #5: Missing memoization [subagent via Task tool, model: opus]
- Added useMemo for filteredTasks
- Added useCallback for handleSelect
- TypeScript: SUCCESS
- ESLint: SUCCESS

Fixing Issue #6: Import order [subagent via Task tool, model: opus]
- Reordered imports: React -> Mantine -> Zustand -> Local -> Types -> Styles
- TypeScript: SUCCESS
- ESLint: SUCCESS

Fixing Issue #7: Variable naming [subagent via Task tool, model: opus]
- Renamed `temp` to `taskBuffer`
- TypeScript: SUCCESS
- ESLint: SUCCESS

All issues resolved! (7/7)

Build Verification
npx tsc --noEmit --skipLibCheck
SUCCESS - No errors

npm run lint
SUCCESS - 0 errors, 0 warnings

Re-running Code Review (MANDATORY)
/frontend:code-review "Task form refactor fixes verified"
SUCCESS - 0 issues found - TASK COMPLETE!

Suggested Commit Message:
git add src/components/tasks/TaskList.tsx src/components/tasks/TaskCard.tsx \
        src/components/tasks/TaskCard.module.css src/hooks/useTaskForm.ts \
        src/components/tasks/TaskDetails.tsx

git commit -m "refactor(tasks): fix code review issues for task form

- Replace single-letter lambda parameters with descriptive names
- Convert inline styles to CSS Modules with Mantine variables
- Fix Zustand object selector to atomic primitive selectors
- Remove debug console.log statements
- Add useMemo/useCallback for performance optimization
- Fix import order per guidelines

Fixes 7 code review issues
Compliance: frontend.md Sections II, III, IV, VIII, XI"

Ready to commit! Run the commands above when ready.
```

---

## Error Handling

### TypeScript Compilation Fails
1. Show full error output
2. Analyze error and suggest fix
3. Apply fix
4. Re-verify compilation
5. Repeat until compilation succeeds

### ESLint Fails
1. Show lint errors
2. Apply auto-fix where possible: `npm run lint:fix`
3. Manual fix for remaining issues
4. Re-verify lint
5. Repeat until lint passes

### No Code Review Found
```
No code review reports found in .claude/frontend-code-review/
Run /frontend:code-review first to generate a review.
```

### File Not Found
```
File not found: {file_path}
Check if the file was moved or renamed.
Verify the path in compliance_issues.md is correct.
```

### CSS Module Missing
```
CSS Module not found: {module_path}
Creating new CSS Module file with extracted styles.
```

---

## Success Criteria

After execution, verify:

- **0 issues remaining** (verified by code review re-run) - HARD REQUIREMENT
- ALL priorities fixed: CRITICAL, HIGH, MEDIUM, LOW
- `npx tsc --noEmit --skipLibCheck` succeeds with 0 errors
- `npm run lint` passes with 0 errors, 0 warnings
- All fixes comply with `frontend.md` guidelines
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
- **Re-run Code Review**: Verify 0 issues after fixes via `/frontend:code-review`

---

## Notes

- This skill is **generic** - works with ANY frontend code review report
- **Subagent-driven** - each issue fix is dispatched as a dedicated subagent via Task tool with model: opus
- **Priority-aware** - processes CRITICAL first, then HIGH, MEDIUM, LOW
- **Dependency-aware** - reads `fix_plan.md` for task dependencies
- **Build-safe** - verifies TypeScript compilation after each fix (`npx tsc --noEmit --skipLibCheck`)
- **Lint-safe** - verifies ESLint after each fix (`npm run lint`)
- **Guideline-compliant** - enforces `frontend.md` compliance
- **Trackable** - TodoWrite integration for progress tracking
- **Reusable** - can be used multiple times for different review sessions
- **Double verification** - both TypeScript/ESLint and code review re-run via `/frontend:code-review`

---

## References

- `docs/guidelines/frontend.md` - React 19 + TypeScript 5.7 Coding Guidelines
- `.claude/frontend-code-review/{latest}/compliance_issues.md` - Detailed issues
- `.claude/frontend-code-review/{latest}/fix_plan.md` - Remediation plan with dependencies
- `.claude/frontend-code-review/{latest}/review_report.md` - Executive summary
