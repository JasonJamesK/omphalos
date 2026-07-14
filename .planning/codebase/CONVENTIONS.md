# Coding Conventions

**Analysis Date:** 2026-07-10

This codebase has two distinct convention sets: a **C# backend** (`Omphalos.Domain`, `Omphalos.Repository`, `Omphalos.Services`, `Omphalos.Web`) and a **React/JS frontend** (`src/client`). No linter or formatter is configured for either — conventions below are inferred from consistent patterns across existing files, and should be followed by hand.

## Naming Patterns

**C# Files:**
- One type per file, file name matches type name exactly: `SessionService.cs` contains `class SessionService`, `ISessionRepository.cs` contains `interface ISessionRepository`.
- DTOs grouped by resource into a single file: `src/Omphalos.Domain/DTOs/SessionDtos.cs` holds `SessionDto`, `SessionSummaryDto`, `SessionMetadataDto`, `UpsertSessionRequest` — plural `*Dtos.cs` suffix, not one-file-per-record.
- Endpoint groups: `src/Omphalos.Web/Endpoints/{Resource}Endpoints.cs`, e.g. `SessionEndpoints.cs`, `GlobalLocationEndpoints.cs`.
- EF configurations: `src/Omphalos.Repository/Configurations/{Entity}Configuration.cs`.

**C# Types:**
- Interfaces prefixed `I`: `ISessionService`, `IGlobalLocationRepository`.
- Services: `{Resource}Service` implementing `I{Resource}Service`, e.g. `AuthService : IAuthService`.
- Repositories: `{Resource}Repository` implementing `I{Resource}Repository`.
- DTOs are C# `record` types (immutable, positional): `public record SessionDto(string Id, string Title, ...)`.
- Entities are `class` with mutable `{ get; set; }` properties (EF Core requirement): `src/Omphalos.Domain/Entities/GameSession.cs`.
- Result enums for multi-outcome operations: `DeleteGlobalLocationResult { Deleted, NotFound, ReferencedBySessions }` (see `src/Omphalos.Domain/Interfaces/IGlobalLocationRepository.cs` and usage in `src/Omphalos.Repository/Repositories/GlobalLocationRepository.cs`).

**C# Members:**
- Methods: PascalCase, always `Async`-suffixed for async operations: `GetAllAsync`, `UpsertAsync`, `DeleteAsync`.
- Every repository/service async method takes `CancellationToken ct = default` as the last parameter and threads it through to EF Core calls (`ToListAsync(ct)`, `SaveChangesAsync(ct)`).
- Private static mapping helpers named `MapToDto` / `MapToEntity` at the bottom of service classes (see `src/Omphalos.Services/Implementations/SessionService.cs:42-177`).

**JS/JSX Files:**
- Components: PascalCase file matching default export: `DeleteConfirm.jsx` exports `export default function DeleteConfirm(...)`.
- Subdirectories group related components by feature: `components/character/`, `components/location/`, `components/session/`, `components/session/blocks/`, `components/tabs/`.
- Utilities and data modules: camelCase, no default export, named exports only: `src/client/utils/imageUpload.js`, `src/client/data/lootTables.js`.
- API layer: single file `src/client/db/index.js`.

**JS Variables & Functions:**
- camelCase throughout for variables, functions, object keys.
- Reducer action types: `SCREAMING_SNAKE_CASE` strings (`'ADD_SESSION'`, `'UPDATE_CHARACTER'`, `'SET_ACTIVE_TAB'`) — see `src/client/context/AppContext.jsx`.
- Event handlers: `handleX` for named function declarations (`handleSave`, `handlePortrait`), inline arrows for simple one-liners (`onClick={onCancel}`, `onChange={e => set('name', e.target.value)}`).
- Local generic setter helper pattern: `const set = (k, v) => setForm(p => ({ ...p, [k]: v }))` used in form-heavy modals (`src/client/components/character/CharacterModal.jsx:27`).
- Short local aliases for repeated Tailwind class strings: `const inp = '...'`, `const lbl = '...'` at the top of a component when the same input/label styling repeats many times (`CharacterModal.jsx:14-15`).

**Types (Frontend):**
- No TypeScript — plain JS/JSX (`.js` / `.jsx`) throughout. No PropTypes either; components document expected shape via destructured props only.

## Code Style

**Formatting:**
- No Prettier, ESLint, or `.editorconfig` present anywhere in the repo. Style consistency is manual/by convention only.
- No semicolons in JS/JSX files (ASI style) — confirmed across `db/index.js`, `AppContext.jsx`, all components.
- 2-space indentation in JS/JSX.
- 4-space indentation in C#.
- Single quotes for JS strings; template literals for interpolation (`` `${BASE}${path}` ``).

**Linting:**
- No linter configured. `npm run build` (Vite) and `dotnet build` are the only automated correctness checks — see `.github/workflows/ci.yml`.
- C# nullable reference types are enabled (`<Nullable>enable</Nullable>` in every `.csproj`) — treat nullability annotations as load-bearing, not decorative.

## Import Organization

**C#:**
1. `System.*` / BCL namespaces first (`System.Security.Claims`, `System.Text`).
2. Third-party/framework namespaces (`Microsoft.EntityFrameworkCore`, `Microsoft.AspNetCore.Authentication.JwtBearer`).
3. `Omphalos.*` namespaces last, ordered `Domain` → `Repository` → `Services` → own layer.
4. File-scoped namespace declarations (`namespace Omphalos.Services.Implementations;`) — never block-scoped `namespace X { }`.

