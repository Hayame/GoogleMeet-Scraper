#!/usr/bin/env bash
# Phase Quality Gate Hook (PostToolUse - Write matcher)
#
# Fires when any file is written. Checks if the written file is a phase
# completion marker (PHASE_X_COMPLETE.md or final_summary.md). If so,
# verifies that required deliverables exist in the same directory tree.
#
# Always exits 0 (does not cancel Write) but outputs warnings to stdout
# that become part of Claude's context.

set -euo pipefail

# The tool input contains the file path being written
FILE_PATH="${TOOL_INPUT_FILE_PATH:-}"

# Exit early if no file path or not a phase marker
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
PARENT_DIR=$(dirname "$FILE_PATH")

# Only check phase markers and final summary
case "$BASENAME" in
  PHASE_1_COMPLETE.md|PHASE_2_COMPLETE.md|PHASE_3_COMPLETE.md|\
  PHASE_4_COMPLETE.md|PHASE_5_COMPLETE.md|PHASE_6_COMPLETE.md|\
  final_summary.md)
    ;;
  *)
    exit 0
    ;;
esac

# Determine the implementation root directory
# Phase markers are in subdirectories like 01_planning/, 02_implementation/, etc.
# final_summary.md is in the root
if [ "$BASENAME" = "final_summary.md" ]; then
  IMPL_ROOT="$PARENT_DIR"
else
  IMPL_ROOT=$(dirname "$PARENT_DIR")
fi

WARNINGS=""

check_file() {
  local path="$1"
  local label="$2"
  if [ ! -f "$path" ]; then
    WARNINGS="${WARNINGS}\n  - MISSING: $label ($path)"
  fi
}

check_dir_has_files() {
  local dir="$1"
  local pattern="$2"
  local label="$3"
  if [ ! -d "$dir" ] || [ -z "$(ls "$dir"/$pattern 2>/dev/null)" ]; then
    WARNINGS="${WARNINGS}\n  - MISSING: $label (no $pattern files in $dir)"
  fi
}

case "$BASENAME" in
  PHASE_1_COMPLETE.md)
    check_file "$IMPL_ROOT/01_planning/requirements_analysis.md" "requirements_analysis.md"
    check_file "$IMPL_ROOT/01_planning/architecture_design.md" "architecture_design.md"
    check_file "$IMPL_ROOT/01_planning/user_stories.md" "user_stories.md"
    check_file "$IMPL_ROOT/01_planning/acceptance_criteria.md" "acceptance_criteria.md"
    check_file "$IMPL_ROOT/01_planning/implementation_plan.md" "implementation_plan.md"
    check_file "$IMPL_ROOT/01_planning/subtask_breakdown.md" "subtask_breakdown.md"
    ;;

  PHASE_2_COMPLETE.md)
    check_file "$IMPL_ROOT/02_implementation/progress.md" "progress.md"
    check_file "$IMPL_ROOT/02_implementation/completed_files.md" "completed_files.md"
    check_dir_has_files "$IMPL_ROOT/02_implementation/subagent_tasks" "task_*.md" "at least 1 task file"
    ;;

  PHASE_3_COMPLETE.md)
    check_file "$IMPL_ROOT/03_compilation/build_log.md" "build_log.md"
    ;;

  PHASE_4_COMPLETE.md)
    check_file "$IMPL_ROOT/04_tests/test_plan.md" "test_plan.md"
    ;;

  PHASE_5_COMPLETE.md)
    check_file "$IMPL_ROOT/05_validation/acceptance_criteria_verification.md" "acceptance_criteria_verification.md"
    ;;

  PHASE_6_COMPLETE.md)
    check_file "$IMPL_ROOT/06_fixes/fix_progress.md" "fix_progress.md"
    ;;

  final_summary.md)
    # Verify phases 1-5 are complete (phase 6 is optional)
    for phase in 1 2 3 4 5; do
      case $phase in
        1) check_file "$IMPL_ROOT/01_planning/PHASE_1_COMPLETE.md" "PHASE_1_COMPLETE.md" ;;
        2) check_file "$IMPL_ROOT/02_implementation/PHASE_2_COMPLETE.md" "PHASE_2_COMPLETE.md" ;;
        3) check_file "$IMPL_ROOT/03_compilation/PHASE_3_COMPLETE.md" "PHASE_3_COMPLETE.md" ;;
        4) check_file "$IMPL_ROOT/04_tests/PHASE_4_COMPLETE.md" "PHASE_4_COMPLETE.md" ;;
        5) check_file "$IMPL_ROOT/05_validation/PHASE_5_COMPLETE.md" "PHASE_5_COMPLETE.md" ;;
      esac
    done
    ;;
esac

if [ -n "$WARNINGS" ]; then
  echo ""
  echo "⚠️  PHASE QUALITY GATE WARNING for $BASENAME:"
  echo -e "$WARNINGS"
  echo ""
  echo "These deliverables should exist before marking this phase complete."
  echo "Please verify and create missing files if needed."
  echo ""
fi

exit 0
