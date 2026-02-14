# Symbol Taxonomy — Backend

## Symbol Type Codes

| Code | Type | Description | Examples |
|------|------|-------------|----------|
| CTL | Controller | API controller / request handler | `UsersController`, `@RestController` |
| EPT | Endpoint | Individual endpoint (method + path) | `GET /api/users`, `POST /auth/login` |
| SRV | Service | Business logic service | `UserService`, `OrderProcessor` |
| REP | Repository | Data access / repository pattern | `UserRepository`, `IOrderRepo` |
| ENT | Entity | ORM entity / domain model | `User`, `Order`, `Product` |
| DTO | DTO | Data transfer object / request-response | `CreateUserDto`, `LoginResponse` |
| TYP | Type | Type / interface / trait / protocol | `IUserService`, `OrderStatus` |
| ENM | Enum | Enum / union type | `UserRole`, `PaymentStatus` |
| MDW | Middleware | HTTP middleware / filter / interceptor | `AuthMiddleware`, `CorsFilter` |
| GRD | Guard | Authorization guard / policy | `AdminPolicy`, `[Authorize]` |
| VAL | Validator | Validation logic / FluentValidation / decorator | `CreateUserValidator` |
| MAP | Mapper | Object mapper / AutoMapper profile | `UserProfile`, `OrderMapper` |
| EVT | Event | Domain event / message / command | `UserCreatedEvent`, `OrderPlacedCmd` |
| HND | Handler | Event/command/query handler (CQRS) | `CreateUserHandler` |
| JOB | Job | Background job / scheduled task / worker | `EmailSenderJob`, `CleanupTask` |
| MIG | Migration | DB migration / schema change | `AddUserTable`, `V2__add_roles` |
| CFG | Config | Configuration class / options pattern | `DatabaseConfig`, `JwtOptions` |
| EXT | Extension | Extension method / helper / static util | `StringExtensions`, `DateUtils` |
| UTL | Utility | General utility / helper function | `HashHelper`, `FileUtils` |
| CNS | Constant | Constants / magic values / env vars | `ErrorCodes`, `DB_CONNECTION` |
| FAC | Factory | Factory / builder / creator | `UserFactory`, `OrderBuilder` |
| DEC | Decorator | Attribute / annotation / decorator | `[Authorize]`, `@Transactional` |
| EXC | Exception | Custom exception / error type | `NotFoundException`, `BusinessException` |
| PIP | Pipeline | Middleware pipeline / behavior (MediatR) | `ValidationBehavior`, `LoggingPipeline` |
| PRV | Provider | DI provider / registration / module | `ServiceModule`, `Startup.ConfigureServices` |
| TST | Test | Test class / test method | `UserServiceTests`, `OrderApiTests` |
| MSG | Messaging | Queue consumer/producer, pub-sub | `OrderConsumer`, `NotificationPublisher` |
| CCH | Cache | Cache service / strategy / policy | `UserCacheService`, `RedisCache` |
| LOG | Logger | Logging configuration / custom logger | `SerilogConfig`, `RequestLogger` |
| HLT | Health | Health check / readiness probe | `DbHealthCheck`, `/health` |
| SCH | Schema | DB schema / table definition (non-ORM) | `users_table`, `CREATE TABLE` |
| IDX | Index | DB index definition | `IX_Users_Email` |
| SEE | Seeder | Data seeder / fixture | `UserSeeder`, `TestDataFixture` |
| AGG | Aggregate | DDD Aggregate Root | `OrderAggregate`, `CartRoot` |
| VOM | Value Object | DDD Value Object | `Money`, `EmailAddress`, `DateRange` |
| SPE | Specification | Specification pattern / query object | `ActiveUsersSpec`, `OrderByDateSpec` |

## Relation Types

