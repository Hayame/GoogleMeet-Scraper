---
name: index-code
description: >
  Symbolic AI code indexer and smart development workspace. Two modes:
  (1) INDEXING: Generates a structured knowledge graph of any codebase (frontend, backend,
  full-stack) as Markdown files. Triggers on: "index code", "zaindeksuj kod", "create index",
  "stwórz indeks", "reindex", "reindeksuj", "map codebase", "map architecture".
  (2) WORKSPACE: Auto-loads relevant index files for any development task. Triggers on ANY
  coding task when index exists at docs/ai-index/ — including: implement, add, create, fix,
  refactor, debug, review, optimize, migrate, build, zaimplementuj, dodaj, napraw, stwórz,
  zrefaktoruj, przeglądnij, zoptymalizuj. Detects task type and reads only needed index files.
  Always generates index patches alongside code changes.
---

# Index Code

Symbolic AI code index — generates and uses a structured knowledge graph of any codebase.

## Mode Detection

```
User request
│
├─ Contains: "index", "zaindeksuj", "reindex", "map codebase", "map architecture"
│   │
│   ├─ Contains: "frontend", "front", "UI", "klienta", "tylko front"
│   │   → INDEXING MODE — scope: FRONTEND only
│   │
│   ├─ Contains: "backend", "back", "API", "serwer", "tylko back"
│   │   → INDEXING MODE — scope: BACKEND only
│   │
│   └─ No scope keyword
│       → INDEXING MODE — scope: ALL (auto-detect stack)
│
├─ Contains: "health check", "sprawdź indeks", "index status"
│   → Run scripts/index_health_check.sh
│
└─ Any other development task
    → WORKSPACE MODE (auto-load index, implement task, patch index)
```

---

## INDEXING MODE

### Step 1: Detect stack, paths, and scope

**1a. Check for existing config** — look for `docs/ai-index/.index-config.json`:

```json
{
  "frontend": {
    "root": ["ClientApp", "src/WebUI"],
    "extensions": [".ts", ".tsx", ".vue", ".scss"]
  },
  "backend": {
    "root": ["src/Api", "src/Domain", "src/Infrastructure"],
    "extensions": [".cs"]
  },
  "extra": [
    {
      "name": "docs",
      "root": ["docs/architecture", "docs/api-specs"],
      "description": "Architecture docs and OpenAPI specs"
    }
  ]
}
```

`extensions` is **optional** in every section. When omitted → scan ALL files in that root
(excluding binary files, images, and build artifacts). When present → only scan matching extensions.

If config exists → use it. Skip auto-detection.

**User can add extra paths by saying:**
- "zaindeksuj też docs/architecture" → adds to `extra` in config
- "dodaj folder specs/ do indeksu" → adds to `extra` in config
- "zaindeksuj z dokumentacją" → auto-detects doc folders + source code

When extra paths are included, their content is indexed into:
- `01_SYMBOL_REGISTRY.md` — with type `DOC`, `SPEC`, `ADR`, `CONFIG` (prefix `D.S001`)
- `03_DEPENDENCY_GRAPH.md` — relations like `D.S001 —[DOCUMENTS]→ B.S045`
- New optional file: `13_DOCUMENTATION_MAP.md` — doc structure, coverage, links to symbols

**Extra path symbol types:**

| File type | Symbol type | Example |
|-----------|-------------|---------|
| `*.md` (prose) | `DOC` | Architecture Decision Record, README, guide |
| `*.yaml`/`*.json` (OpenAPI/Swagger) | `SPEC` | API endpoint specification |
| `*.proto` (protobuf) | `SPEC` | gRPC service definition |
| `*.graphql` | `SPEC` | GraphQL schema |
| `*.sql` (migrations) | `MIGRATION` | Database migration script |
| `*.http`/`*.rest` | `SPEC` | REST client test file |
| Config files | `CONFIG` | Docker, CI/CD, env templates |

**1b. Auto-detect paths** — if no config, scan project root for common patterns:

