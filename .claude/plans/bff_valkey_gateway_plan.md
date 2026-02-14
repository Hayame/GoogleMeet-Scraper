# Plan: BFF Pattern z Valkey dla GeoMarkup Gateway

**Data utworzenia:** 2026-01-06
**Status:** Do implementacji

## Cel

Przekształcenie Gateway z JWT-w-cookie na pełny **BFF (Backend-for-Frontend)** z:
- **Valkey** jako session store (open-source fork Redis)
- Tokeny przechowywane **tylko server-side** (frontend nigdy nie widzi JWT)
- Automatyczny **token refresh** w tle
- **HTTP-only session cookie** jako jedyna forma autentykacji dla frontend

---

## Architektura

### Obecna (JWT w Cookie):
```
Frontend → Cookie(JWT) → Gateway → walidacja JWKS → Backend
```

### Docelowa (BFF):
```
Frontend → Cookie(SessionId) → Gateway → Valkey(Session) → Token → Backend
                                   ↓
                              Auto Refresh (middleware)
                                   ↓
                              KeyCloak (gdy token wygasa)
```

---

## Pliki do utworzenia/modyfikacji

### Nowe pliki (9):

| Plik | Opis |
|------|------|
| `Models/UserSession.cs` | Model sesji użytkownika |
| `Services/ISessionService.cs` | Interface session service |
| `Services/SessionService.cs` | Zarządzanie sesją użytkownika w Valkey |
| `Services/ITokenService.cs` | Interface token service |
| `Services/TokenService.cs` | Komunikacja z Identity dla tokenów |
| `Middleware/SessionAuthMiddleware.cs` | Walidacja sesji + auto-refresh |
| `Endpoints/AuthEndpoints.cs` | Login, logout, refresh, me |
| `Extensions/ValkeyExtensions.cs` | Konfiguracja Valkey |
| `Constants/SessionConstants.cs` | Stałe dla sesji |

### Modyfikacje (4):

| Plik | Zmiana |
|------|--------|
| `GeoMarkup.Gateway.csproj` | Dodanie pakietów StackExchange.Redis, DataProtection |
| `Program.cs` | Nowy pipeline: Session → Auth → YARP |
| `appsettings.json` | Konfiguracja Valkey, sesji |
| `ServiceCollectionExtensions.cs` | Usunięcie JWT Bearer, dodanie session auth |

---

## Szczegóły implementacji

### 1. Pakiety NuGet

```xml
<PackageReference Include="StackExchange.Redis" Version="2.10.1" />
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="10.0.1" />
<PackageReference Include="Microsoft.AspNetCore.DataProtection.StackExchangeRedis" Version="10.0.1" />
```

### 2. Model sesji (UserSession.cs)

```csharp
public sealed record UserSession
{
    public required string SessionId { get; init; }
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
    public required string DisplayName { get; init; }
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public required DateTimeOffset AccessTokenExpiresAt { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset LastActivityAt { get; set; }
    public List<WorkspaceInfo>? Workspaces { get; init; }
}

public sealed record WorkspaceInfo(Guid Id, string Name, string Role);
```

### 3. Session Service (Valkey)

```csharp
public interface ISessionService
{
    Task<UserSession?> GetSessionAsync(string sessionId, CancellationToken ct = default);
    Task<string> CreateSessionAsync(UserSession session, CancellationToken ct = default);
    Task UpdateSessionAsync(UserSession session, CancellationToken ct = default);
    Task DeleteSessionAsync(string sessionId, CancellationToken ct = default);
    Task<bool> RefreshTokenIfNeededAsync(string sessionId, CancellationToken ct = default);
}
```

