# AI Index Integration

Reference: shared module defining AI code index awareness for all phases.

---

## Overview

This project uses a Symbolic AI code index at `docs/ai-index/`.

**Before any implementation work, read:**
- `docs/ai-index/.skill/SKILL.md` -- full indexing instructions
- `docs/ai-index/.skill/references/templates.md` -- index file templates
- `docs/ai-index/.skill/references/taxonomy-{{STACK_ID}}.md` -- symbol types

---

## Pre-Implementation (Phase 1)

Before starting planning, read relevant index files based on task type:

**Task -> Index File Routing:**

| Task Type | Index Files to Read |
|-----------|-------------------|
| New endpoint/API | 05_API_SURFACE, 06_TYPE_SYSTEM, 07_MIDDLEWARE_PIPELINE, 04_DATA_LAYER |
| New component/page | 02_STRUCTURE_TREE, 06_TYPE_SYSTEM, 04_STATE_MAP, 05_ROUTES_MAP |
| New service/logic | 02_STRUCTURE_TREE, 06_TYPE_SYSTEM, 08_BUSINESS_RULES |
| Database change | 04_DATA_LAYER, 06_TYPE_SYSTEM, 03_DEPENDENCY_GRAPH |
| Bug fix | 03_DEPENDENCY_GRAPH, 08_BUSINESS_RULES + relevant domain file |
| Refactor | 03_DEPENDENCY_GRAPH, 01_SYMBOL_REGISTRY, 12_KNOWLEDGE_GRAPH_SUMMARY |

Use the index to understand existing architecture, find patterns to follow, and identify integration points.

---

## Post-Implementation (Phase 5)

After code changes are complete and validated, update affected index files:

1. **Symbol Registry (01):** Add new symbols with next sequential ID
2. **Structure Tree (02):** Update file/directory structure
3. **Dependency Graph (03):** Update dependencies between modules
4. **Type System (06):** Add new types/interfaces
5. **Other relevant files:** Based on task type (see routing table)

**Rules:**
- Use next sequential symbol ID (never reuse or renumber)
- Mark removed symbols as [REMOVED]
- Follow templates from `docs/ai-index/.skill/references/templates.md`

---

## Verification (Phase 5)

As part of Phase 5 validation, verify:
- All new files have corresponding index entries
- All modified files have updated index entries
- Dependency graph reflects new relationships
- Symbol registry is current

**Note:** The Stop hook (`hook-stop-verify-index.sh`) enforces index updates. Claude cannot finish until the index is updated for changed files.
