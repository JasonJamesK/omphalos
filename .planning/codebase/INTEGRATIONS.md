# External Integrations

**Analysis Date:** 2026-07-10

## APIs & External Services

**AI / Generative:**
- Google Gemini (`gemini-1.5-flash` model) - used for AI-generated session summaries
  - SDK/Client: none — raw `fetch()` call directly from the browser to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, in `src/client/components/tabs/SessionLog.jsx` (`handleAISummary`, around line 65-98)
  - Auth: per-user API key, passed as a `?key=` query parameter on the request URL (not an env var — stored in the database per user)
  - **Note:** This call is made client-side (browser → Google), not proxied through the ASP.NET backend. The API key is stored in plaintext in the `UserSettings.GeminiApiKey` column and returned to the browser via `GET /api/settings` (`src/Omphalos.Web/Endpoints/SettingsEndpoints.cs`) — it is visible in browser network requests and to anyone with API access.

No other third-party APIs (payment, email, SMS, maps, etc.) are integrated.

## Data Storage

**Databases:**
- PostgreSQL 17 (`postgres:17-alpine` Docker image) - primary and only datastore
  - Connection: `ConnectionStrings__DefaultConnection` env var (production, set in `docker-compose.yml`) / `ConnectionStrings:DefaultConnection` in `src/Omphalos.Web/appsettings.json` (local dev default: `Host=localhost;Database=omphalos;Username=omphalos;Password=omphalos`)
  - Client/ORM: Entity Framework Core 10 via `Npgsql.EntityFrameworkCore.PostgreSQL`, `src/Omphalos.Repository/OmphalosDbContext.cs`
  - Schema managed by EF Core Migrations, auto-applied on startup (`db.Database.MigrateAsync()` in `src/Omphalos.Web/Program.cs`), files in `src/Omphalos.Repository/Migrations/`
  - Tables: `Users`, `UserSettings`, `GameSessions`, `Characters`, `Locations`, `Encounters`, `GlobalLocations`, `GlobalCharacters` (per `OmphalosDbContext.cs` `DbSet<>` declarations)

**File Storage:**
- None. Images (location photos, NPC/character portraits) are read client-side via `FileReader.readAsDataURL()` (`src/client/utils/imageUpload.js`, capped at 5 MB) and persisted as base64 text directly in Postgres columns (`GlobalLocation.ImageBase64`, `GlobalCharacter.PortraitBase64` — `src/Omphalos.Domain/Entities/GlobalLocation.cs`, `GlobalCharacter.cs`). No S3/blob storage or filesystem-based media storage exists.

**Caching:**
- None detected.

## Authentication & Identity

**Auth Provider:**
- Custom — no external identity provider (no OAuth/OIDC/SSO)
  - Implementation: username/password login, `BCrypt.Net-Next` for password hashing, JWT (HMAC-SHA256) issued on login and stored in an `httpOnly` cookie named `omphalos_token` (30-day expiry)
  - Login: `src/Omphalos.Services/Implementations/AuthService.cs` (`LoginAsync`, `GenerateToken`)
  - Token validation: `src/Omphalos.Web/Program.cs` (`AddJwtBearer`), reads the token from the `omphalos_token` cookie via `OnMessageReceived` event rather than an `Authorization` header
  - Roles: `Admin` / `Player` enum on `User` entity; `"AdminOnly"` authorization policy requires `Role == Admin` claim
  - First-run admin bootstrap: seeded from `Admin__Username` / `Admin__Password` env vars only when the `Users` table is empty (`AuthService.SeedAdminAsync`, called from `Program.cs` on startup)
  - Cookie is **not** marked `Secure` yet — commented in code as "enable once behind HTTPS" (`src/Omphalos.Web/Endpoints/AuthEndpoints.cs`, `TokenCookieOptions`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Application Insights/etc. detected).

**Logs:**
- Default ASP.NET Core console logging only, configured via `Logging:LogLevel` in `src/Omphalos.Web/appsettings.json` / `appsettings.Development.json` (Default: Information, Microsoft.AspNetCore: Warning). No structured logging framework (Serilog, NLog) or log aggregation.

## CI/CD & Deployment

**Hosting:**
- Self-hosted via Docker Compose (no managed PaaS). Prebuilt production images published to GitHub Container Registry: `ghcr.io/jasonjamesk/omphalos:latest`, consumed by `docker-compose.prod.yml`.

**CI Pipeline:**
- GitHub Actions - `.github/workflows/ci.yml`: on every push/PR to `main`, runs two parallel jobs — `dotnet restore && dotnet build` (`.NET 10.x` via `actions/setup-dotnet`) and `npm ci && npm run build` (Node 22 via `actions/setup-node`, with npm cache). **Build-only — no automated tests are run** (none exist in the repo).
- `.github/workflows/docker-publish.yml`: on GitHub Release publish or manual dispatch, builds the multi-stage `Dockerfile` via `docker/build-push-action@v6` and pushes to `ghcr.io/${{ github.repository }}` tagged `latest` and the release tag, using `docker/metadata-action` and GitHub Actions layer caching (`type=gha`). Auth via the auto-provided `GITHUB_TOKEN` (no external registry credentials needed).

## Environment Configuration

**Required env vars (backend, validated at startup — stack refuses to boot without them, via `:?` in `docker-compose.yml`):**
- `POSTGRES_PASSWORD`
- `JWT_SECRET` (min 32 chars)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

**Optional env vars:**
- `POSTGRES_USER` (default `omphalos`)
- `API_PORT` (default `8080`)
- `ALLOWED_ORIGIN` (CORS origin; only needed if the frontend is hosted separately from the API — when empty, CORS middleware is not registered at all, see `Program.cs`)

**Runtime-configured (stored in DB, not env vars):**
- Gemini API key — per-user, set via Settings modal (`src/client/components/SettingsModal.jsx`), persisted through `PUT /api/settings` to `UserSettings.GeminiApiKey`

**Secrets location:**
- Local dev: root `.env` file (gitignored, template at `.env.example`); dev-only fallback secrets also present in `src/Omphalos.Web/appsettings.json` (e.g. placeholder JWT secret `change-me-in-production-minimum-32-chars!!`) — acceptable only because production always overrides via env vars.
- Production: environment variables injected into the `api` container by `docker-compose.yml` / `docker-compose.prod.yml`, sourced from the same root `.env` file.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None (the Gemini call above is a direct client-initiated API request, not a server-side webhook).

---

*Integration audit: 2026-07-10*
