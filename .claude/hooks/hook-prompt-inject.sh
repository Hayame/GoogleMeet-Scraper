#!/bin/bash
# hook-prompt-inject-index.sh
# Claude Code UserPromptSubmit hook — injects AI index awareness into every prompt
#
# For UserPromptSubmit, exit code 0 stdout is ADDED TO CONTEXT.
# This means Claude sees this info alongside every user message.

set -euo pipefail

INPUT=$(cat)
INDEX_DIR="$CLAUDE_PROJECT_DIR/docs/ai-index"

# If no index exists, stay silent (don't pollute every interaction)
[[ ! -d "$INDEX_DIR" ]] && exit 0

# Check if there's a symbol registry (confirms index is real)
REGISTRY="$INDEX_DIR/01_SYMBOL_REGISTRY.md"
[[ ! -f "$REGISTRY" ]] && exit 0

# Count symbols to give Claude a sense of project scope
TOTAL_SYMBOLS=$(grep -cE '^\|[[:space:]]+[BF]?\.?S[0-9]+' "$REGISTRY" 2>/dev/null) || TOTAL_SYMBOLS=0
REMOVED=$(grep -c '\[REMOVED\]' "$REGISTRY" 2>/dev/null) || REMOVED=0
ACTIVE=$((TOTAL_SYMBOLS - REMOVED))

# List available index files (safe: no pipefail crash if empty)
INDEX_FILES=""
for f in "$INDEX_DIR"/*.md; do
  [[ -f "$f" ]] || continue
  [[ -n "$INDEX_FILES" ]] && INDEX_FILES="$INDEX_FILES, "
  INDEX_FILES="${INDEX_FILES}$(basename "$f")"
done

# Check pending changes from BOTH tracking systems:
# 1) CC hooks tracking: .claude/.pending_index_changes (written by hook-post-tool-track.sh)
# 2) Standalone tracking: docs/ai-index/.pending_changes.log (written by track_changes.sh / git hooks)
PENDING_CC="$CLAUDE_PROJECT_DIR/.claude/.pending_index_changes"
PENDING_EXT="$INDEX_DIR/.pending_changes.log"
PENDING_COUNT=0

for PENDING in "$PENDING_CC" "$PENDING_EXT"; do
  if [[ -f "$PENDING" ]]; then
    COUNT=$(grep -cvE '^$|INDEX_UPDATED' "$PENDING" 2>/dev/null) || COUNT=0
    PENDING_COUNT=$((PENDING_COUNT + COUNT))
  fi
done

# Output context (this gets injected into Claude's context)
cat << EOF
[AI Index Context]
Project has a Symbolic AI code index at docs/ai-index/ with $ACTIVE active symbols.
Available index files: $INDEX_FILES

CODEBASE SEARCH ORDER (mandatory):
1. BEFORE using Grep/Glob to search the codebase, ALWAYS read the relevant AI index file first:
   - Looking for a symbol, file, or component? → Read 01_SYMBOL_REGISTRY.md
   - Looking for project structure or where something lives? → Read 02_STRUCTURE_TREE.md
   - Looking for dependencies or how modules connect? → Read 03_DEPENDENCY_GRAPH.md
   - Looking for API endpoints? → Read 05_API_SURFACE.md
   - Looking for types or interfaces? → Read 06_TYPE_SYSTEM.md
   - Looking for business logic or rules? → Read 08_BUSINESS_RULES.md
2. ONLY use Grep/Glob if the index did not have the answer you need.
3. After code changes: UPDATE affected index files.

Task routing: new endpoint→05_API_SURFACE+06_TYPE_SYSTEM+07_MIDDLEWARE, new component→02_STRUCTURE_TREE+04_STATE_MAP, bug fix→03_DEPENDENCY_GRAPH+08_BUSINESS_RULES, refactor→03_DEPENDENCY_GRAPH+01_SYMBOL_REGISTRY.
EOF

if [[ $PENDING_COUNT -gt 0 ]]; then
  echo "⚠️ There are $PENDING_COUNT unprocessed source file changes pending index update."
fi

exit 0
