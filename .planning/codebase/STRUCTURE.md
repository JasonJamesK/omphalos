# Codebase Structure

**Analysis Date:** 2026-07-10

## Directory Layout

```
omphalos/
├── src/
│   ├── client/                       # React 18 frontend (Vite + Tailwind)
│   │   ├── components/               # UI components, flat + feature subfolders
│   │   │   ├── character/            # Character modal, portrait, stat-block editors
│   │   │   ├── location/             # Location "add from library" modal
│   │   │   ├── session/              # Session-log-specific widgets (NPC quick bar, phase cards)
│   │   │   │   └── blocks/           # Session-prep rich content blocks (callout, loot, notes, table)
│   │   │   └── tabs/                 # One component per top-level session tab
│   │   ├── context/                  # AppContext.jsx — global state + persistence
│   │   ├── data/                     # Static reference data (loot tables, name generator, toolkit tables, mock data)
│   │   ├── db/                       # index.js — all fetch() calls to the API
│   │   ├── utils/                    # imageUpload.js, pdfExport.js
│   │   ├── App.jsx                   # Top-level layout, tab switching, keyboard shortcuts
│   │   ├── main.jsx                  # React root / entry point
│   │   └── index.css                 # Tailwind entry
│   ├── Omphalos.Domain/               # Entities, DTOs, interfaces — no external deps
│   │   ├── DTOs/                     # Request/response records, one file per resource
│   │   ├── Entities/                 # EF Core entity classes (POCOs)
│   │   └── Interfaces/               # IXRepository / IXService contracts
│   ├── Omphalos.Repository/           # EF Core data access (Npgsql)
│   │   ├── Configurations/           # IEntityTypeConfiguration<T> per entity
│   │   ├── Migrations/               # EF Core migrations (never hand-edited)
│   │   ├── Repositories/             # IXRepository implementations
│   │   ├── OmphalosDbContext.cs      # DbSet<> registry
│   │   └── OmphalosDbContextFactory.cs # Design-time factory for `dotnet ef`
│   ├── Omphalos.Services/             # Business logic
│   │   └── Implementations/          # IXService implementations
│   └── Omphalos.Web/                  # ASP.NET Core minimal API host
│       ├── Endpoints/                # One static class per resource group
│       ├── Properties/               # launchSettings.json
│       ├── Program.cs                # DI wiring, middleware, startup migration/seed
│       ├── appsettings.json          # Base config
│       └── appsettings.Development.json
├── public/                            # Static assets copied verbatim into the Vite build (logo, favicon-like images)
├── .github/workflows/                 # ci.yml (build check), docker-publish.yml
├── .planning/codebase/                 # Generated codebase-map docs (this file lives here)
├── docker-compose.yml                  # Local/dev stack: postgres + api
├── docker-compose.prod.yml             # Production overrides
├── Dockerfile                          # 3-stage build: Node → .NET SDK → aspnet runtime
├── Omphalos.slnx                       # .NET solution file (new slnx format)
├── start.bat                           # Windows helper: docker compose up -d --build
├── vite.config.js                      # Vite config, dev proxy for /api → localhost:8080
├── tailwind.config.js / postcss.config.js
├── package.json                        # Frontend dependencies + npm scripts
├── .env.example                        # Documents required env vars (no secrets)
└── CLAUDE.md                           # Project instructions for AI agents
```

## Directory Purposes

**`src/client/components/`:**
- Purpose: All React UI components.
- Contains: Top-level shared components (modals, sidebar, top bar, login, library) directly in this folder; feature-specific components nested one level deeper (`character/`, `location/`, `session/`, `tabs/`).
- Key files: `Sidebar.jsx`, `TopBar.jsx`, `Library.jsx` (global character library UI), `LocationsLibrary.jsx` (global location library UI), `SettingsModal.jsx`, `AdminModal.jsx`, `LoginPage.jsx`.

**`src/client/components/tabs/`:**
- Purpose: The five primary session views, switched via `activeTab` index in `App.jsx`.
- Contains: `SessionLog.jsx`, `Locations.jsx`, `Characters.jsx`, `Encounters.jsx`, `Toolkit.jsx`, plus `SessionPrep.jsx` (rendered inside SessionLog).
- Key files: `Toolkit.jsx` (912 lines — largest component; DM reference tables/generators), `Encounters.jsx`, `Characters.jsx`.

**`src/client/context/`:**
- Purpose: Single source of truth for app state.
- Contains: `AppContext.jsx` only — reducer, `AppProvider`, `useApp()` hook, all `useEffect` persistence wiring.

**`src/client/data/`:**
- Purpose: Static, non-fetched reference content bundled with the frontend (not stored in the database).
- Contains: `lootTables.js`, `nameGen.js`, `toolkitTables.js`, `mockData.js` (dev/demo fixtures, not used for tests since no test suite exists).

