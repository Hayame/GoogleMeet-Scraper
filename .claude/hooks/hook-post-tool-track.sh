#!/bin/bash
# post-tool-track-changes.sh
# Claude Code PostToolUse hook — tracks source file changes for index auto-update
#
# Fires after every Write/Edit/MultiEdit. Logs source file changes to
# .claude/.pending_index_changes so the Stop hook knows what to verify.

set -euo pipefail

INPUT=$(cat)  # Read JSON from stdin

FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Check tool_input first (works for Write, Edit, MultiEdit)
ti = data.get('tool_input', {})
path = ti.get('file_path', ti.get('filePath', ''))
# Fallback to tool_response (PostToolUse has this)
if not path:
    tr = data.get('tool_response', {})
    path = tr.get('filePath', tr.get('file_path', ''))
print(path)
" 2>/dev/null || echo "")

# Skip if no file path
[[ -z "$FILE_PATH" ]] && exit 0

# Skip non-source files
if echo "$FILE_PATH" | grep -qE '(node_modules|\.git/|dist/|build/|bin/|obj/|__pycache__|\.venv|coverage|\.map$|\.min\.)'; then
  exit 0
fi

# Skip index files themselves (Claude updating the index shouldn't re-trigger)
if echo "$FILE_PATH" | grep -qE '(docs/ai-index/|\.ai-index/)'; then
  # Actually: mark that index WAS updated (for Stop hook to verify)
  TRACKING_DIR="$CLAUDE_PROJECT_DIR/.claude"
  mkdir -p "$TRACKING_DIR"
  echo "$(date -Iseconds)|INDEX_UPDATED|$FILE_PATH" >> "$TRACKING_DIR/.pending_index_changes"
  exit 0
fi

# Check if it's a source file we care about
if ! echo "$FILE_PATH" | grep -qE '\.(cs|ts|tsx|js|jsx|py|java|kt|go|rs|vue|svelte|rb|php|sql|proto|graphql)$'; then
  exit 0
fi

# Log the change
TRACKING_DIR="$CLAUDE_PROJECT_DIR/.claude"
mkdir -p "$TRACKING_DIR"

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "Write")

# Determine action type
if [[ "$TOOL_NAME" == "Write" ]]; then
  ACTION="WRITE"
else
  ACTION="EDIT"
fi

echo "$(date -Iseconds)|$ACTION|$FILE_PATH" >> "$TRACKING_DIR/.pending_index_changes"

exit 0
