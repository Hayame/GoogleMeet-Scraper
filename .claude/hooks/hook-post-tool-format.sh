#!/bin/bash
# hook-post-tool-format.sh
# Claude Code PostToolUse hook — auto-formats files after Write/Edit/MultiEdit
#
# Routes to the correct formatter based on file location:
#   - src/**/*.{ts,tsx,css}  → Prettier
#   - backend/**/*.cs        → dotnet format

set -euo pipefail

INPUT=$(cat)  # Read JSON from stdin

FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ti = data.get('tool_input', {})
path = ti.get('file_path', ti.get('filePath', ''))
if not path:
    tr = data.get('tool_response', {})
    path = tr.get('filePath', tr.get('file_path', ''))
print(path)
" 2>/dev/null || echo "")

# Skip if no file path
[[ -z "$FILE_PATH" ]] && exit 0

# Skip generated / dependency directories
if echo "$FILE_PATH" | grep -qE '(node_modules|dist/|build/|bin/|obj/)'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Frontend: Prettier for ts, tsx, css files under src/
if echo "$FILE_PATH" | grep -qE '^(.*/)?src/.*\.(ts|tsx|css)$'; then
  npx prettier --write "$FILE_PATH" 2>&1
  exit $?
fi

# Backend: dotnet format for .cs files under backend/
if echo "$FILE_PATH" | grep -qE '^(.*/)?backend/.*\.cs$'; then
  # Extract the path relative to backend/ for --include
  RELATIVE_PATH=$(echo "$FILE_PATH" | sed 's|.*/backend/|./|; s|^backend/|./|')
  dotnet format backend/GeoMarkup.sln --include "$RELATIVE_PATH" --verbosity quiet 2>&1
  exit $?
fi

# Everything else: skip silently
exit 0