| Pattern | Classification |
|---------|---------------|
| `ClientApp/`, `client/`, `frontend/`, `front/`, `web/`, `ui/`, `webapp/` | Frontend root |
| `src/app/` with `angular.json` or `package.json` (react/vue/svelte) | Frontend root |
| `backend/`, `server/`, `api/`, `Api/`, `src/Api/`, `src/Server/` | Backend root |
| `Domain/`, `Infrastructure/`, `Application/`, `Persistence/` | Backend root (Clean Architecture) |
| `Controllers/`, `Services/`, `Repositories/` at root or under `src/` | Backend root |
| `packages/*/package.json` with react/vue | Monorepo frontend |
| `packages/*/` with `.csproj` or `requirements.txt` | Monorepo backend |

Run: `find . -maxdepth 3 -type f \( -name "package.json" -o -name "*.csproj" -o -name "*.sln" -o -name "requirements.txt" -o -name "go.mod" \)` to locate stack markers.

**1c. Classify stack** from detected markers:

| Signal | Stack |
|--------|-------|
| `package.json` with react/vue/angular/svelte/next | Frontend |
| `*.csproj` / `*.sln` / `Program.cs` | Backend (.NET) |
| `requirements.txt` / `pyproject.toml` / `manage.py` | Backend (Python) |
| `pom.xml` / `build.gradle` | Backend (Java) |
| `go.mod` | Backend (Go) |
| Multiple of the above | Full-stack → prefix IDs: `F.S001` / `B.S001` |

Load appropriate taxonomy from `references/taxonomy-frontend.md` or `references/taxonomy-backend.md`.

**1d. If ambiguous** (auto-detection uncertain) → ASK the user:

> "Wykryłem full-stack projekt. Wskaż katalogi:"
> - Frontend root? (np. `ClientApp`, `src/web`)
> - Backend root? (np. `src/Api`, `backend`)
> - Dodatkowe foldery do indeksu? (np. `docs/architecture`, `specs/`)

Save answer to `docs/ai-index/.index-config.json` for next time.

**1e. Scope filtering** — when user requests scoped indexing:

| User says | Scope | Scan only | Symbol prefix | Index files |
|-----------|-------|-----------|---------------|-------------|
| "zaindeksuj kod" | ALL | All detected roots | `F.S001` + `B.S001` | All |
| "zaindeksuj tylko frontend" | FRONTEND | Frontend roots only | `F.S001` | FE-specific |
| "zaindeksuj tylko backend" | BACKEND | Backend roots only | `B.S001` | BE-specific |
| "zaindeksuj z dokumentacją" | ALL + EXTRA | All roots + extra paths | `F.S*` + `B.S*` + `D.S*` | All + `13_DOCUMENTATION_MAP` |
| "zaindeksuj też docs/" | EXTRA only | Specified extra path | `D.S001` | `13_DOCUMENTATION_MAP` + shared |

When scoped, PRESERVE existing symbols from the other scope:
- "zaindeksuj tylko frontend" → do NOT touch `B.S*` symbols, do NOT modify backend-specific files
- "zaindeksuj tylko backend" → do NOT touch `F.S*` symbols, do NOT modify frontend-specific files
- Shared files (`01_SYMBOL_REGISTRY`, `03_DEPENDENCY_GRAPH`, `06_TYPE_SYSTEM`) → update only scoped part

### Step 2: Collect source files

Read all source files using `view` and `bash` (find + cat). Alternatively run:

```bash
# Full project
bash /path/to/this/skill/scripts/collect_sources.sh <project-root>

# Scoped (frontend or backend only)
bash /path/to/this/skill/scripts/collect_sources.sh <project-root> --stack frontend
bash /path/to/this/skill/scripts/collect_sources.sh <project-root> --stack backend
```

### Step 3: Parallel indexing with subagents

For projects with >30 source files, use **parallel subagents** (Task tool) to speed up indexing.
For smaller projects, skip to Step 4 and generate sequentially.

**3a. Plan partitions** — the coordinator (main agent) splits work by module boundaries:

```
Coordinator scans project structure
│
├─ Partition by natural boundaries:
│   ├─ Full-stack: frontend vs backend vs extra (2-3 partitions)
│   ├─ Clean Architecture: Domain / Application / Infrastructure / API (4 partitions)
│   ├─ Monorepo: per package (N partitions)
│   └─ Large module: split by subfolder (e.g. Controllers/, Services/, Repos/)
│
├─ Assign symbol ID ranges to each partition:
│   ├─ Partition A: S001–S199 (or F.S001–F.S199)
│   ├─ Partition B: S200–S399 (or B.S001–B.S199)
│   ├─ Partition C: S400–S599
│   └─ ... (200 IDs per partition, expand if needed)
│
└─ Launch subagents in parallel
```

