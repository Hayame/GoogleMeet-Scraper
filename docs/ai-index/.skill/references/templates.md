# Index File Templates

Templates for all index files. Adapt to project type. Skip sections that don't apply.

---

## 00_PROJECT_OVERVIEW.md

```markdown
# Project Overview

## Identity
- Name: {project name}
- Stack: {.NET 8 / React + TypeScript / Python FastAPI / ...}
- Language: {C# / TypeScript / Python / Go / Java / ...}
- Runtime version: {.NET 8.0 / Node 20 / Python 3.12 / ...}
- Package manager: {NuGet / npm / pip / Maven / ...}
- Build tool: {dotnet CLI / Vite / Webpack / Gradle / ...}

## Architecture Pattern
- Pattern: {Monolith / Microservice / Modular monolith / SPA / SSR / ...}
- Architecture style: {Clean Architecture / Vertical Slices / MVC / MVVM / Hexagonal / ...}
- API style: {REST / GraphQL / gRPC / tRPC / Minimal API / ...}
- State management (frontend): {Redux / Zustand / Context / Signals / N/A}
- ORM / data access (backend): {EF Core / Prisma / SQLAlchemy / GORM / N/A}
- Database: {PostgreSQL / SQL Server / MongoDB / SQLite / ...}
- Messaging: {RabbitMQ / Kafka / NATS / Redis Pub-Sub / N/A}
- Auth: {JWT / Cookie / OAuth2 / Identity / Keycloak / ...}
- Caching: {Redis / In-memory / N/A}
- Testing: {xUnit / Jest / pytest / JUnit / ...}

## Directory Structure (depth=2)
{tree output}

## Entry Points
| Entry | File | Description |
|-------|------|-------------|
| Main | {path} | Application bootstrap |
| Router/API | {path} | Route/endpoint registration |
| DI/IoC | {path} | Dependency injection setup |
| DB | {path} | Database context / connection |

## Key Config Files
| File | Role |
|------|------|
| {path} | {description} |

## Environment Variables
| Variable | Purpose | Required |
|----------|---------|----------|
| {name} | {purpose} | yes/no |
```

---

## 01_SYMBOL_REGISTRY.md

```markdown
# Symbol Registry

## Taxonomy Reference
See taxonomy-frontend.md or taxonomy-backend.md for full type code definitions.

## Registry

| ID | Symbol Name | Type | File Path | Line | Exported | Description |
|----|-------------|------|-----------|------|----------|-------------|
| S001 | {name} | {type code} | {path} | {line} | {yes/no/default} | {one-line description} |
| S002 | ... | ... | ... | ... | ... | ... |

## Numbering Rules
- Sequential: S001, S002, ... S999, S1000+
- Full-stack prefix: F.S001 (frontend), B.S001 (backend)
- Removed symbols: marked [REMOVED], ID never reused
- Batch ranges: components S001-S099, hooks S100-S149, etc. (optional grouping)
```

---

## 02_STRUCTURE_TREE.md

### Frontend variant: Component Tree

```markdown
# Component Tree

## Rendering Hierarchy

App (S001)
├── ThemeProvider (S002) [provider]
│   └── AuthProvider (S003) [provider]
│       └── RouterProvider (S004)
│           ├── MainLayout (S010)
│           │   ├── Header (S011)
│           │   ├── <Outlet /> (router)
│           │   └── Footer (S012)
│           └── AuthLayout (S020)
│               └── <Outlet /> (router)

## Per-Component Detail

### S001 — App
- **Props**: none
- **Internal state**: none
- **External state**: none
- **Renders**: ThemeProvider → AuthProvider → RouterProvider
- **Providers wrapping**: ThemeProvider, AuthProvider
- **Side effects**: {list or "none"}
- **Conditional rendering**: {conditions or "none"}
- **Memoization**: {React.memo / useMemo / useCallback or "none"}
- **Error boundary**: {yes (ID) / no}
- **Accessibility**: {ARIA roles, keyboard handling, or "none noted"}

{repeat for every component}
```

### Backend variant: Module/Layer Hierarchy