### 4. Auth Endpoints (prefix: `/auth/`)

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/auth/login` | POST | Login → KeyCloak → tworzy sesję w Valkey → zwraca session cookie |
| `/auth/logout` | POST | Usuwa sesję z Valkey → revoke token w KeyCloak → usuwa cookie |
| `/auth/me` | GET | Zwraca info o użytkowniku (bez tokenów) |
| `/auth/refresh` | POST | Wymusza odświeżenie tokenu |

**Uwaga:** Endpointy `/auth/*` w Gateway **zastępują** bezpośrednie wywołania do Identity `/api/v1/auth/*`

### 5. Middleware Pipeline

```csharp
app.UseCors();
app.UseSessionAuth();        // Nowy: walidacja sesji + auto-refresh
// app.UseAuthentication(); // Usunięte - nie potrzebne
// app.UseAuthorization();  // Usunięte - handled by session
app.UseUnauthorizedRedirect();
app.ConfigureHealthCheckEndpoints();
app.MapAuthEndpoints();      // Nowy: /auth/* endpoints
app.MapReverseProxy();       // Token injection via transform
```

### 6. YARP Token Injection

```csharp
// W konfiguracji YARP - dodanie tokenu do żądań backend
.AddTransforms(context =>
{
    context.AddRequestTransform(async transformContext =>
    {
        var session = transformContext.HttpContext.Items["UserSession"] as UserSession;
        if (session != null)
        {
            transformContext.ProxyRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", session.AccessToken);
        }
    });
});
```

### 7. Cookie Configuration

```csharp
new CookieOptions
{
    Name = "geomarkup_session",
    HttpOnly = true,                    // JS nie ma dostępu
    Secure = true,                      // Tylko HTTPS (w dev: false)
    SameSite = SameSiteMode.Lax,       // CSRF protection
    MaxAge = TimeSpan.FromDays(7),     // Czas życia sesji
    IsEssential = true
}
```

### 8. Valkey Configuration (appsettings.json)

```json
{
  "Valkey": {
    "ConnectionString": "localhost:6379",
    "InstanceName": "geomarkup:",
    "SessionTimeoutMinutes": 10080
  },
  "Session": {
    "CookieName": "geomarkup_session",
    "IdleTimeoutMinutes": 30,
    "AccessTokenRefreshBufferSeconds": 60
  }
}
```

---

## Flow: Login

```
1. Frontend: POST /auth/login { email, password }
2. Gateway: Wywołuje Identity /api/v1/auth/login (internal)
3. Identity: KeyCloak password grant → AccessToken + RefreshToken
4. Gateway:
   - Generuje SessionId (secure random)
   - Zapisuje UserSession do Valkey (encrypted)
   - Ustawia HTTP-only cookie z SessionId
5. Frontend: Otrzymuje Set-Cookie: geomarkup_session=xxx
6. Response: { userId, email, displayName, workspaces } (BEZ tokenów)
```

## Flow: Protected Request

```
1. Frontend: GET /api/v1/tasks (z cookie geomarkup_session)
2. Gateway SessionAuthMiddleware:
   - Odczytuje SessionId z cookie
   - Pobiera UserSession z Valkey
   - Sprawdza czy AccessToken wygasa w ciągu 60s
   - Jeśli tak → auto-refresh via Identity /api/v1/auth/refresh
   - Zapisuje session w HttpContext.Items
3. YARP Transform:
   - Odczytuje session z HttpContext.Items
   - Dodaje Authorization: Bearer {AccessToken}
4. Backend: Otrzymuje request z valid JWT
```

## Flow: Logout

```
1. Frontend: POST /auth/logout (z cookie)
2. Gateway:
   - Pobiera session z Valkey
   - Wywołuje Identity /api/v1/auth/logout (RefreshToken)
   - Usuwa session z Valkey
   - Usuwa cookie (Set-Cookie z MaxAge=0)
3. Frontend: Session cookie usunięty
```

---

## Bezpieczeństwo

| Aspekt | Implementacja |
|--------|---------------|
| Token w frontend | ❌ Nigdy nie wysyłany |
| Cookie HttpOnly | ✅ JS nie ma dostępu |
| Cookie Secure | ✅ Tylko HTTPS |
| SameSite | ✅ Lax (CSRF protection) |
| Encryption at rest | ✅ Data Protection API |
| Token revocation | ✅ Natychmiastowe (usunięcie sesji) |
| Session hijacking | ✅ Secure random SessionId |

---

## Routing: Gateway vs Identity

| Endpoint | Obsługiwany przez | Uwagi |
|----------|-------------------|-------|
| `/auth/login` | **Gateway** | Proxy do Identity + tworzenie sesji |
| `/auth/logout` | **Gateway** | Usuwanie sesji + proxy do Identity |
| `/auth/me` | **Gateway** | Z sesji Valkey (bez proxy) |
| `/auth/refresh` | **Gateway** | Auto-refresh sesji |
| `/api/v1/users/*` | Identity (via YARP) | Token injection |
| `/api/v1/workspaces/*` | Identity (via YARP) | Token injection |
| `/api/v1/tasks/*` | API (via YARP) | Token injection |

---

## Szacowany nakład

| Komponent | Pliki | LOC |
|-----------|-------|-----|
| Models | 1 | ~40 |
| Services (interfaces) | 2 | ~30 |
| Services (implementations) | 2 | ~250 |
| Middleware | 1 | ~100 |
| Endpoints | 1 | ~200 |
| Extensions | 1 | ~80 |
| Constants | 1 | ~30 |
| Modyfikacje | 4 | ~100 |
| **Suma** | **13** | **~830** |

---

## Docker Compose (Valkey)

```yaml
services:
  valkey:
    image: valkey/valkey:8.0
    ports:
      - "6379:6379"
    volumes:
      - valkey_data:/data
    command: valkey-server --save 60 1 --loglevel warning
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  valkey_data:
```

---

## Krytyczne pliki do modyfikacji

1. `backend/GeoMarkup.Gateway/GeoMarkup.Gateway.csproj` - pakiety
2. `backend/GeoMarkup.Gateway/Program.cs` - nowy pipeline
3. `backend/GeoMarkup.Gateway/Extensions/ServiceCollectionExtensions.cs` - Valkey + session
4. `backend/GeoMarkup.Gateway/appsettings.json` - konfiguracja
5. `backend/GeoMarkup.Gateway/appsettings.Development.json` - dev config

## Nowe pliki

6. `backend/GeoMarkup.Gateway/Constants/SessionConstants.cs`
7. `backend/GeoMarkup.Gateway/Models/UserSession.cs`
8. `backend/GeoMarkup.Gateway/Services/ISessionService.cs`
9. `backend/GeoMarkup.Gateway/Services/SessionService.cs`
10. `backend/GeoMarkup.Gateway/Services/ITokenService.cs`
11. `backend/GeoMarkup.Gateway/Services/TokenService.cs`
12. `backend/GeoMarkup.Gateway/Middleware/SessionAuthMiddleware.cs`
13. `backend/GeoMarkup.Gateway/Endpoints/AuthEndpoints.cs`
14. `backend/GeoMarkup.Gateway/Extensions/ValkeyExtensions.cs`

---

## Wznowienie implementacji

Ten plan można wykorzystać w nowej sesji. Wystarczy podać kontekst:

```
Implementuj BFF Pattern z Valkey zgodnie z planem w .claude/plans/bff_valkey_gateway_plan.md
```