| Relation | Meaning | Example |
|----------|---------|---------|
| IMPORTS | Using / import / include | `UserService —[IMPORTS]→ UserRepository` |
| INHERITS | Class inheritance / extends | `AdminService —[INHERITS]→ BaseService` |
| IMPLEMENTS | Interface implementation | `UserService —[IMPLEMENTS]→ IUserService` |
| INJECTS | Constructor injection / DI | `UserController —[INJECTS]→ IUserService` |
| CALLS | Method invocation | `UserService —[CALLS]→ UserRepository.FindById` |
| RETURNS | Return type | `GetUser —[RETURNS]→ UserDto` |
| ACCEPTS | Parameter / request body type | `CreateUser —[ACCEPTS]→ CreateUserDto` |
| THROWS | Exception thrown | `UserService —[THROWS]→ NotFoundException` |
| MAPS_TO | DTO / entity mapping | `User —[MAPS_TO]→ UserDto` |
| QUERIES | DB read operation | `UserRepository —[QUERIES]→ users_table` |
| MUTATES | DB write operation | `UserRepository —[MUTATES]→ users_table` |
| MIGRATES | Schema migration | `AddRolesColumn —[MIGRATES]→ users_table` |
| PUBLISHES | Event/message publishing | `OrderService —[PUBLISHES]→ OrderPlacedEvent` |
| HANDLES | Event/command handling | `OrderHandler —[HANDLES]→ PlaceOrderCommand` |
| SUBSCRIBES | Event/queue subscription | `EmailConsumer —[SUBSCRIBES]→ UserCreatedEvent` |
| VALIDATES | Validation of a DTO/entity | `CreateUserValidator —[VALIDATES]→ CreateUserDto` |
| CACHES | Cache read/write | `UserService —[CACHES]→ users:* (Redis)` |
| GUARDS | Authorization enforcement | `AdminPolicy —[GUARDS]→ DELETE /api/users/:id` |
| PIPES_THROUGH | Middleware pipeline | `POST /api/users —[PIPES_THROUGH]→ AuthMiddleware` |
| CONFIGURES | Configuration binding | `DatabaseConfig —[CONFIGURES]→ DbContext` |
| REGISTERS | DI registration | `Startup —[REGISTERS]→ IUserService → UserService` |
| DEPENDS_ON | Generic dependency | `OrderService —[DEPENDS_ON]→ PaymentGateway` |
| EXPOSES | HTTP endpoint exposure | `UsersController —[EXPOSES]→ GET /api/users` |
| SEEDS | Data seeding | `UserSeeder —[SEEDS]→ users_table` |
| SCHEDULES | Cron/timer scheduling | `CleanupJob —[SCHEDULES]→ "0 2 * * *"` |
| LOGS | Logging target | `RequestLogger —[LOGS]→ Serilog/Loki` |
| HEALTH_CHECKS | Health probe | `DbHealthCheck —[HEALTH_CHECKS]→ PostgreSQL` |

## Classification Hierarchy

```
Symbol
├── API Layer
│   ├── CTL (Controller)
│   ├── EPT (Endpoint)
│   ├── MDW (Middleware / Filter)
│   ├── GRD (Guard / Policy)
│   └── PIP (Pipeline Behavior)
│
├── Business Layer
│   ├── SRV (Service)
│   ├── HND (Handler — CQRS)
│   ├── VAL (Validator)
│   ├── FAC (Factory / Builder)
│   └── AGG / VOM / SPE (DDD patterns)
│
├── Data Layer
│   ├── REP (Repository)
│   ├── ENT (Entity)
│   ├── SCH (Schema / Table)
│   ├── IDX (Index)
│   ├── MIG (Migration)
│   └── SEE (Seeder)
│
├── Type Layer
│   ├── TYP (Interface / Type)
│   ├── ENM (Enum)
│   ├── DTO (Data Transfer Object)
│   └── MAP (Mapper)
│
├── Messaging / Events
│   ├── EVT (Event / Command)
│   ├── MSG (Queue Consumer/Producer)
│   └── JOB (Background Job)
│
├── Infrastructure
│   ├── CFG (Configuration)
│   ├── PRV (DI Provider / Module)
│   ├── CCH (Cache)
│   ├── LOG (Logger)
│   ├── HLT (Health Check)
│   ├── EXC (Exception)
│   └── DEC (Decorator / Attribute)
│
└── Utilities & Tests
    ├── UTL (Utility)
    ├── EXT (Extension Method)
    ├── CNS (Constant)
    └── TST (Test)
```

## Stack-Specific Notes

### .NET / C#
- Controllers use `[ApiController]` attribute → type CTL
- Minimal APIs: `app.MapGet(...)` → type EPT directly (no CTL parent)
- MediatR handlers → type HND, commands/queries → type EVT
- FluentValidation → type VAL
- AutoMapper profiles → type MAP
- Entity Framework: DbContext → type PRV, entity configs → type CFG
- Options pattern: `IOptions<T>` → type CFG
- Middleware: `app.UseMiddleware<T>` → type MDW
- Background services: `IHostedService` → type JOB

### Python / Django / FastAPI
- Views/ViewSets → type CTL
- Serializers → type DTO + VAL combined
- Models → type ENT
- Managers → type REP
- Celery tasks → type JOB
- Signals → type EVT
- FastAPI dependencies → type MDW

### Java / Spring Boot
- `@RestController` → type CTL
- `@Service` → type SRV
- `@Repository` → type REP
- `@Entity` → type ENT
- `@Component` (generic) → classify by role
- `@EventListener` → type HND
- `@Scheduled` → type JOB
- `@Configuration` → type CFG

### Node.js / NestJS / Express
- Express router handlers → type CTL
- NestJS `@Controller()` → type CTL
- NestJS `@Injectable()` → classify by role (SRV, REP, GRD)
- Prisma models → type ENT
- Express middleware functions → type MDW
- Bull/BullMQ processors → type JOB

### Go
- HTTP handlers (`http.HandlerFunc`) → type CTL
- Middleware (`func(next http.Handler) http.Handler`) → type MDW
- Structs with methods → classify by role (SRV, REP, ENT)
- Interfaces → type TYP
- goroutine workers → type JOB