```markdown
# Module Hierarchy

## Layer Architecture

Application
├── API Layer
│   ├── Controllers/
│   │   ├── UsersController (S001)
│   │   ├── OrdersController (S002)
│   │   └── AuthController (S003)
│   ├── Middleware/
│   │   ├── AuthMiddleware (S010)
│   │   └── ErrorHandlingMiddleware (S011)
│   └── Filters/
│       └── ValidationFilter (S012)
│
├── Business Layer
│   ├── Services/
│   │   ├── UserService (S020) → IUserService (S021)
│   │   └── OrderService (S022) → IOrderService (S023)
│   ├── Handlers/ (CQRS)
│   │   ├── CreateUserHandler (S030)
│   │   └── GetOrdersHandler (S031)
│   └── Validators/
│       ├── CreateUserValidator (S040)
│       └── UpdateOrderValidator (S041)
│
├── Data Layer
│   ├── Entities/
│   │   ├── User (S050)
│   │   └── Order (S051)
│   ├── Repositories/
│   │   ├── UserRepository (S060) → IUserRepository (S061)
│   │   └── OrderRepository (S062) → IOrderRepository (S063)
│   └── Migrations/
│       ├── InitialCreate (S070)
│       └── AddOrderStatus (S071)
│
└── Infrastructure
    ├── Config/
    │   ├── DatabaseConfig (S080)
    │   └── JwtConfig (S081)
    ├── DI/
    │   └── ServiceRegistration (S082)
    └── External/
        ├── EmailService (S090)
        └── PaymentGateway (S091)

## Per-Module Detail

### S001 — UsersController
- **Base class**: ControllerBase / ApiController
- **Injects**: IUserService (S021), ILogger<UsersController>
- **Endpoints**: GET /api/users, GET /api/users/:id, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
- **Middleware**: AuthMiddleware (S010), ValidationFilter (S012)
- **Authorization**: [Authorize] on class, [Authorize(Policy="Admin")] on DELETE
- **Error handling**: {strategy}

{repeat for every module}
```

---

## 03_DEPENDENCY_GRAPH.md

```markdown
# Dependency Graph

## Relations Format: SUBJECT —[RELATION]→ OBJECT

### Import / Injection Relations
S001 —[INJECTS]→ S021  (UsersController → IUserService)
S020 —[INJECTS]→ S061  (UserService → IUserRepository)
S020 —[IMPLEMENTS]→ S021  (UserService → IUserService)

### Call Relations
S001 —[CALLS]→ S020.GetAll  (controller → service method)
S020 —[CALLS]→ S060.FindById  (service → repository method)

### Data Flow Relations
S001 —[ACCEPTS]→ S100 (CreateUserDto)
S001 —[RETURNS]→ S101 (UserResponseDto)
S060 —[QUERIES]→ users_table
S060 —[MUTATES]→ users_table

### Event / Messaging Relations
S020 —[PUBLISHES]→ S200 (UserCreatedEvent)
S210 —[HANDLES]→ S200 (EmailHandler → UserCreatedEvent)

### Pipeline Relations
POST /api/users —[PIPES_THROUGH]→ S010 → S012 → S001

## Dependency Matrix (top 20 most connected)

| Symbol | ID | In-degree | Out-degree | Total | Classification |
|--------|----|-----------|------------|-------|----------------|
| IUserService | S021 | 5 | 0 | 5 | Interface hub |
| UserService | S020 | 1 | 8 | 9 | Core service |
| ... | ... | ... | ... | ... | ... |

## Circular Dependencies
- ⚠️ {list or "None detected ✅"}

## Orphan Symbols (no relations)
- ⚠️ {list or "None detected ✅"}
```

---

## 04_STATE_MAP.md (Frontend)

```markdown
# State Map

## 1. Global State (Store)
| Store/Slice | ID | Key | Type | Initial | Mutated by |
|-------------|----|-----|------|---------|------------|

## 2. Context State
| Context | ID | Value Shape | Provider Location | Consumers |
|---------|----|-------------|-------------------|-----------|

## 3. Server State (React Query / SWR / Apollo)
| Query Key | ID | Endpoint | Stale Time | Consumers |
|-----------|----|----------|------------|-----------|

## 4. Local Component State
| Component | ID | State Key | Type | Purpose |
|-----------|----|-----------|------|---------|

## 5. URL State
| Param | Source | Type | Used by |
|-------|--------|------|---------|

## State Flow Diagram
​```mermaid
graph LR
    UserAction -->|dispatch| Store
    Store -->|selector| Component
    Component -->|mutation| APILayer
    APILayer -->|invalidate| ServerState
    ServerState -->|rerender| Component
​```
```

---

## 04_DATA_LAYER.md (Backend)