**3b. Subagent task prompt template:**

Each subagent receives a focused task via the Task tool:

```
Analyze these source files and produce a PARTIAL index.

PARTITION: [name, e.g. "Domain layer"]
FILES: [list of file paths in this partition]
SYMBOL ID RANGE: [e.g. B.S001–B.S199]
TAXONOMY: [content of taxonomy-backend.md or taxonomy-frontend.md]
TEMPLATES: [relevant sections from templates.md]

Output a JSON file to: docs/ai-index/.partials/[partition-name].json

JSON schema:
{
  "partition": "domain",
  "symbols": [
    { "id": "B.S001", "name": "Employee", "type": "ENTITY", "path": "src/Domain/Employee.cs", "line": 12, "description": "..." }
  ],
  "relations": [
    { "subject": "B.S001", "relation": "USES", "object": "B.S015" }
  ],
  "types": [...],
  "business_rules": [...],
  "external_deps": [...]
}

Rules:
- Use ONLY IDs in range B.S001–B.S199
- For references to symbols OUTSIDE your partition, use placeholder: "XREF:ClassName"
- Include file path + line number for every fact
- Mark uncertain info as [UNCERTAIN: reason]
```

**3c. Coordinator merges results:**

After all subagents complete:

1. Read all `.json` files from `docs/ai-index/.partials/`
2. Resolve `XREF:` placeholders → match to actual symbol IDs from other partitions
3. Merge symbols into `01_SYMBOL_REGISTRY.md` (sorted by ID)
4. Merge relations into `03_DEPENDENCY_GRAPH.md` (deduplicated)
5. Merge types into `06_TYPE_SYSTEM.md`
6. Generate remaining files: `00_PROJECT_OVERVIEW`, `02_STRUCTURE_TREE`, `12_KNOWLEDGE_GRAPH_SUMMARY`
7. Clean up `docs/ai-index/.partials/`

**3d. Subagent allocation guide:**

| Project size | Partitions | Subagents | Estimated speedup |
|-------------|------------|-----------|-------------------|
| <30 files | Don't parallelize | 0 (sequential) | — |
| 30–100 files | 2–3 (by stack/layer) | 2–3 | ~2× |
| 100–300 files | 3–5 (by module) | 3–5 | ~3× |
| 300+ files | 5–8 (by module + subfolder) | 5–8 | ~4–5× |

**Example: .NET Clean Architecture project (150 files):**

```
Coordinator:
├─ Subagent 1: src/Domain/ (entities, value objects)         → B.S001–B.S199
├─ Subagent 2: src/Application/ (services, DTOs, commands)   → B.S200–B.S399
├─ Subagent 3: src/Infrastructure/ (repos, EF, external)     → B.S400–B.S599
├─ Subagent 4: src/Api/ (controllers, middleware, filters)   → B.S600–B.S799
└─ Subagent 5: ClientApp/ (React components, hooks, state)   → F.S001–F.S199

Coordinator merges 5 partial JSONs → final index files
```

### Step 4: Generate index files to `docs/ai-index/`

Create directory `docs/ai-index/` and generate these files using templates from
`references/templates.md` (or merge from subagent partials if Step 3 was used):

**Always generate:**

| File | Contents |
|------|----------|
| `00_PROJECT_OVERVIEW.md` | Identity, architecture, directory tree, entry points |
| `01_SYMBOL_REGISTRY.md` | ALL symbols: ID, type, path, line, description |
| `02_STRUCTURE_TREE.md` | Component tree (FE) or module/layer hierarchy (BE) |
| `03_DEPENDENCY_GRAPH.md` | Relations: `SUBJECT —[RELATION]→ OBJECT` + matrix |
| `06_TYPE_SYSTEM.md` | Types, interfaces, enums, DTOs, validation schemas |
| `08_BUSINESS_RULES.md` | ACL, validation, invariants, conditional logic |
| `10_EXTERNAL_DEPS.md` | Third-party packages with versions |
| `12_KNOWLEDGE_GRAPH_SUMMARY.md` | Stats, top connected symbols, Mermaid diagram |

**Frontend-specific:**
`04_STATE_MAP.md`, `05_ROUTES_MAP.md`, `09_HOOKS_AND_UTILS.md`, `11_CROSS_CUTTING.md`

