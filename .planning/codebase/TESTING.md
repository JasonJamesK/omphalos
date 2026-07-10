# Testing Patterns

**Analysis Date:** 2026-07-10

## Test Framework

**Current state: no test infrastructure exists in this repository.**

- No `.test.` or `.spec.` files anywhere in `src/` (verified via repo-wide search).
- No `*.Tests` / `*.Test` C# projects — `Omphalos.slnx` lists only the four production projects (`Omphalos.Domain`, `Omphalos.Repository`, `Omphalos.Services`, `Omphalos.Web`).
- No test framework packages referenced in any `.csproj` (no xUnit, NUnit, or MSTest `PackageReference`).
- No JS test runner configured — `package.json` has no `vitest`, `jest`, `@testing-library/*`, or `test` script. `devDependencies` are limited to build tooling (`vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`).
- No `jest.config.*` / `vitest.config.*` file present.
- `.github/workflows/ci.yml` runs `dotnet build` and `npm run build` only — there is no test step in CI. See `.github/workflows/ci.yml:20-24` (dotnet restore/build) and `:37-41` (npm install/build).

**Run Commands (build/verify only — no test commands exist today):**
```bash
dotnet build                    # Compile the .NET solution
npm run build                   # Vite production build (also type-checks JSX via esbuild, no TS)
```

## Test File Organization

Not applicable — no test files exist. If tests are introduced, follow the layering already established:

- **Backend:** create a new test project per layer or a single `Omphalos.Tests` project referencing `Omphalos.Domain`, `Omphalos.Repository`, `Omphalos.Services`. Add it to `Omphalos.slnx` under a `/tests/` (or similar) folder, matching the existing `/src/` folder grouping.
- **Frontend:** no established co-location pattern exists yet. Vite + React projects of this shape typically co-locate `*.test.jsx` next to the component or centralize under `src/client/__tests__/` — either would be a new precedent for this codebase, not a documented convention.

## Test Structure

Not applicable — no examples exist in the codebase to reference.

## Mocking

Not applicable — no mocking library or pattern exists in the codebase.

**Relevant seams if tests are added:**
- Backend services take their dependencies via primary-constructor DI (e.g. `SessionService(ISessionRepository repo)`, `AuthService(IUserRepository users, IConfiguration config)`), which makes them straightforward to unit test against hand-rolled fakes or a mocking library (Moq/NSubstitute) without any refactor — see `src/Omphalos.Services/Implementations/SessionService.cs:7` and `src/Omphalos.Services/Implementations/AuthService.cs:12`.
- `OmphalosDbContextFactory` (`src/Omphalos.Repository/OmphalosDbContextFactory.cs`) already provides a design-time fallback connection string pattern that could inform an approach for spinning up a test database or in-memory EF Core provider for repository-level tests.
- Frontend: `src/client/db/index.js` is the sole network boundary (all `fetch` calls funnel through `request()`), which is the natural mock point for any future component/integration tests — mock `db` and `login`/`logout`/`getMe` exports rather than `fetch` directly.

## Fixtures and Factories

Not applicable — no test data builders exist. `src/client/data/mockData.js` exists but is **application seed/reference data** (e.g. loot tables, name generation lists, toolkit tables) used at runtime by the app itself, not test fixtures — do not confuse it with a test fixture file.

## Coverage

**Requirements:** None enforced. No coverage tooling configured for either stack.

## Test Types

**Unit Tests:** None exist.

**Integration Tests:** None exist. No `WebApplicationFactory`-based API tests, no Testcontainers/Postgres test setup.

**E2E Tests:** None exist. No Playwright/Cypress config or dependency.

## Manual Verification (current de facto process)

In the absence of automated tests, correctness is currently verified by:
- `dotnet build` / `npm run build` succeeding (compilation-level check only, enforced in CI via `.github/workflows/ci.yml`).
- Manual testing via `docker compose up -d --build` (full stack) or `npm run dev` (frontend against a running API) as described in `CLAUDE.md`.
- EF Core migrations are the closest thing to a repeatable verification step for schema changes — generated via `dotnet ef migrations add`, applied automatically at startup (`db.Database.MigrateAsync()` in `src/Omphalos.Web/Program.cs:77`).

## Recommendations When Adding Tests

If a phase introduces testing infrastructure for the first time, prefer:
- **Backend:** xUnit (idiomatic default for .NET 10 minimal APIs), `Microsoft.AspNetCore.Mvc.Testing`'s `WebApplicationFactory<Program>` for endpoint-level integration tests, and either EF Core's InMemory provider or a real Postgres via Testcontainers for repository tests (the latter is more faithful given heavy use of `jsonb` column conversions — see `src/Omphalos.Repository/Configurations/CharacterConfiguration.cs:14-26` — which InMemory does not validate).
- **Frontend:** Vitest (shares Vite config, zero extra build tooling) + `@testing-library/react` for component tests, mocking the `db` module from `src/client/db/index.js` rather than global `fetch`.
- Add a `test` step to `.github/workflows/ci.yml` alongside the existing `build-dotnet` and `build-frontend` jobs once a framework is chosen, so tests run on every push/PR rather than only locally.

---

*Testing analysis: 2026-07-10*
