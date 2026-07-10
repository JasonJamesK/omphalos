<!-- refreshed: 2026-07-10 -->
# Architecture

**Analysis Date:** 2026-07-10

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     React SPA (browser)                      │
│  `src/client/` — Vite build, served as static files          │
├──────────────────┬──────────────────┬───────────────────────┤
│   AppContext     │   Tab components │   db/index.js          │
│  (useReducer)    │   (Session/Loc/  │   (fetch wrapper,      │
│  `context/`      │   Char/Enc/Kit)  │   `credentials:include`)│
└────────┬─────────┴──────────────────┴──────────┬────────────┘
         │ dispatchWithPersist                    │ fetch('/api/...')
         ▼                                        ▼
┌─────────────────────────────────────────────────────────────┐
│              ASP.NET Core Minimal API (single process)       │
│                    `src/Omphalos.Web/`                       │
│  Endpoints/*.cs → JWT auth (httpOnly cookie) → IService      │
└────────────────────────────┬────────────────────────────────┘
                              │ constructor-injected interfaces
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Business Logic — `src/Omphalos.Services/`      │
│  Implementations/*.cs — maps Entity ⇄ DTO, enforces rules     │
│  (e.g. ownership checks, delete-conflict guards)              │
└────────────────────────────┬────────────────────────────────┘
                              │ IRepository interfaces
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Access — `src/Omphalos.Repository/`        │
│  EF Core `OmphalosDbContext`, Npgsql provider, Migrations/    │
└────────────────────────────┬────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 17 (Docker volume)              │
└─────────────────────────────────────────────────────────────┘
```

Everything (API + built React static files) runs in a single ASP.NET Core process/container — there is no separate frontend server in production. `docker-compose.yml` runs exactly two containers: `postgres` and `api`.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| React root / providers | Mounts `AppProvider` around `App` | `src/client/main.jsx` |
| `AppContext` | Global state (`useReducer`), auth check on mount, initial data load, auto-persist side effects | `src/client/context/AppContext.jsx` |
| `db/index.js` | Every fetch call to the API; central `request()` helper handles 401 → logout event | `src/client/db/index.js` |
| `App.jsx` | Top-level layout, tab routing, keyboard shortcuts, session-vs-library view switch | `src/client/App.jsx` |
| Tab components | One React component per session tab (Session Log, Locations, Characters, Encounters, Toolkit) | `src/client/components/tabs/` |
| `Library.jsx` / `LocationsLibrary.jsx` | Cross-session "global" character/location library UI | `src/client/components/Library.jsx`, `src/client/components/LocationsLibrary.jsx` |
| `Program.cs` | DI registration, JWT config, middleware pipeline, startup migration + admin seed, SPA fallback | `src/Omphalos.Web/Program.cs` |
| Endpoint groups | Route mapping, request→service delegation, HTTP status mapping, auth policy per group | `src/Omphalos.Web/Endpoints/*.cs` |
| Service implementations | Entity⇄DTO mapping, business rules (ownership, referential-integrity guards on delete) | `src/Omphalos.Services/Implementations/*.cs` |
| Repository implementations | EF Core queries against `OmphalosDbContext`, no business logic | `src/Omphalos.Repository/Repositories/*.cs` |
| `OmphalosDbContext` | EF Core `DbSet<>` registry, applies all `IEntityTypeConfiguration<>` from assembly | `src/Omphalos.Repository/OmphalosDbContext.cs` |
| Entity configurations | Per-entity EF Core mapping, including JSONB conversions for nested value objects | `src/Omphalos.Repository/Configurations/*.cs` |
| Domain entities / DTOs / interfaces | Plain C# models, request/response DTOs (records), repository & service contracts — zero external dependencies | `src/Omphalos.Domain/` |

## Pattern Overview

**Overall:** Layered (N-tier) monolith — Domain ← Repository ← Services ← Web, with a decoupled React SPA client consuming a JSON REST API. Backend follows a classic Repository + Service pattern (not CQRS, no MediatR).

**Key Characteristics:**
- Strict one-way dependency rule enforced by project references: `Omphalos.Domain` has no outward dependencies; each subsequent layer depends only on layers below it.
- Interfaces (`I*Repository`, `I*Service`) live in `Omphalos.Domain/Interfaces/`, implementations live in the concrete layer project — classic Dependency Inversion.
- One feature = one vertical slice repeated per resource: Entity → DTO → Interface → Repository → Service → Endpoint → frontend `db` call (documented step-by-step in `CLAUDE.md`).
- ASP.NET Core Minimal API (no MVC controllers) — endpoints are static classes with extension methods (`MapXEndpoints`) registered in `Program.cs`.
- Frontend has no router — a single `App.jsx` switches between a fixed set of tabs (`activeTab` index) and a `view` state (`'sessions' | 'library'`); no URL-based navigation.
- Two-tier data model: **session-scoped** entities (`Character`, `Location`, `Encounter` — owned by a `GameSession`) vs. **global/library** entities (`GlobalCharacter`, `GlobalLocation` — reusable across sessions, optionally linked via `GlobalCharacterId`/`GlobalLocationId`).

## Layers

**Omphalos.Domain:**
- Purpose: Entities, DTOs (C# records), repository/service interfaces. Pure data + contracts.
- Location: `src/Omphalos.Domain/`
- Contains: `Entities/*.cs`, `DTOs/*.cs`, `Interfaces/*.cs`
- Depends on: nothing (no NuGet packages beyond BCL)
- Used by: Repository, Services, Web

**Omphalos.Repository:**
- Purpose: EF Core data access — DbContext, entity configurations, migrations, repository implementations.
- Location: `src/Omphalos.Repository/`
- Contains: `OmphalosDbContext.cs`, `OmphalosDbContextFactory.cs` (design-time factory for `dotnet ef`), `Configurations/*.cs`, `Migrations/*.cs`, `Repositories/*.cs`
- Depends on: Domain, Npgsql/EF Core
- Used by: Services (via DI on `I*Repository`), Web (registers `OmphalosDbContext` + repos)

**Omphalos.Services:**
- Purpose: Business logic — maps Entities ⇄ DTOs, enforces auth/ownership rules, orchestrates repository calls, hashes passwords, issues JWTs.
- Location: `src/Omphalos.Services/Implementations/`
- Contains: `AuthService.cs`, `SessionService.cs`, `UserService.cs`, `GlobalLocationService.cs`, `GlobalCharacterService.cs`
- Depends on: Domain (interfaces/entities/DTOs), BCrypt.Net, `System.IdentityModel.Tokens.Jwt`
- Used by: Web (via DI on `I*Service`)

**Omphalos.Web:**
- Purpose: HTTP surface — minimal API endpoint groups, JWT bearer auth (cookie-sourced), DI composition root, static file hosting for the React build.
- Location: `src/Omphalos.Web/`
- Contains: `Program.cs`, `Endpoints/*.cs`, `appsettings.json`, `wwwroot/` (populated at Docker build time from the React `dist/`)
- Depends on: all lower layers
- Used by: nothing (entry point / composition root)

**src/client (React SPA):**
- Purpose: Browser UI. Talks to the API exclusively through `src/client/db/index.js`.
- Location: `src/client/`
- Contains: `components/`, `context/`, `data/` (static reference tables), `db/`, `utils/`
- Depends on: `/api/*` HTTP endpoints
- Used by: nothing (leaf/entry point on the client side)

## Data Flow

### Primary Request Path (loading the app)

1. Browser loads `index.html` → Vite-bundled `src/client/main.jsx` mounts `<AppProvider><App/></AppProvider>` (`src/client/main.jsx:7`)
2. `AppProvider` mount effect calls `getMe()` to check the `omphalos_token` httpOnly cookie via `GET /api/auth/me` (`src/client/context/AppContext.jsx:188-194`)
3. `AuthEndpoints` reads claims off `ClaimsPrincipal` (populated by JWT bearer middleware reading the cookie) and returns `{ id, username, role }` (`src/Omphalos.Web/Endpoints/AuthEndpoints.cs:37-43`, cookie read in `Program.cs:49-57`)
4. On success, a second effect fires `Promise.all([db.getAllSessions(), db.getSettings(), db.getAllGlobalLocations(), db.getAllGlobalCharacters()])` and dispatches `INIT` (`src/client/context/AppContext.jsx:197-225`)
5. `SessionEndpoints` `GET /api/sessions` → `ISessionService.GetAllAsync` → `ISessionRepository.GetAllByUserAsync` (scoped by JWT `userId`) → EF Core query with `.Include()` for children (`src/Omphalos.Repository/Repositories/SessionRepository.cs:9-16`)
6. Service layer maps `GameSession` entities to `SessionSummaryDto` (list endpoint) or full `SessionDto` (detail endpoint) — see `MapToDto` in `src/Omphalos.Services/Implementations/SessionService.cs:117-136`
7. React renders tabs (`SessionLog`, `Locations`, `Characters`, `Encounters`, `Toolkit`) driven by `state.activeTab` (`src/client/App.jsx:88-94`)

### Write / Auto-Persist Flow

1. Any UI action calls `dispatch({ type, payload, sessionId? })`, which is actually `dispatchWithPersist` from `AppContext` (`src/client/context/AppContext.jsx:258-282`)
2. `dispatchWithPersist` first applies the reducer synchronously (pure state update), then inspects `action.type` to decide what to persist
3. For session-level actions (`ADD_SESSION`/`UPDATE_SESSION`) it calls `db.saveSession()` immediately with the new payload
4. For **sub-resource** actions (characters/locations/encounters), it cannot save immediately because the reducer update hasn't been reflected in `state` yet inside the same tick — instead it sets `dirtySessionRef.current = action.sessionId`
5. A separate `useEffect` watching `state.sessions` fires after React re-renders, finds the now-updated session object, and calls `saveSession()` with the fresh post-mutation data (`src/client/context/AppContext.jsx:245-250`) — this avoids the "stale closure" bug of saving pre-mutation data
6. `db.saveSession()` → `PUT /api/sessions/{id}` → `SessionEndpoints` → `SessionService.UpsertAsync` → `SessionRepository.UpsertAsync`, which does a full replace of `Characters`/`Locations`/`Encounters` collections (delete-then-reinsert) rather than diffing (`src/Omphalos.Repository/Repositories/SessionRepository.cs:27-58`)

### Lazy Session Detail Loading

- `GET /api/sessions` returns summaries only (no characters/locations/encounters/prepData/log) for list performance
- When a session becomes active and its full data hasn't been fetched yet (`session.characters === undefined`), a `useEffect` fetches `GET /api/sessions/{id}` and merges it in via `MERGE_SESSION_DETAIL` (`src/client/context/AppContext.jsx:234-241`)

**State Management:**
- Single `useReducer` in `AppContext` holds all app state (sessions, globalLocations, globalCharacters, active session/tab, settings, auth). No Redux/Zustand/external state library.
- No client-side cache invalidation library (no React Query/SWR) — state is fetched once at load and mutated locally in lockstep with API calls.

## Key Abstractions

**Session-scoped vs. Global entities:**
- Purpose: `Character`/`Location`/`Encounter` belong to exactly one `GameSession` (FK `SessionId`); `GlobalCharacter`/`GlobalLocation` are reusable library records referenced optionally via `GlobalCharacterId`/`GlobalLocationId` on the session-scoped entity.
- Examples: `src/Omphalos.Domain/Entities/Character.cs`, `src/Omphalos.Domain/Entities/GlobalCharacter.cs`
- Pattern: session entity can be created "from library" (copies fields, keeps `GlobalCharacterId` link) or standalone. Deleting a global entity that's still referenced returns a conflict unless `force=true` and the caller is Admin (`src/Omphalos.Services/Implementations/GlobalLocationService.cs`, `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs:34-47`).

**Owned value objects stored as JSONB:**
- Purpose: Nested structures (`SessionMetadata`, `CharacterRelationship[]`, `NpcStatBlock`, `EncounterEnemy[]`) are persisted as JSONB columns rather than normalized tables.
- Examples: `src/Omphalos.Domain/Entities/GameSession.cs` (`Metadata` — EF owned type, same table), `src/Omphalos.Repository/Configurations/CharacterConfiguration.cs` (`Relationships`, `StatBlock` — manual `HasConversion` JSON serialization to `jsonb`)
- Pattern: Free-form editor content (`SessionLog`, `PrepData`) is stored as raw `JsonDocument` — the backend does not interpret its structure; the TipTap rich-text editor on the frontend owns the schema.

**DTO records (Entity ⇄ DTO mapping):**
- Purpose: API never returns EF entities directly; every entity has one or more matching DTO `record`s in `Omphalos.Domain/DTOs/`.
- Examples: `src/Omphalos.Domain/DTOs/SessionDtos.cs`, `src/Omphalos.Domain/DTOs/CharacterDtos.cs`
- Pattern: mapping happens explicitly in service classes via static `MapToDto`/`MapToEntity` methods (no AutoMapper).

**Endpoint group pattern:**
- Purpose: Each resource gets one static class with a `MapXEndpoints(this IEndpointRouteBuilder app)` extension method, called once from `Program.cs`.
- Examples: `src/Omphalos.Web/Endpoints/SessionEndpoints.cs`, `src/Omphalos.Web/Endpoints/AuthEndpoints.cs`
- Pattern: `app.MapGroup("/api/x").RequireAuthorization()` sets the auth default for the group; individual routes opt out with `.AllowAnonymous()` (login/logout) or use the `"AdminOnly"` policy.

**`dispatchWithPersist` (frontend):**
- Purpose: Single funnel through which every state mutation both updates local React state and triggers the matching API call, so components never call `db.*` directly for session data (only auth/library actions bypass it in a few places, e.g. `Sidebar.jsx`).
- Examples: `src/client/context/AppContext.jsx:258-282`
- Pattern: reducer is pure/synchronous; persistence is a side effect keyed off `action.type`, deliberately decoupled from the reducer function itself.

## Entry Points

**Backend process entry:**
- Location: `src/Omphalos.Web/Program.cs`
- Triggers: `dotnet Omphalos.Web.dll` (container `ENTRYPOINT` in `Dockerfile:32`)
- Responsibilities: builds DI container, configures JWT auth reading from cookie, runs EF Core migrations + admin seed on boot, maps all endpoint groups, serves `wwwroot/` with SPA fallback to `index.html`

**Frontend entry:**
- Location: `src/client/main.jsx`
- Triggers: loaded by `index.html` via Vite; in dev, `npm run dev` serves it directly with `/api` proxied to `http://localhost:8080` (`vite.config.js`); in production it's pre-built into `wwwroot/` by the Dockerfile's frontend-build stage
- Responsibilities: mounts React tree, wraps app in `AppProvider`

**EF Core design-time entry:**
- Location: `src/Omphalos.Repository/OmphalosDbContextFactory.cs`
- Triggers: `dotnet ef migrations add/remove` (CLI tooling), which needs to construct `OmphalosDbContext` without a running Postgres instance
- Responsibilities: supplies a fallback connection string so migration authoring doesn't require a live database

## Architectural Constraints

- **Threading:** Standard ASP.NET Core Kestrel request-per-task model; all repository/service methods are `async`/`await` with `CancellationToken` propagated end-to-end. No background workers, hosted services, or queues.
- **Global state:** None on the backend (all services/repositories are `Scoped` DI lifetimes, no static mutable state). On the frontend, `AppContext`'s `useReducer` state is the single global store; two `useRef`s (`loadedRef`, `dirtySessionRef`) exist specifically to avoid stale-closure bugs in effects (`src/client/context/AppContext.jsx:182-183`).
- **Circular imports:** None — enforced by the strict Domain ← Repository ← Services ← Web project-reference chain; the build itself would fail on a cycle.
- **No caching layer:** No Redis/in-memory cache; every read hits Postgres directly through EF Core.
- **Single-tenant-per-row multi-tenancy:** Every session query is filtered by `UserId` from the JWT claim (`GetUserId(ClaimsPrincipal)` helper repeated in each endpoint file) — there is no cross-user session access, but `GlobalLocation`/`GlobalCharacter` (the "library") is **not** user-scoped — it's shared across all users of the instance.
- **No API versioning:** Routes are flat under `/api/*` with no version segment.

## Anti-Patterns

### Full collection replace on session upsert

**What happens:** `SessionRepository.UpsertAsync` removes *all* existing `Character`/`Location`/`Encounter` rows for a session and re-inserts the full incoming set on every save (`src/Omphalos.Repository/Repositories/SessionRepository.cs:47-53`), rather than diffing added/changed/removed items.
**Why it's wrong:** Every session edit re-issues delete+insert for unrelated sub-resources, generates unnecessary DB churn, and risks losing rows if the client sends a partial payload (mitigated today by the frontend always sending the full session object, but it's a latent footgun for any new consumer of `PUT /api/sessions/{id}`).
**Do this instead:** When adding new sub-resource mutation flows, keep sending the complete parent session payload (matching current frontend behavior in `src/client/db/index.js:59-64`) until the repository is changed to diff collections.

### Repeated `GetUserId(ClaimsPrincipal)` per endpoint file

**What happens:** Each endpoint group (`SessionEndpoints.cs`, others) redefines its own private `GetUserId` static helper reading `ClaimTypes.NameIdentifier`.
**Why it's wrong:** Duplication risk — a future change to the claim type or parsing logic must be applied in every endpoint file.
**Do this instead:** New endpoint groups needing the user id should follow the existing per-file `private static Guid GetUserId(ClaimsPrincipal user)` pattern for consistency (do not introduce a different auth-extraction mechanism) — see `src/Omphalos.Web/Endpoints/SessionEndpoints.cs:51-52`.

## Error Handling

**Strategy:** No global exception-handling middleware / `UseExceptionHandler` is registered in `Program.cs` — unhandled exceptions fall through to the ASP.NET Core default developer/production error response. Errors are primarily surfaced as explicit HTTP status codes returned per-endpoint (`Results.NotFound()`, `Results.Conflict()`, `Results.BadRequest()`, `Results.Unauthorized()`).

**Patterns:**
- Service methods return `null` (not exceptions) for "not found" — endpoints translate `null` into `Results.NotFound()` (e.g. `SessionEndpoints.cs:19-24`).
- Delete operations that would break referential integrity return a result enum (`DeleteGlobalCharacterResult` / `DeleteGlobalLocationResult`) mapped to HTTP status in the endpoint (`Results.Conflict()` for `ReferencedBySessions`) — see `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs:38-47`.
- Frontend `db/index.js` `request()` throws a generic `Error` for any non-2xx/204 response and specially dispatches a global `omphalos:unauthorized` window event on 401 so `AppContext` can force logout (`src/client/db/index.js:9-12`).
- Frontend fetch calls into `dispatchWithPersist`/`saveSession` are fire-and-forget with `.catch(() => {})` — save failures are silently swallowed, not surfaced to the user (`src/client/context/AppContext.jsx:227-229`).

## Cross-Cutting Concerns

**Logging:** No structured logging framework configured beyond ASP.NET Core's default console logger; no `ILogger<T>` injection observed in services/endpoints.
**Validation:** No FluentValidation/DataAnnotations pipeline; validation is ad hoc (e.g. `if (req.Id != id) return Results.BadRequest(...)` in `SessionEndpoints.cs:28`). DTOs use non-nullable C# record properties for basic shape enforcement at the JSON deserialization boundary.
**Authentication:** JWT bearer token, always sourced from the `omphalos_token` httpOnly cookie (never from an `Authorization` header) via a custom `OnMessageReceived` event (`Program.cs:49-57`). Role-based authorization via `RequireAuthorization()` (any authenticated user) or the `"AdminOnly"` policy (`Program.cs:60-61`).

---

*Architecture analysis: 2026-07-10*