**Backend-specific:**
`04_DATA_LAYER.md`, `05_API_SURFACE.md`, `07_MIDDLEWARE_PIPELINE.md`,
`09_INFRASTRUCTURE.md`, `09_SERVICES_AND_UTILS.md`, `11_CROSS_CUTTING.md`

**Extra paths (when configured):**
`13_DOCUMENTATION_MAP.md` — doc inventory, coverage matrix (which code symbols are documented),
API spec ↔ endpoint mapping, ADR timeline. Generated only when `extra` paths exist in config
or user explicitly requests doc indexing.

### Indexing rules

- Every exported symbol + every internal symbol used by >1 file gets an ID (S001–S999+)
- Full-stack projects: prefix `F.S001` (frontend), `B.S001` (backend), `D.S001` (docs/extra)
- Symbol IDs are permanent — removed symbols marked `[REMOVED]`, never renumbered
- Every fact includes file path + line number
- Mark uncertain info as `[UNCERTAIN: reason]`
- All diagrams in Mermaid format
- Large projects (>200 files): index module-by-module, preserve sequential numbering

**Scoped indexing rules (full-stack):**
- When scope = FRONTEND: only assign `F.S*` IDs, start from next available `F.S*` number
- When scope = BACKEND: only assign `B.S*` IDs, start from next available `B.S*` number
- When scope = EXTRA: only assign `D.S*` IDs, link to existing `F.S*`/`B.S*` via `DOCUMENTS` relation
- In shared files (01_SYMBOL_REGISTRY, 03_DEPENDENCY_GRAPH): append/update only scoped symbols
- Never delete or modify symbols from the OTHER scope
- Cross-scope relations (e.g. `F.S012 —[CALLS]→ B.S045`, `D.S003 —[DOCUMENTS]→ B.S045`) are added when both scopes exist

---

## WORKSPACE MODE

Auto-loads index context for any development task. User just describes the task normally.

### Step 1: Check index exists

```
view docs/ai-index/
```

If not found → tell user: "Indeks nie istnieje. Powiedz `zaindeksuj kod` żeby go wygenerować."

### Step 2: Read registry header

```
view docs/ai-index/01_SYMBOL_REGISTRY.md (first 50 lines)
```

### Step 3: Classify task → load index files

**TASK ROUTING TABLE:**

| Task Type | Trigger Signals | Load These Index Files (in order) |
|---|---|---|
| New endpoint / API | endpoint, API, controller, route, REST, CRUD | `05_API_SURFACE` → `06_TYPE_SYSTEM` → `07_MIDDLEWARE_PIPELINE` → `04_DATA_LAYER` |
| New component / page | component, page, screen, view, widok, formularz | `02_STRUCTURE_TREE` → `06_TYPE_SYSTEM` → `04_STATE_MAP` → `05_ROUTES_MAP` |
| New service / logic | service, handler, logic, calculate, rule | `02_STRUCTURE_TREE` → `06_TYPE_SYSTEM` → `08_BUSINESS_RULES` → `03_DEPENDENCY_GRAPH` |
| Database / entity | entity, table, column, migration, schema, DB | `04_DATA_LAYER` → `06_TYPE_SYSTEM` → `03_DEPENDENCY_GRAPH` |
| Bug fix | bug, fix, error, nie działa, crash, exception | `03_DEPENDENCY_GRAPH` → `08_BUSINESS_RULES` → (domain file based on bug area) |
| Refactoring | refactor, extract, move, split, clean up | `03_DEPENDENCY_GRAPH` → `01_SYMBOL_REGISTRY` → `12_KNOWLEDGE_GRAPH_SUMMARY` |
| State / data flow | state, store, context, props, data flow | `04_STATE_MAP` → `03_DEPENDENCY_GRAPH` → `02_STRUCTURE_TREE` |
| Auth / security | auth, login, permission, role, guard, JWT | `08_BUSINESS_RULES` → `07_MIDDLEWARE_PIPELINE` → `11_CROSS_CUTTING` |
| Testing | test, spec, coverage, mock | `01_SYMBOL_REGISTRY` → `03_DEPENDENCY_GRAPH` → `06_TYPE_SYSTEM` |
| Performance | slow, optimize, cache, bundle, lazy | `10_EXTERNAL_DEPS` → `11_CROSS_CUTTING` → `03_DEPENDENCY_GRAPH` |
| Config / infra | config, env, docker, CI, deploy | `09_INFRASTRUCTURE` → `00_PROJECT_OVERVIEW` → `10_EXTERNAL_DEPS` |
| Code review | review, PR, sprawdź, oceń | `08_BUSINESS_RULES` → `03_DEPENDENCY_GRAPH` → `06_TYPE_SYSTEM` |
| Impact analysis | impact, what breaks, co się zepsuje | `03_DEPENDENCY_GRAPH` → `01_SYMBOL_REGISTRY` → `12_KNOWLEDGE_GRAPH_SUMMARY` |
| Explain / onboard | explain, how does, jak działa, opisz | `00_PROJECT_OVERVIEW` → `02_STRUCTURE_TREE` → `12_KNOWLEDGE_GRAPH_SUMMARY` → `13_DOCUMENTATION_MAP` |
| Migration | migrate, upgrade, zmień framework | `10_EXTERNAL_DEPS` → `03_DEPENDENCY_GRAPH` → `11_CROSS_CUTTING` |
| Documentation | doc, document, opisz API, ADR, spec | `13_DOCUMENTATION_MAP` → `05_API_SURFACE` → `00_PROJECT_OVERVIEW` |

