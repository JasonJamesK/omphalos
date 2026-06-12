# Omphalos — CLAUDE.md

DM campaign manager. React frontend + .NET 10 ASP.NET Core backend + PostgreSQL, all self-hosted via Docker Compose.

## Running locally

```bash
# First time only
copy .env.example .env   # fill in POSTGRES_PASSWORD, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD

# Build and start (rebuilds image on every run)
start.bat

# Or directly
docker compose up -d --build
```

App is at `http://localhost:8080` (or `API_PORT` from `.env`).

React dev server (frontend only, no auth):
```bash
npm install
npm run dev
```

## Architecture

```
src/
├── client/               React 18 frontend (Vite + Tailwind)
├── Omphalos.Domain/      Entities, DTOs, IRepository + IService interfaces — no external deps
├── Omphalos.Repository/  EF Core DbContext, Migrations, IRepository implementations (Npgsql)
├── Omphalos.Services/    IService implementations, business logic (BCrypt, JWT)
└── Omphalos.Web/         ASP.NET Core minimal API, DI wiring, serves React from wwwroot
```

**Dependency rule:** Domain ← Repository ← Services ← Web. Domain has no outward dependencies.

**API base:** `/api` — the React app calls relative paths; ASP.NET Core serves the React build from `wwwroot/` and falls back to `index.html` for SPA routing.

## Key files

| File | Purpose |
|---|---|
| `src/client/db/index.js` | All API calls from the frontend. Replace/extend here when adding endpoints. |
| `src/client/context/AppContext.jsx` | Global React state + all persistence side-effects. `dispatchWithPersist` wraps dispatch and triggers API saves. |
| `src/Omphalos.Web/Program.cs` | DI registration, JWT config, middleware order, startup migration + admin seed. |
| `src/Omphalos.Web/Endpoints/` | One file per resource group (auth, sessions, admin, settings). |
| `src/Omphalos.Repository/OmphalosDbContext.cs` | EF Core context — add new `DbSet<>` here when adding entities. |
| `src/Omphalos.Repository/Migrations/` | EF Core migrations. Never edit by hand; use `dotnet ef`. |
| `docker-compose.yml` | Postgres 17 + api service. Postgres data in named volume `postgres_data`. |
| `Dockerfile` | Multi-stage: Node builds React → .NET SDK builds API → aspnet runtime serves both. |
| `.env` | Runtime secrets (gitignored). See `.env.example` for all required keys. |

## Adding a new API endpoint

1. Add entity to `Omphalos.Domain/Entities/` and DTO to `Omphalos.Domain/DTOs/`
2. Add interface to `Omphalos.Domain/Interfaces/`
3. Add EF config to `Omphalos.Repository/Configurations/` and `DbSet<>` to `OmphalosDbContext`
4. Add repository implementation to `Omphalos.Repository/Repositories/`
5. Add service implementation to `Omphalos.Services/Implementations/`
6. Register both in `Program.cs` with `builder.Services.AddScoped<IFoo, Foo>()`
7. Add endpoint group to `Omphalos.Web/Endpoints/` and call `app.MapFooEndpoints()` in `Program.cs`
8. Add corresponding fetch call to `src/client/db/index.js`

## EF Core migrations

Run from the repo root. Postgres must not be required — the `OmphalosDbContextFactory` uses a fallback connection string for design-time.

```bash
dotnet ef migrations add <MigrationName> --project src/Omphalos.Repository --startup-project src/Omphalos.Repository
dotnet ef migrations remove             --project src/Omphalos.Repository --startup-project src/Omphalos.Repository
```

Migrations are applied automatically on startup via `db.Database.MigrateAsync()` in `Program.cs`.

## Auth

- JWT stored in an `httpOnly` cookie named `omphalos_token` (30-day expiry)
- `POST /api/auth/login` → sets cookie, returns `{ username, role }`
- `POST /api/auth/logout` → deletes cookie
- `GET /api/auth/me` → returns current user from cookie (used on page load to check session)
- Admin-only endpoints use the `"AdminOnly"` policy (requires `Role == Admin` claim)
- Admin user is seeded on first boot from `Admin__Username` / `Admin__Password` env vars — only runs when the database has zero users

## Frontend state

`AppContext.jsx` holds all app state via `useReducer`. The exposed `dispatch` is actually `dispatchWithPersist` — it calls the real dispatcher then fires API saves:

- `ADD_SESSION` / `UPDATE_SESSION` → `PUT /api/sessions/{id}`
- `DELETE_SESSION` → `DELETE /api/sessions/{id}`
- Sub-resource mutations (characters, locations, encounters) → mark the parent session dirty via `dirtySessionRef`; a `useEffect` flushes the save after React re-renders with the new state (avoids sending stale pre-mutation data)

## Styling conventions

Dark theme throughout. Core colours:

| Token | Hex | Usage |
|---|---|---|
| `bg1` | `#1a1a1a` | Page background |
| `bg2` | `#2d2d2d` | Panel / modal background |
| `bg3` | `#3d3d3d` | Buttons, borders, inputs |
| `amber` | `#d4a574` | Primary accent (headings, active states) |
| `text1` | `#f0f0f0` | Primary text |
| `text2` | `#999999` | Muted / secondary text |

Modals follow the `SettingsModal.jsx` pattern: fixed overlay (`bg-black/70`), `bg-[#2d2d2d]` card, amber heading, `×` close button top-right.

## Docker notes

- The named volume `postgres_data` persists across `docker compose down` — data is NOT lost on restart
- `docker compose down -v` will delete the volume and all data (destructive — confirm before running)
- The React build happens inside Docker (Stage 1 of the Dockerfile) — local `dist/` is not used
- No HTTPS in the container; terminate TLS at the reverse proxy

## Environment variables

See `.env.example`. All required vars are validated at startup with `:?` in `docker-compose.yml` — the stack will refuse to start if they are missing.

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | Yes | Postgres superuser password |
| `JWT_SECRET` | Yes | Min 32 chars, random string |
| `ADMIN_USERNAME` | Yes | First-run admin account username |
| `ADMIN_PASSWORD` | Yes | First-run admin account password |
| `POSTGRES_USER` | No | Defaults to `omphalos` |
| `API_PORT` | No | Host port, defaults to `8080` |
| `ALLOWED_ORIGIN` | No | CORS origin; leave empty when React is served by the same process |
