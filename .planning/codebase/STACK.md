# Technology Stack

**Analysis Date:** 2026-07-10

## Languages

**Primary:**
- C# (.NET 10, `net10.0` target) - Backend: `src/Omphalos.Domain/`, `src/Omphalos.Repository/`, `src/Omphalos.Services/`, `src/Omphalos.Web/`
- JavaScript (ES modules, JSX, no TypeScript) - Frontend: `src/client/`

**Secondary:**
- SQL (PostgreSQL dialect, generated via EF Core migrations) - `src/Omphalos.Repository/Migrations/`
- CSS via Tailwind utility classes (no standalone `.css` beyond Tailwind directives)

## Runtime

**Environment:**
- .NET 10 SDK / ASP.NET Core 10 runtime (backend) — see `src/Omphalos.Web/Omphalos.Web.csproj`, `Dockerfile` (uses `mcr.microsoft.com/dotnet/sdk:10.0` and `mcr.microsoft.com/dotnet/aspnet:10.0`)
- Node.js 22 (frontend build only, not present at container runtime) — `Dockerfile` stage 1 uses `node:22-alpine`

**Package Manager:**
- npm (frontend) - Lockfile present: `package-lock.json`
- NuGet (backend, via `dotnet restore`) - Lockfile: none committed (no `packages.lock.json`); versions pinned directly in each `.csproj`

## Frameworks

**Core:**
- React 18.3.1 - `package.json` — UI framework, function components + hooks, no router (single-page app driven by internal tab/view state)
- ASP.NET Core 10 Minimal API (`Microsoft.NET.Sdk.Web`) - `src/Omphalos.Web/Omphalos.Web.csproj` — no MVC controllers; endpoints defined as static extension methods in `src/Omphalos.Web/Endpoints/`
- Entity Framework Core 10.0.4 (`Microsoft.EntityFrameworkCore.Design`) + Npgsql.EntityFrameworkCore.PostgreSQL 10.0.2 - `src/Omphalos.Repository/Omphalos.Repository.csproj` — ORM/data access for PostgreSQL

**Testing:**
- None detected. No test project in `Omphalos.slnx`, no `*.test.*`/`*.spec.*` files, no test runner configured in `package.json` scripts or CI (`.github/workflows/ci.yml` only builds, does not run tests).

**Build/Dev:**
- Vite 6.0.7 - `vite.config.js` — frontend dev server (proxies `/api` → `http://localhost:8080`) and production bundler
- @vitejs/plugin-react 4.3.4 - React fast-refresh/JSX transform for Vite
- Tailwind CSS 3.4.17 + PostCSS 8.5.1 + Autoprefixer 10.4.20 - `tailwind.config.js`, `postcss.config.js` — utility-first styling, content scanned from `./index.html` and `./src/**/*.{js,jsx}`
- dotnet CLI (`dotnet restore` / `dotnet build` / `dotnet publish`) - backend build, invoked directly and inside `Dockerfile` stage 2

## Key Dependencies

**Critical:**
- `@tiptap/react` 2.11.5 + `@tiptap/starter-kit`, `@tiptap/pm`, and extensions (`extension-heading`, `extension-bullet-list`, `extension-ordered-list`, `extension-list-item`) - rich text editor used for session logs/notes, `src/client/components/`
- `fuse.js` 7.1.0 - fuzzy search (likely used for searching sessions/characters/locations), `src/client/`
- `jspdf` 2.5.2 - client-side PDF export (`src/client/utils/pdfExport.js`), used for "Export PDF" (Ctrl+E shortcut)
- `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.2 - PostgreSQL EF Core provider, `src/Omphalos.Repository/`
- `BCrypt.Net-Next` 4.2.0 - password hashing, `src/Omphalos.Services/Implementations/AuthService.cs`, `UserService.cs`
- `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.9 + `System.IdentityModel.Tokens.Jwt` 8.19.1 + `Microsoft.IdentityModel.Tokens` 8.19.1 - JWT issuing/validation, `src/Omphalos.Services/Implementations/AuthService.cs`, `src/Omphalos.Web/Program.cs`

**Infrastructure:**
- `Microsoft.AspNetCore.OpenApi` 10.0.9 - OpenAPI support, `src/Omphalos.Web/Omphalos.Web.csproj` (no visible Swagger UI wiring in `Program.cs`)
- `Microsoft.EntityFrameworkCore.Design` 10.0.4 - design-time EF tooling (migrations), `src/Omphalos.Repository/`

## Configuration

**Environment:**
- Backend config via ASP.NET Core configuration providers: `src/Omphalos.Web/appsettings.json` (defaults, dev-safe placeholder secrets) + `appsettings.Development.json` (logging only) + environment variables (production, set in `docker-compose.yml` using `__` double-underscore section-nesting convention, e.g. `Jwt__Secret`, `ConnectionStrings__DefaultConnection`)
- Root `.env` (gitignored, present locally) supplies `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and optional `POSTGRES_USER`, `API_PORT`, `ALLOWED_ORIGIN` — consumed by `docker-compose.yml` via `${VAR}` substitution. Template at `.env.example`.
- Frontend has no build-time env vars — all runtime config (e.g. Gemini API key) is stored per-user in the database and fetched via `/api/settings` (`src/client/db/index.js`)
- EF Core design-time (migration) connection string falls back to `Host=localhost;Database=omphalos;Username=omphalos;Password=omphalos` if `CONNECTION_STRING` env var is unset — `src/Omphalos.Repository/OmphalosDbContextFactory.cs`

**Build:**
- `vite.config.js` - frontend build/dev config
- `tailwind.config.js`, `postcss.config.js` - CSS pipeline
- `Omphalos.slnx` - .NET solution file (XML-based `.slnx` format, references 4 projects)
- `Dockerfile` - 3-stage multi-stage build (Node build → .NET build → ASP.NET runtime), single deployable image
- `docker-compose.yml` (local build via `build: .`) / `docker-compose.prod.yml` (pulls prebuilt `ghcr.io/jasonjamesk/omphalos:latest`)

## Platform Requirements

**Development:**
- Docker Desktop (primary local workflow, via `start.bat` or `docker compose up -d --build`)
- Node.js (for `npm install && npm run dev` frontend-only dev server, no auth in this mode)
- .NET 10 SDK (for direct `dotnet` CLI use / EF migrations, Postgres does not need to be running for migration authoring due to the design-time factory fallback)

**Production:**
- Docker Compose stack: `postgres:17-alpine` + custom API image (`api` service) — see `docker-compose.yml` / `docker-compose.prod.yml`
- Single exposed port (`API_PORT`, default `8080`) serving both API (`/api/*`) and the built React SPA (static files + `index.html` fallback) from one ASP.NET Core process
- No HTTPS termination in-container — expects a reverse proxy in front for TLS (noted in `CLAUDE.md` and `README.md`)
- Postgres data persisted in named Docker volume `postgres_data`

---

*Stack analysis: 2026-07-10*