```markdown
# Data Layer

## Database: {PostgreSQL / SQL Server / ...}
## ORM: {EF Core / Prisma / SQLAlchemy / ...}

## Entities

### S050 — User
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| Id | Guid / int | PK | |
| Email | string(256) | Unique, Not Null | |
| Name | string(100) | Not Null | |
| Role | UserRole (ENM) | Not Null, Default=User | FK → Roles? |
| CreatedAt | DateTime | Not Null, Default=now | |

- **Table**: users
- **Relationships**: has_many Orders, belongs_to Tenant
- **Indexes**: IX_Users_Email (unique), IX_Users_TenantId
- **Soft delete**: {yes/no}
- **Audit fields**: {CreatedAt, UpdatedAt, CreatedBy / none}

## Repositories

### S060 — UserRepository
- **Interface**: IUserRepository (S061)
- **Entity**: User (S050)
- **Methods**:
  | Method | Query Type | Parameters | Returns | Notes |
  |--------|-----------|------------|---------|-------|
  | GetByIdAsync | READ | Guid id | User? | Includes Orders |
  | GetActiveAsync | READ | — | IList<User> | Where IsActive |
  | CreateAsync | WRITE | User | User | |
  | UpdateAsync | WRITE | User | void | |
  | DeleteAsync | WRITE | Guid id | bool | Soft delete |

## Migrations (chronological)
| ID | Name | Date | Changes |
|----|------|------|---------|
| S070 | InitialCreate | 2024-01-15 | Create users, orders tables |
| S071 | AddOrderStatus | 2024-02-20 | Add Status column to orders |

## Database Diagram
​```mermaid
erDiagram
    User ||--o{ Order : places
    User }|--|| Tenant : belongs_to
    Order ||--|{ OrderItem : contains
    OrderItem }|--|| Product : references
​```
```

---

## 05_ROUTES_MAP.md (Frontend)

```markdown
# Routes Map

## Route Tree
| Path | Component | ID | Layout | Guard | Lazy | Params |
|------|-----------|----|--------|-------|------|--------|

## Guards
| Guard | ID | Logic | Redirect |
|-------|----|-------|----------|

## Navigation Actions
| From | To | Trigger | Method |
|------|----|---------|--------|

## Code Splitting Boundaries
- Lazy at: {list}
- Suspense at: {list}
```

---

## 05_API_SURFACE.md (Backend)

```markdown
# API Surface

## Base URL: {from config / env}
## Auth: {JWT Bearer / Cookie / API Key}
## Versioning: {URL /v1/ / Header / none}

## Endpoints

| Method | Path | Controller | ID | Request | Response | Auth | Cache | Rate Limit |
|--------|------|------------|----|---------|----------|------|-------|------------|
| GET | /api/users | UsersCtl | S001 | — | User[] | Bearer | 5min | 100/min |
| POST | /api/users | UsersCtl | S001 | CreateUserDto | User | Bearer+Admin | — | 10/min |

## Endpoint Details

### GET /api/users
- **Controller**: S001 (UsersController)
- **Service call**: S020.GetAllAsync()
- **Query params**: ?page=1&size=20&search=...&role=admin
- **Response codes**: 200 (list), 401 (no token), 403 (insufficient role)
- **Pipeline**: AuthMiddleware → ValidationFilter → Controller
- **Cache**: Redis, key=users:list:{hash}, TTL=5min

## Error Response Format
​```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "errors": { "Email": ["Email is required"] }
}
​```

## Authentication Flow
1. POST /api/auth/login → returns JWT + refresh token
2. Bearer token in Authorization header
3. Refresh via POST /api/auth/refresh
4. Logout via POST /api/auth/logout (blacklist token)
```

---

## 06_TYPE_SYSTEM.md

```markdown
# Type System

## Types & Interfaces
### {ID} — {Name}
​```typescript / csharp / python
{type definition}
​```
- **Used by**: {symbol IDs}
- **Validated by**: {validator ID or "none"}
- **API mapping**: {endpoint → type}

## Type Dependency Graph
{type} —[CONTAINS]→ {nested type}
{type} —[EXTENDS]→ {base type}
{generic} —[WRAPS]→ {inner type}

## Validation Rules
| Schema/Validator | ID | Validates | Key Rules |
|------------------|----|-----------|-----------|
```

---

## 07_MIDDLEWARE_PIPELINE.md (Backend)

```markdown
# Middleware & Pipeline

## HTTP Pipeline (request order)
1. ExceptionHandling (S011) — catches all, returns ProblemDetails
2. CORS (built-in) — configured origins
3. Authentication (S010) — JWT validation
4. Authorization — policy-based
5. RequestLogging (S012) — Serilog structured logging
6. Routing → Controller

## DI Container Registration
| Interface | Implementation | Lifetime | ID |
|-----------|---------------|----------|-----|
| IUserService | UserService | Scoped | S021→S020 |

## Filters / Interceptors
| Filter | ID | Scope | Purpose |
|--------|----|-------|---------|

## Pipeline Behaviors (MediatR / similar)
| Behavior | ID | Order | Purpose |
|----------|----|-------|---------|
```

---

## 08_BUSINESS_RULES.md