**Multi-category**: combine file lists, deduplicate. Load order priority:
overview → structure → types → domain-specific → dependencies → rules.

**Unsure**: default to `00_PROJECT_OVERVIEW` + `03_DEPENDENCY_GRAPH` + `06_TYPE_SYSTEM`.

**File doesn't exist**: silently skip, continue with what's available.

### Step 4: Find related symbols

Search the loaded index for entities mentioned in the task. From dependency graph,
trace connected symbols. Note file paths — read actual source if index lacks detail.

### Step 5: Execute task

Follow patterns visible in the index: naming, folder structure, DI, validation,
error handling, auth. Generate code consistent with existing architecture.

### Step 6: Always output index patch

```markdown
## 📋 Index Patch

### New Symbols → 01_SYMBOL_REGISTRY.md
| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| {next ID} | ... | ... | ... | ... | ... | ... |

### New Relations → 03_DEPENDENCY_GRAPH.md
{ID} —[RELATION]→ {ID}

### Updates to Other Index Files
#### {filename}.md
{changes}
```

Never skip the index patch. Use next sequential ID from registry.

---

## INCREMENTAL REINDEX

When user says "zaktualizuj indeks" or "reindex":

1. Get changed files: `git log --name-only --since="2 weeks ago" -- src/`
2. Read current index + changed source files
3. For each change: add new symbols (next IDs), update changed, mark removed as `[REMOVED]`
4. Update dependency graph and summary stats
5. Write updated files to `docs/ai-index/`

---

## CLAUDE CODE HOOKS (Auto-Update)

This skill includes hooks for Claude Code CLI that make index updates automatic.

### Install

```bash
bash scripts/install-hooks.sh /path/to/project
```

### How it works

Three hooks in `.claude/settings.json`:

| Hook | Event | What it does |
|------|-------|-------------|
| `hook-post-tool-track.sh` | PostToolUse (Write\|Edit) | Logs every source file Claude changes |
| `hook-stop-verify-index.sh` | Stop | **Blocks Claude from finishing** if source files changed but index wasn't updated |
| `hook-prompt-inject.sh` | UserPromptSubmit | Injects index context (symbol count, task routing) into every prompt |

### Flow

```
User: "Dodaj endpoint PUT /api/employees/{id}/ppk"
  │
  ├─ UserPromptSubmit → injects: "AI index has 287 symbols, route: endpoint→05+06+07+04"
  ├─ Claude reads index, implements feature, writes source files
  │   → PostToolUse tracks each changed source file
  ├─ Claude tries to stop
  │   → Stop hook: 2 source changes, 0 index updates → EXIT 2 (BLOCKED)
  │   → "Update docs/ai-index/ first: PpkController.cs, PpkService.cs"
  ├─ Claude updates index files
  │   → PostToolUse logs: INDEX_UPDATED
  └─ Claude tries to stop again
      → Stop hook: index updated ✅ → EXIT 0 (allowed)
```

User does nothing extra. Index stays current automatically.
Anti-loop: Stop hook checks `stop_hook_active` to prevent infinite loops.
