# Final Summary

Reference: shared module defining the final summary template.

**Goal:** Generate comprehensive report and console output.

---

## Step 7.1: Create Summary

Generate `final_summary.md`:

```markdown
# {{STACK_NAME}} Implementation Summary

**Task:** [description]
**Started:** [timestamp]
**Completed:** [timestamp]
**Total Duration:** [X hours Y minutes]
**Status:** COMPLETED

---

## Implementation Results

### Files Created: [X]
[List from completed_files.md]

### Files Modified: [Y]
[List from completed_files.md]

---

## Phase Summary

### Phase 1: Planning ([X] min)
- Requirements analyzed
- Architecture designed
- Implementation plan created

### Phase 2: Implementation ([X] min)
- [Y] tasks completed
- [Z] files created

### Phase 3: Compilation ([X] min)
- {{BUILD_CMD}}: SUCCESS
- {{LINT_CMD}}: SUCCESS (if applicable)

### Phase 4: Tests ([X] min)
- [Tests skipped per policy / Tests created and passing]

### Phase 5: Validation ([X] min)
- [0 issues / X issues found]

[If Phase 6 executed]
### Phase 6: Fixes ([X] min)
- All issues resolved

---

## Quality Metrics

**Build:** SUCCESS (0 errors)
**Lint:** SUCCESS (0 errors, 0 warnings) (if applicable)
**Code Review:** 0 ISSUES (100% compliance)
**Guidelines:** {{GUIDELINES_PATH}} -- FULL COMPLIANCE

---

## Git History Summary

**Branch:** `feature/{task-slug}`

**Commits created:**
1. Phase 2: Multiple batch commits (implementation)
2. Phase 3: Compilation fixes (if any)
3. Phase 4: Tests (if created)
4. Phase 6: Code review fixes (if any)

**To push changes:**
```bash
git push -u origin feature/{task-slug}
```

---

## Next Steps

1. Review implementation in IDE
2. Manual testing (optional)
3. Push to remote
4. Create Pull Request (if using PR workflow)

---

## Statistics

**Files Created:** [X]
**Files Modified:** [Y]
**Lines of Code:** ~[Z]
**Test Cases:** [W] (or "Skipped")
**Duration:** [X hours Y minutes]
```

---

## Step 7.2: Console Output

Print to console:

```
{{STACK_NAME}} Implementation COMPLETED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: [description]
Output: {{OUTPUT_DIR_PREFIX}}/{timestamp}_{task_slug}/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE RESULTS:

Phase 1: Planning        [X min]  - 4 documents
Phase 2: Implementation  [X min]  - [Y] files created
Phase 3: Compilation     [X min]  - Build SUCCESS
Phase 4: Tests           [X min]  - [Skipped / Z tests passing]
Phase 5: Validation      [X min]  - [0 issues / X issues]
[If Phase 6]
Phase 6: Fixes           [X min]  - All resolved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUALITY ASSURANCE:

Build:        SUCCESS (0 errors)
Code Review:  0 ISSUES (100% compliance)
Guidelines:   {{GUIDELINES_PATH}} -- FULL COMPLIANCE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GIT STATUS:

Branch:         feature/{task-slug}
Commits:        [N] commits created incrementally
Final Summary:  final_summary.md
Push Command:   git push -u origin feature/{task-slug}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready for production! Push branch and create PR.
```