```markdown
# Business Rules & Invariants

## Access Control
| Rule ID | Rule | Source IDs | Enforced at |
|---------|------|------------|-------------|

## Validation Rules
| Rule ID | Field/Entity | Constraint | Source ID |
|---------|-------------|------------|-----------|

## Domain Invariants
| Invariant | Description | Enforced by |
|-----------|-------------|-------------|

## Conditional Logic (UI or business)
| Rule ID | Condition | Effect | Source ID |
|---------|-----------|--------|-----------|
```

---

## 09_INFRASTRUCTURE.md (Backend)

```markdown
# Infrastructure

## Configuration
| Key | Source | Type | Used by |
|-----|--------|------|---------|

## Secrets Management
- Method: {Vault / env vars / Azure Key Vault / AWS Secrets / ...}
- Secrets: {list without values}

## Messaging / Queues
| Queue/Topic | Type | Producer IDs | Consumer IDs | Message Type |
|-------------|------|-------------|-------------|--------------|

## Caching
| Cache Key Pattern | Store | TTL | Invalidated by |
|-------------------|-------|-----|----------------|

## Background Jobs
| Job | ID | Schedule | Purpose | Dependencies |
|-----|----|----------|---------|-------------|

## Health Checks
| Check | ID | Target | Timeout |
|-------|----|--------|---------|

## Logging & Monitoring
- Library: {Serilog / NLog / Winston / ...}
- Sink: {Loki / Seq / CloudWatch / ...}
- Structured: {yes/no}
- Correlation ID: {yes/no, header name}
```

---

## 09_HOOKS_AND_UTILS.md (Frontend) / 09_SERVICES_AND_UTILS.md (Backend)

```markdown
# {Hooks & Utilities / Services & Utilities}

## Custom {Hooks / Services}
| ID | Name | File | Params / Injects | Returns | Used by (count) |
|----|------|------|------------------|---------|-----------------|

### Detail: {ID} — {Name}
- **Internal state / dependencies**: ...
- **Side effects**: ...
- **Error handling**: ...
- **Memoization / caching**: ...

## Utility Functions
| ID | Name | File | Signature | Pure | Used by (count) |
|----|------|------|-----------|------|-----------------|
```

---

## 10_EXTERNAL_DEPS.md

```markdown
# External Dependencies

## Production
| Package | Version | Category | Used by IDs | Purpose |
|---------|---------|----------|-------------|---------|

## Dev
| Package | Purpose |
|---------|---------|

## Bundle / Deploy Impact (if applicable)
| Package | Size (approx) | Tree-shakeable | Notes |
|---------|---------------|:--------------:|-------|
```

---

## 11_CROSS_CUTTING.md

```markdown
# Cross-Cutting Concerns

## Error Handling
- Global: {strategy}
- API/HTTP: {strategy}
- Validation: {strategy}
- Unhandled: {strategy}

## Authentication & Authorization
{step-by-step flow description}

## Logging & Observability
- Structured logging: {yes/no, library}
- Tracing: {OpenTelemetry / Jaeger / none}
- Metrics: {Prometheus / CloudWatch / none}
- Dashboards: {Grafana / Datadog / none}

## Multi-tenancy (if applicable)
- Strategy: {schema per tenant / row-level / database per tenant}
- Tenant resolution: {header / subdomain / claim}
- Data isolation: {filter / schema / connection string}

## Transactions
- Strategy: {Unit of Work / explicit / decorators}
- Boundaries: {per request / per handler / manual}

## Performance Patterns
| Pattern | Implementation | Location |
|---------|---------------|----------|
```

---

## 12_KNOWLEDGE_GRAPH_SUMMARY.md

```markdown
# Knowledge Graph Summary

## Statistics
| Metric | Count |
|--------|------:|
| Total Symbols | |
| {per type breakdown} | |
| Total Relations | |
| {per relation type} | |
| Circular Dependencies | |
| Business Rules | |
| API Endpoints | |

## Top 10 Most Connected Symbols
| Rank | Symbol | ID | In | Out | Total | Role |
|------|--------|----|-----|-----|-------|------|

## Architectural Observations
- {findings, patterns, potential issues}

## Index Health Metrics
| Metric | Value | Status |
|--------|-------|--------|
| Last full reindex | {date} | {✅/⚠️} |
| Last selective update | {date} | {✅/⚠️} |
| Source files in repo | {n} | — |
| Source files indexed | {n} | {✅/⚠️} |
| Coverage | {%} | {✅ >95% / ⚠️} |
| Symbols [REMOVED] | {n} | {✅ <5% / ⚠️} |
| Dangling references | {n} | {✅ 0 / ⚠️} |
| Circular dependencies | {n} | {✅ 0 / ⚠️} |

## Delta vs Previous Index (if applicable)
| Metric | Previous | Current | Delta |
|--------|----------|---------|-------|

## Full Graph (Mermaid)
​```mermaid
graph TD
    %% ...
​```
```
