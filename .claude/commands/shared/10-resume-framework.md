# Resume Framework

Reference: shared module defining how to resume interrupted implementations.

---

## Input Validation

**Input:** `$ARGUMENTS` should be a path to existing implementation directory.

**Validation Steps:**

1. Check if path exists: `test -d "$PATH"`
2. Verify it is a valid implementation directory: check for `00_task_description.md`
3. Set BASE_PATH variable

**If NOT valid:** ERROR with helpful message.

---

## FILE OPERATIONS POLICY

**NEVER OVERWRITE EXISTING PROGRESS FILES!**

- **ALWAYS** check if file exists BEFORE writing: `test -f "$PATH/file.md"`
- **IF EXISTS** -> Use Edit tool to APPEND or UPDATE content
- **IF NOT EXISTS** -> Use Write tool to CREATE new file
- **NEVER** use Write tool on existing `progress.md`, `completed_files.md`, `PHASE_X_COMPLETE.md`

---

## Phase Detection

**Phase Marker Files:**
```
01_planning/PHASE_1_COMPLETE.md
02_implementation/PHASE_2_COMPLETE.md
03_compilation/PHASE_3_COMPLETE.md
04_tests/PHASE_4_COMPLETE.md
05_validation/PHASE_5_COMPLETE.md
06_fixes/PHASE_6_COMPLETE.md
```

**Detection Algorithm:**

Check each marker sequentially. The FIRST missing marker indicates where to resume.

```bash
for i in 1 2 3 4 5 6; do
  case $i in
    1) MARKER="01_planning/PHASE_1_COMPLETE.md" ;;
    2) MARKER="02_implementation/PHASE_2_COMPLETE.md" ;;
    3) MARKER="03_compilation/PHASE_3_COMPLETE.md" ;;
    4) MARKER="04_tests/PHASE_4_COMPLETE.md" ;;
    5) MARKER="05_validation/PHASE_5_COMPLETE.md" ;;
    6) MARKER="06_fixes/PHASE_6_COMPLETE.md" ;;
  esac
  if [ ! -f "$BASE_PATH/$MARKER" ]; then
    RESUME_PHASE=$i
    break
  fi
done
```

---

## Special Cases

### Case A: All Phases Complete
If all 6 `PHASE_X_COMPLETE.md` files exist:
- Check if `final_summary.md` exists
- If missing -> Generate final summary only
- If exists -> Notify: "Implementation already complete"

### Case B: No Planning (Phase 1 missing)
If `01_planning/PHASE_1_COMPLETE.md` missing:
- Check which planning deliverables exist
- Resume from the first missing planning step
- DO NOT restart completed planning steps

### Case C: Implementation In Progress (Phase 2)
If `02_implementation/PHASE_2_COMPLETE.md` missing:
- Read `02_implementation/progress.md` to find last completed task
- Read `02_implementation/subagent_tasks/` to find task statuses
- Resume from first PENDING or IN_PROGRESS task
- DO NOT re-execute COMPLETED tasks

### Case D: No Progress At All
If no phase markers AND no `progress.md`:
- This is a fresh start, not a resume
- Notify user: "No progress found. Use `/{{STACK_ID}}:start-task` instead."

### Case E: Abandoned Phase (partial work, no marker)
If phase directory has files but no PHASE_X_COMPLETE.md:
- Analyze existing deliverables
- Determine what is missing
- Complete the phase from where it left off

### Case F: Unresolved Errors
If `progress.md` contains BLOCKED status or error notes:
- Read error details
- Attempt resolution before continuing
- If cannot resolve -> notify user with details

---

## Context Loading

When resuming, load context from existing files:

1. **Task Description:** Read `00_task_description.md`
2. **Planning:** Read all files in `01_planning/` (if Phase 1 complete)
3. **Progress:** Read `02_implementation/progress.md` (if exists)
4. **Completed Files:** Read `02_implementation/completed_files.md` (if exists)
5. **Build Log:** Read `03_compilation/build_log.md` (if exists)

---

## Resume Execution

After detecting resume point:

1. **Display status:** Show completed phases and resume point
2. **Load context:** Read all relevant files from completed phases
3. **Continue workflow:** Execute from resume phase using shared modules
4. **Follow all rules:** Operational rules, subagent requirements, phase transitions

---

## Console Output on Resume

```
Resuming {{STACK_NAME}} Implementation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Directory: {{OUTPUT_DIR_PREFIX}}/{timestamp}_{task_slug}/
Task: [description from 00_task_description.md]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE STATUS:

Phase 1: Planning        COMPLETE
Phase 2: Implementation  COMPLETE / IN PROGRESS (Task X.Y)
Phase 3: Compilation     PENDING
Phase 4: Tests           PENDING
Phase 5: Validation      PENDING
Phase 6: Fixes           PENDING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Resuming from: Phase [N] - [Phase Name]
[Additional context about where within the phase]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
