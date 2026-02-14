# Symbol Taxonomy — Frontend

## Symbol Type Codes

| Code | Type | Description | Examples |
|------|------|-------------|----------|
| CMP | Component | UI component (React, Vue, Angular, Svelte) | `<UserCard />`, `@Component({})` |
| PAG | Page | Route-level page component | `HomePage`, `DashboardPage` |
| LAY | Layout | Layout wrapper component | `MainLayout`, `AuthLayout` |
| HOK | Hook | Custom hook (React) / Composable (Vue) | `useAuth`, `useDebounce` |
| CTX | Context | Context / Provider / InjectionToken | `AuthContext`, `ThemeProvider` |
| SRV | Service | API client / data fetching service | `userService`, `apiClient` |
| STR | Store | State store / slice / atom | `userStore`, `cartSlice` |
| ACT | Action | Store action / mutation / reducer | `addToCart`, `SET_USER` |
| SEL | Selector | Store selector / computed / derived state | `selectActiveUsers` |
| TYP | Type | TypeScript type / interface | `User`, `ApiResponse<T>` |
| ENM | Enum | Enum or union literal type | `UserRole`, `Theme` |
| DTO | DTO | Data transfer object / API shape | `CreateUserRequest` |
| UTL | Utility | Pure utility function | `formatDate`, `cn()` |
| CNS | Constant | Constant / config value / env var | `API_URL`, `ROUTES` |
| HOC | HOC | Higher-Order Component | `withAuth`, `withErrorBoundary` |
| DIR | Directive | Angular directive / Vue directive | `*ngIf`, `v-tooltip` |
| PIP | Pipe | Angular pipe / Vue filter | `DatePipe`, `currencyFilter` |
| MDW | Middleware | Route middleware / interceptor | `authMiddleware` |
| GRD | Guard | Route guard / auth wrapper | `AuthGuard`, `AdminGuard` |
| RTE | Route | Route definition | `/dashboard`, `/users/:id` |
| EVT | Event | Custom event / signal / action | `EVT_NAV_CLICK`, `onSubmit` |
| VAL | Validator | Validation schema (Zod, Yup, Joi) | `userSchema`, `loginSchema` |
| ANM | Animation | Animation definition / transition | `fadeIn`, `slideUp` |
| STY | Style | Style module / theme token / design token | `colors.primary`, `spacing` |
| TST | Test | Test file / test suite | `UserCard.test.tsx` |
| PLG | Plugin | Framework plugin / extension | `i18nPlugin`, `routerPlugin` |
| WRK | Worker | Web Worker / Service Worker | `imageProcessor.worker.ts` |

## Relation Types

| Relation | Meaning | Example |
|----------|---------|---------|
| IMPORTS | Static ES/TS import | `App —[IMPORTS]→ Layout` |
| RENDERS | JSX child rendering | `App —[RENDERS]→ Header` |
| RENDERS_COND | Conditional rendering | `Layout —[RENDERS_COND: isDesktop]→ Sidebar` |
| RENDERS_LIST | List/map rendering | `UserList —[RENDERS_LIST]→ UserCard` |
| PROVIDES | Context/Provider wraps | `App —[PROVIDES]→ AuthContext` |
| CONSUMES | Context consumer / useContext | `Header —[CONSUMES]→ AuthContext` |
| CALLS | Function invocation | `LoginForm —[CALLS]→ authService.login` |
| SUBSCRIBES | Store subscription / useSelector | `UserMenu —[SUBSCRIBES]→ userStore` |
| DISPATCHES | Store action dispatch | `LoginForm —[DISPATCHES]→ SET_USER` |
| MUTATES | Server state mutation (React Query, SWR) | `EditForm —[MUTATES]→ ['users']` |
| QUERIES | Server state query | `UserList —[QUERIES]→ ['users']` |
| NAVIGATES | Route navigation (useNavigate, router.push) | `LoginForm —[NAVIGATES]→ /dashboard` |
| EMITS | Custom event emission | `NavItem —[EMITS]→ EVT_NAV_CLICK` |
| LISTENS | Event listener | `Navigation —[LISTENS]→ EVT_NAV_CLICK` |
| VALIDATES | Schema validation | `loginSchema —[VALIDATES]→ LoginRequest` |
| EXTENDS | Component / class inheritance | `AdminPage —[EXTENDS]→ BasePage` |
| WRAPS | HOC / wrapper pattern | `withAuth —[WRAPS]→ DashboardPage` |
| STYLES | Style application | `Button —[STYLES]→ button.module.css` |
| LAZY_LOADS | Dynamic import / React.lazy | `Router —[LAZY_LOADS]→ DashboardPage` |
| GUARDS | Route protection | `AuthGuard —[GUARDS]→ /dashboard` |

## Classification Hierarchy

```
Symbol
├── UI Layer
│   ├── PAG (Page)
│   ├── LAY (Layout)
│   ├── CMP (Component)
│   │   ├── Feature Component (business logic)
│   │   ├── UI Primitive (Button, Input, Modal)
│   │   └── Composite (composed from primitives)
│   ├── HOC (Higher-Order Component)
│   └── DIR / PIP (Angular-specific)
│
├── State Layer
│   ├── STR (Store / Slice)
│   ├── ACT (Action / Mutation)
│   ├── SEL (Selector / Computed)
│   ├── CTX (Context / Provider)
│   └── HOK (Hook / Composable)
│
├── Data Layer
│   ├── SRV (API Service)
│   ├── MDW (Middleware / Interceptor)
│   └── WRK (Worker)
│
├── Type Layer
│   ├── TYP (Interface / Type)
│   ├── ENM (Enum)
│   ├── DTO (Data Transfer Object)
│   └── VAL (Validation Schema)
│
├── Routing Layer
│   ├── RTE (Route)
│   └── GRD (Guard)
│
└── Infrastructure
    ├── UTL (Utility)
    ├── CNS (Constant / Config)
    ├── EVT (Event / Signal)
    ├── STY (Style / Theme)
    ├── ANM (Animation)
    ├── PLG (Plugin)
    └── TST (Test)
```