**`src/client/db/`:**
- Purpose: The only place `fetch()` is called against `/api/*` for CRUD data (auth calls also live here).
- Contains: `index.js` — exports `db` (session/settings/library CRUD), `login`/`logout`/`getMe`, `adminApi`.

**`src/client/utils/`:**
- Purpose: Pure helper functions not tied to a specific component.
- Contains: `imageUpload.js` (base64 encode/resize for portraits & location images), `pdfExport.js` (session log → PDF via jsPDF).

**`src/Omphalos.Domain/`:**
- Purpose: Shared vocabulary for the whole backend — entities, DTOs, interfaces. Referenced by every other backend project; itself references nothing.
- Contains: `Entities/*.cs` (EF POCOs), `DTOs/*.cs` (C# `record` request/response shapes, grouped per resource e.g. `SessionDtos.cs`, `CharacterDtos.cs`), `Interfaces/*.cs` (`IXRepository`, `IXService`).

**`src/Omphalos.Repository/`:**
- Purpose: All EF Core / Postgres concerns.
- Contains: `Configurations/*.cs` (fluent API mapping incl. JSONB conversions), `Migrations/*.cs` (generated, timestamped), `Repositories/*.cs` (thin EF Core query implementations), `OmphalosDbContext.cs`, `OmphalosDbContextFactory.cs`.

**`src/Omphalos.Services/Implementations/`:**
- Purpose: Business/mapping logic layer between HTTP and data access.
- Contains: `AuthService.cs` (BCrypt + JWT), `SessionService.cs` (largest — full Entity⇄DTO mapping for nested session graph), `UserService.cs`, `GlobalLocationService.cs`, `GlobalCharacterService.cs`.

**`src/Omphalos.Web/Endpoints/`:**
- Purpose: HTTP route definitions, one file per resource group.
- Contains: `AuthEndpoints.cs`, `SessionEndpoints.cs`, `AdminEndpoints.cs`, `SettingsEndpoints.cs`, `GlobalLocationEndpoints.cs`, `GlobalCharacterEndpoints.cs`.

**`public/`:**
- Purpose: Files copied as-is into the Vite build output (not processed by the bundler).
- Contains: `logo.png`, `omphalos.png`.

## Key File Locations

**Entry Points:**
- `src/client/main.jsx`: React root, mounts `AppProvider` + `App`.
- `src/Omphalos.Web/Program.cs`: Backend composition root — DI, auth, migrations, endpoint mapping, SPA fallback.
- `src/Omphalos.Repository/OmphalosDbContextFactory.cs`: Design-time `DbContext` factory for `dotnet ef` CLI.

**Configuration:**
- `vite.config.js`: Dev server + `/api` proxy to `http://localhost:8080`.
- `tailwind.config.js`, `postcss.config.js`: Tailwind build config.
- `src/Omphalos.Web/appsettings.json` / `appsettings.Development.json`: ASP.NET Core config (connection strings, JWT settings placeholders).
- `docker-compose.yml` / `docker-compose.prod.yml`: Container orchestration, required env vars enforced with `:?`.
- `.env.example`: Documents `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, etc. — actual `.env` is gitignored.

**Core Logic:**
- `src/client/context/AppContext.jsx`: All frontend state + persistence orchestration.
- `src/client/db/index.js`: All frontend↔backend API calls.
- `src/Omphalos.Services/Implementations/SessionService.cs`: Central Entity⇄DTO mapping for the full session aggregate (characters, locations, encounters, stat blocks).
- `src/Omphalos.Repository/Repositories/SessionRepository.cs`: Session upsert/delete logic including full-collection-replace on save.

**Testing:**
- None present. No test project, test runner config, or `*.test.*`/`*.spec.*` files exist anywhere in `src/`. `.github/workflows/ci.yml` only runs `dotnet build` and `npm run build` (compile checks, no test execution).

## Naming Conventions

**Files (backend, C#):**
- PascalCase matching the primary type inside: `SessionService.cs` contains `class SessionService`, `ISessionRepository.cs` contains `interface ISessionRepository`.
- DTO files are grouped per resource and named `<Resource>Dtos.cs` (plural, one file holds all related records) — e.g. `SessionDtos.cs`, `CharacterDtos.cs`.
- Endpoint files named `<Resource>Endpoints.cs`, exposing a single `public static class` with a `Map<Resource>Endpoints` extension method.
- EF Core configuration files named `<Entity>Configuration.cs`.
- Migrations auto-named by `dotnet ef migrations add`: `<yyyyMMddHHmmss>_<Name>.cs` (+ `.Designer.cs` companion).

**Files (frontend, JS/JSX):**
- Components: PascalCase `.jsx` matching the default export, e.g. `SessionLog.jsx` exports `export default function SessionLog()`.
- Non-component modules (data, utils, API layer): camelCase `.js`, e.g. `imageUpload.js`, `pdfExport.js`, `nameGen.js`.
- `db/index.js` is the sole exception to per-file-per-concern — it aggregates all API calls behind one module.

**Directories:**
- Backend: `Omphalos.<Layer>` per .NET project (`Omphalos.Domain`, `Omphalos.Repository`, `Omphalos.Services`, `Omphalos.Web`), each with internal subfolders matching content type (`Entities/`, `DTOs/`, `Interfaces/`, `Configurations/`, `Repositories/`, `Implementations/`, `Endpoints/`).
- Frontend: lowercase feature folders under `components/` (`character/`, `location/`, `session/`, `tabs/`) group components by the domain concept they render, not by file type.

**Identifiers:**
- C#: PascalCase for types/methods/public properties, camelCase for parameters/locals; interfaces prefixed `I` (`ISessionService`).
- JS/JSX: camelCase for variables/functions, PascalCase for component names and their files; reducer action types are `SCREAMING_SNAKE_CASE` strings (`'ADD_SESSION'`, `'UPDATE_CHARACTER'`).

## Where to Add New Code

**New API-backed feature (full vertical slice):**
Follow the 8-step recipe already documented in `CLAUDE.md`:
1. Entity → `src/Omphalos.Domain/Entities/`
2. DTOs → `src/Omphalos.Domain/DTOs/`
3. Interfaces → `src/Omphalos.Domain/Interfaces/`
4. EF configuration → `src/Omphalos.Repository/Configurations/`, plus `DbSet<>` in `src/Omphalos.Repository/OmphalosDbContext.cs`
5. Repository implementation → `src/Omphalos.Repository/Repositories/`
6. Service implementation → `src/Omphalos.Services/Implementations/`
7. Register both in `src/Omphalos.Web/Program.cs` (`AddScoped<IFoo, Foo>()`)
8. Endpoint group → `src/Omphalos.Web/Endpoints/`, call `app.MapFooEndpoints()` in `Program.cs`
9. Frontend fetch call → `src/client/db/index.js`

**New EF Core migration:**
Run from repo root — never hand-edit files in `src/Omphalos.Repository/Migrations/`:
```bash
dotnet ef migrations add <Name> --project src/Omphalos.Repository --startup-project src/Omphalos.Repository
```

**New session tab / top-level view:**
- Component: `src/client/components/tabs/<Name>.jsx`
- Register in `TABS` array and `tabContents` array in `src/client/App.jsx`

**New global/library resource (mirrors GlobalLocation/GlobalCharacter pattern):**
- Entity in `src/Omphalos.Domain/Entities/`, service with `Create/Update/GetAll/GetById/Delete(force)` shape, delete-conflict result enum, endpoint group requiring `Admin` role only for `force=true` deletes — mirror `src/Omphalos.Services/Implementations/GlobalLocationService.cs` and `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs`.

**New reusable frontend component:**
- Feature-specific (belongs to one tab/domain concept): nested folder under `src/client/components/<feature>/`.
- Shared/generic (modals, buttons used across features): directly under `src/client/components/`.

**Shared frontend helpers:**
- Pure functions: `src/client/utils/`.
- Static/reference data (not persisted): `src/client/data/`.

**New global reducer action:**
- Add a `case` to `reducer()` in `src/client/context/AppContext.jsx`; if it mutates a session sub-resource, also add its type to the `dirtySessionRef` switch inside `dispatchWithPersist` so the save is triggered automatically.

## Special Directories

**`src/*/bin/`, `src/*/obj/`:**
- Purpose: .NET build output and intermediate artifacts.
- Generated: Yes (by `dotnet build`/`dotnet restore`).
- Committed: No (gitignored).

**`dist/`:**
- Purpose: Vite production build output.
- Generated: Yes (by `npm run build`).
- Committed: No — not used by Docker either; the Dockerfile rebuilds the frontend in its own stage rather than consuming a local `dist/`.

**`node_modules/`:**
- Purpose: npm dependencies.
- Generated: Yes.
- Committed: No.

**`src/Omphalos.Repository/Migrations/`:**
- Purpose: EF Core migration history (schema-as-code + generated model snapshot).
- Generated: Yes (via `dotnet ef migrations add`), but the generated `.cs` files are committed as the source of truth for schema evolution.
- Committed: Yes.

**`.planning/`:**
- Purpose: GSD workflow artifacts, including this codebase map (`.planning/codebase/`).
- Generated: Yes, by GSD tooling.
- Committed: Repository-dependent (not part of application runtime).

---

*Structure analysis: 2026-07-10*