**JS/JSX:**
1. React/framework imports first (`import { useState, useRef } from 'react'`).
2. Local components/modules by relative path, typically in the order they're used in the component tree.
3. Utility/data imports last (`import { readImageFile } from '../../utils/imageUpload'`).
- No path aliases configured in `vite.config.js` — all local imports use relative paths (`../../utils/imageUpload`).

## Error Handling

**Backend:**
- Services return `null` (nullable return types) for "not found" rather than throwing — e.g. `GetByIdAsync` returns `SessionDto?` (`src/Omphalos.Services/Implementations/SessionService.cs:15-19`).
- Endpoints translate `null` into `Results.NotFound()`: `return session is null ? Results.NotFound() : Results.Ok(session);` (`src/Omphalos.Web/Endpoints/SessionEndpoints.cs:19-24`).
- Multi-outcome operations (e.g. delete with conflict) use a dedicated result enum consumed via `switch` expression mapping each case to an HTTP status (`src/Omphalos.Web/Endpoints/GlobalLocationEndpoints.cs:39-46`):
  ```csharp
  return result switch
  {
      DeleteGlobalLocationResult.Deleted => Results.NoContent(),
      DeleteGlobalLocationResult.NotFound => Results.NotFound(),
      DeleteGlobalLocationResult.ReferencedBySessions => Results.Conflict(new { message = "..." }),
      _ => Results.StatusCode(500),
  };
  ```
- Only two explicit `throw` sites in the whole backend, both fail-fast startup guards in `src/Omphalos.Web/Program.cs`: missing `Jwt:Secret` config (`throw new InvalidOperationException(...)`). No custom exception types exist. No global exception middleware/filter is registered — unhandled exceptions fall through to the default ASP.NET Core behavior.
- Auth failures return `null` from `AuthService.LoginAsync`, translated to a 4xx by the endpoint (check `src/Omphalos.Web/Endpoints/AuthEndpoints.cs` for the exact status before adding new auth flows).

**Frontend:**
- All API calls funnel through the single `request()` helper in `src/client/db/index.js:3-16`, which throws a plain `Error` on non-2xx responses and dispatches a global `omphalos:unauthorized` event on 401.
- `AppContext.jsx` swallows persistence errors deliberately with empty catch blocks — `db.saveSession(session).catch(() => {})` (`AppContext.jsx:228`) — favoring "best effort, don't block the UI" over surfaced error states. Follow this pattern for new persistence calls unless the operation needs user-visible failure feedback.
- Initial data load failure falls back to an empty-state payload rather than showing an error screen (`AppContext.jsx:217-222`).
- User-facing validation errors (e.g. oversized image upload) are surfaced via local component state and rendered inline, not thrown: `src/client/utils/imageUpload.js` calls an `onError(message)` callback instead of throwing (`readImageFile(file, onLoad, onError)`).

## Comments

**When to Comment:**
- Sparse overall — most files have zero or one comment. Comments are reserved for explaining *why*, not *what*:
  - Non-obvious ordering/timing gotchas: `// Refs so dispatchWithPersist never closes over stale state` (`AppContext.jsx:181`).
  - EF Core owned-entity notes: `// Owned entity — stored in same table` (`src/Omphalos.Domain/Entities/GameSession.cs:16`).
  - Business-rule clarifications: `// For linked chars: shared fields read-only, session fields editable` (`CharacterModal.jsx:41`).
- No JSDoc/TSDoc, no XML doc comments (`///`) anywhere in the C# codebase.

## Function Design

**Backend:**
- Service and repository methods are small (typically 3-15 lines), one responsibility each, often expression-bodied for pure delegation: `public Task<bool> DeleteAsync(...) => repo.DeleteAsync(id, userId, ct);`.
- Primary constructors used throughout for DI (C# 12 feature): `public class SessionService(ISessionRepository repo) : ISessionService`. Do not add a traditional constructor + private readonly field when primary constructors work.
- Endpoint handlers are inline lambdas passed to `MapGet`/`MapPost`/etc. inside a static `Map{Resource}Endpoints` extension method — no controller classes anywhere in the codebase.

**Frontend:**
- Components are default-exported single functions; no `React.memo`, no class components anywhere.
- State updates favor small, targeted reducer actions over one large "update everything" action.
- Large form components (e.g. `CharacterModal.jsx`, 276 lines) keep all state local via `useState`, without extracting sub-hooks — form logic is not abstracted into custom hooks in this codebase.

## Module Design

**Backend:**
- Strict layering enforced by project references only (no analyzer): `Domain` has zero project references; `Repository` → `Domain`; `Services` → `Domain` (+ `Repository` for interfaces only pattern is not used — `Services` implements against `Domain` interfaces and is wired to `Repository` implementations purely via DI in `Program.cs`); `Web` → all three.
- All cross-layer contracts (repository interfaces, service interfaces) live in `Omphalos.Domain/Interfaces/` — never define an interface in the layer that implements it.
- DI registration is centralized in `src/Omphalos.Web/Program.cs`, grouped by kind (`// Repositories`, `// Services`) — always add new bindings to the matching group.

**Frontend:**
- No barrel files (`index.js` re-export aggregators) except the API layer itself (`db/index.js`).
- `AppContext.jsx` is the single source of truth for global state; components never call `db.*` directly for state that belongs in the reducer — they dispatch actions and let `dispatchWithPersist` handle persistence (see `src/client/context/AppContext.jsx:258-282`). New sub-resource mutations should follow the existing `ADD_X` / `UPDATE_X` / `DELETE_X` action-type triplet and register in the `dirtySessionRef` case list if they mutate session sub-resources.

---

*Convention analysis: 2026-07-10*
