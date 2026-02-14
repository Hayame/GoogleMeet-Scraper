#!/bin/bash
# hook-stop-verify-index.sh
# Claude Code Stop hook — ensures index is updated before Claude can finish
#
# If Claude changed source files but didn't update the index:
#   → Exit code 2 = blocks stop, stderr is fed back to Claude as instruction
#
# If Claude already updated index (or no source changes):
#   → Exit code 0 = allows stop

set -euo pipefail

INPUT=$(cat)

# CRITICAL: Check stop_hook_active to prevent infinite loop
# If Claude is already continuing because of our stop hook, let it finish
STOP_HOOK_ACTIVE=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(str(data.get('stop_hook_active', False)).lower())
" 2>/dev/null || echo "false")

if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  # Already looped once — don't block again to prevent infinite loop
  exit 0
fi

TRACKING_FILE="$CLAUDE_PROJECT_DIR/.claude/.pending_index_changes"

# No tracking file = no changes tracked = allow stop
[[ ! -f "$TRACKING_FILE" ]] && exit 0

# Read changes
SOURCE_COUNT=0
SOURCE_LIST=""
INDEX_UPDATED=false

while IFS='|' read -r timestamp action filepath; do
  [[ -z "$action" ]] && continue
  if [[ "$action" == "INDEX_UPDATED" ]]; then
    INDEX_UPDATED=true
  else
    SOURCE_COUNT=$((SOURCE_COUNT + 1))
    SOURCE_LIST="${SOURCE_LIST}  - ${action} ${filepath}\n"
  fi
done < "$TRACKING_FILE"

# No source changes = allow stop
if [[ $SOURCE_COUNT -eq 0 ]]; then
  # Clean up tracking file
  rm -f "$TRACKING_FILE"
  exit 0
fi

# Source changed AND index was updated = allow stop
if [[ "$INDEX_UPDATED" == "true" ]]; then
  # Clean up tracking file
  rm -f "$TRACKING_FILE"
  exit 0
fi

# Source changed but index NOT updated → BLOCK stop
# Exit code 2 = blocking error, stderr is shown to Claude
cat >&2 << EOF
STOP BLOCKED: You modified source files but did not update the AI index.

Changed source files:
$(echo -e "$SOURCE_LIST")

Required action before you can finish:
1. Read the relevant docs/ai-index/ files that are affected by your changes
2. Update them: add new symbols to 01_SYMBOL_REGISTRY.md, update relations in 03_DEPENDENCY_GRAPH.md, and update any other affected index files
3. Follow the symbol ID convention (next sequential ID, never reuse removed IDs)
4. Mark removed symbols as [REMOVED]

Index directory: docs/ai-index/
After updating the index files, you may finish your task.
EOF

exit 2
