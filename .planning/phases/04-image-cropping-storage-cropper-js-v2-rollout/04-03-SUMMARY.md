---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
plan: 03
subsystem: api
tags: [aspnetcore, minimal-api, webapplicationfactory, jwt, etag, http-caching, ef-core]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dual OriginalImageData/CroppedImageData bytea columns, HasImage write-intent flag, ImageWriteContract 4-rule apply logic on all 4 image-bearing entities
provides:
  - IImageService/ImageService + ownership-scoped repository fetch methods (SessionRepository.GetCharacterImageAsync/GetLocationImageAsync, GlobalCharacterRepository/GlobalLocationRepository.GetImageAsync) resolving Cropped ?? Original via a single-column projection
  - ImageValidation static class (MaxImageBytes, IsRecognizedImage, DetectImageMimeType, IsInvalidUpload) shared by every image write/read path
  - 4 cached binary GET routes (2 new endpoint files + 2 Global* extensions) serving original/cropped bytes with ETag + Cache-Control, IDOR-safe for session-scoped entities
  - Server-side upload validation (400 on non-image/oversized bytes) on Global* create/update and session-upsert PUT/import
  - WebApplicationFactory<Program> test harness (new pattern for this repo) + ImageEndpointTests proving ownership, caching, and validation behavior against real Postgres
affects: [04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added:
    - Microsoft.AspNetCore.Mvc.Testing 10.0.9 (test-only, WebApplicationFactory)
  patterns:
    - "WebApplicationFactory<Program> pointed at the shared PostgresFixture Testcontainers instance via IWebHostBuilder.UseSetting (not ConfigureAppConfiguration) — required because Program.cs reads Jwt:Secret eagerly into a local variable before ConfigureAppConfiguration overrides are visible"
    - "Cached binary endpoint: TypedResults.File(bytes, sniffedMime, entityTag: SHA256-derived ETag) for automatic 304-on-If-None-Match, plus a manually-set Cache-Control header (private for session-scoped Character/Location, public for Global*)"
    - "Magic-byte sniff (ImageValidation) used symmetrically: read path picks Content-Type from real bytes; write path rejects bytes that don't match a recognized image signature or exceed MaxImageBytes"

key-files:
  created:
    - src/Omphalos.IntegrationTests/WebAppFactory.cs
    - src/Omphalos.IntegrationTests/ImageEndpointTests.cs
    - src/Omphalos.Domain/Interfaces/IImageService.cs
    - src/Omphalos.Services/Implementations/ImageService.cs
    - src/Omphalos.Services/Implementations/ImageValidation.cs
    - src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs
    - src/Omphalos.Web/Endpoints/LocationImageEndpoints.cs
  modified:
    - src/Omphalos.Domain/Interfaces/ISessionRepository.cs
    - src/Omphalos.Domain/Interfaces/IGlobalCharacterRepository.cs
    - src/Omphalos.Domain/Interfaces/IGlobalLocationRepository.cs
    - src/Omphalos.Repository/Repositories/SessionRepository.cs
    - src/Omphalos.Repository/Repositories/GlobalCharacterRepository.cs
    - src/Omphalos.Repository/Repositories/GlobalLocationRepository.cs
    - src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs
    - src/Omphalos.Web/Endpoints/GlobalLocationEndpoints.cs
    - src/Omphalos.Web/Endpoints/SessionEndpoints.cs
    - src/Omphalos.Web/Program.cs
    - src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj

key-decisions:
  - "WebAppFactory overrides host configuration via builder.UseSetting(...) rather than ConfigureAppConfiguration/AddInMemoryCollection — the latter lands too late relative to Program.cs's eager `var jwtSecret = builder.Configuration[\"Jwt:Secret\"]` read, causing every test-signed JWT to fail signature validation with IDX10517 even though the final DI-resolved IConfiguration showed the correct overridden value"
  - "ImageValidation.IsInvalidUpload centralizes the size+magic-byte guard so GlobalCharacterEndpoints, GlobalLocationEndpoints, and SessionEndpoints (PUT + /import) share one validation rule instead of three hand-duplicated checks"

patterns-established:
  - "Cached binary endpoint response shape (TypedResults.File + SHA256 ETag + private/public Cache-Control) — reusable verbatim for any future binary-serving endpoint in this codebase"

requirements-completed: [IMG-04, IMG-05, IMG-07]

coverage:
  - id: D1
    description: "GET binary endpoints serve original/cropped bytes for all 4 entity kinds (Character, Location, GlobalCharacter, GlobalLocation) with a sniffed Content-Type"
    requirement: "IMG-04"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageEndpointTests.cs#GetSessionCharacterCropped_AsOwningUser_Returns200WithPrivateCacheAndEtag"
        status: pass
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageEndpointTests.cs#GetGlobalCharacterCropped_ReturnsPublicCacheControl"
        status: pass
    human_judgment: false
  - id: D2
    description: "Session-scoped Character/Location image endpoints enforce session ownership in the repository query (IDOR-safe), not an id-only lookup"
    requirement: "IMG-04"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageEndpointTests.cs#GetSessionCharacterCropped_AsDifferentUser_Returns404"
        status: pass
    human_judgment: false
  - id: D3
    description: "Image endpoints return 304 on a matching If-None-Match ETag; Cache-Control is private for session-scoped images, public for Global*"
    requirement: "IMG-07"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageEndpointTests.cs#GetSessionCharacterCropped_MatchingIfNoneMatch_Returns304"
        status: pass
    human_judgment: false
  - id: D4
    description: "Write paths reject non-image or oversized image bytes server-side (magic-byte + max length), persisting nothing"
    requirement: "IMG-05"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageEndpointTests.cs#CreateGlobalCharacter_WithInvalidImageBytes_Returns400AndDoesNotPersist"
        status: pass
    human_judgment: false
  - id: D5
    description: "HasImage / image fetch queries never load byte columns unnecessarily — reads project straight to the Cropped ?? Original byte column via .Select(...), not .Include(...)"
    requirement: "IMG-05"
    verification:
      - kind: unit
        ref: "dotnet build Omphalos.slnx (compile-time proof: SessionRepository/GlobalCharacterRepository/GlobalLocationRepository image methods use .Select(...) projections)"
        status: pass
    human_judgment: false
  - id: D6
    description: "WebApplicationFactory<Program> test harness exists (new pattern for this repo) — points at the shared PostgresFixture container, seeds users, mints omphalos_token JWT cookies"
    requirement: "IMG-04"
    verification:
      - kind: integration
        ref: "dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~ImageEndpoint (6/6 pass, plus full suite 19/19 pass)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 03: Binary Image Endpoints + Upload Validation + WebApplicationFactory Harness Summary

**Cached, ETag-conditional binary GET endpoints for all 4 image-bearing entities (session-ownership-scoped for Character/Location, public for Global*), server-side magic-byte/size upload validation, and this repo's first WebApplicationFactory-based endpoint test harness**

## Performance

- **Duration:** 55 min
- **Started:** 2026-07-13T13:40:23Z (phase start; this plan began after 04-01/04-02 completed)
- **Completed:** 2026-07-13T14:26:56Z
- **Tasks:** 3
- **Files modified:** 18 (7 created, 11 modified)

## Accomplishments
- Stood up `WebApplicationFactory<Program>` — a wholly new test pattern for this repo — wired to the shared `PostgresFixture` Testcontainers Postgres, with helpers to seed a test user directly via the `DbContext` and mint a valid `omphalos_token` JWT cookie so tests can call authorized routes as a chosen user without going through the real login flow
- Added ownership-scoped image fetch methods (`SessionRepository.GetCharacterImageAsync`/`GetLocationImageAsync`, `GlobalCharacterRepository`/`GlobalLocationRepository.GetImageAsync`) that project straight to the `Cropped ?? Original` byte column via `.Select(...)`, never loading the full entity
- Added `ImageValidation` (magic-byte PNG/GIF/JPEG sniff, `MaxImageBytes` = 5MB, `IsInvalidUpload` guard) and `IImageService`/`ImageService`, DI-registered
- Added 2 new endpoint files (`CharacterImageEndpoints`, `LocationImageEndpoints`) plus binary-GET extensions to `GlobalCharacterEndpoints`/`GlobalLocationEndpoints` — all 4 entity kinds now serve `original`/`cropped` bytes via `TypedResults.File` with a SHA256 ETag (free 304-on-match) and `private`/`public` `Cache-Control`
- Added server-side upload validation (V5/T-04-02) at the Global* create/update endpoints and the session-upsert PUT/import handlers, rejecting non-image or oversized bytes with 400 before any bytes reach the repository
- Wrote 6 `WebApplicationFactory`-based endpoint tests proving IDOR-safe ownership (cross-user 404), ETag/304 caching, private vs public `Cache-Control`, unauthenticated 401, and invalid-upload 400-with-no-persistence — full solution test suite (`Omphalos.UnitTests` + `Omphalos.IntegrationTests`) is 19/19 green

## Task Commits

Each task was committed atomically:

1. **Task 1: WebApplicationFactory test harness (new pattern for this repo)** - `93a8a89` (feat)
2. **Task 2: Image repository fetch methods + IImageService + ImageValidation** - `8dd1f54` (feat)
3. **Task 3: Binary cached endpoints + Global* extensions + upload validation + endpoint tests** - `f4bc23e` (feat)

_Note: Task 2 and Task 3 both carry `tdd="true"` in the plan frontmatter, but this plan's frontmatter `type: execute` (not `type: tdd`), so no strict RED-before-GREEN commit gate applies — behavioral tests for Task 2's repository methods are exercised indirectly through Task 3's `ImageEndpointTests.cs`, which was written and run green before that task's commit._

## Files Created/Modified

**Created:**
- `src/Omphalos.IntegrationTests/WebAppFactory.cs` - `WebApplicationFactory<Program>` harness: PostgresFixture-backed connection string, JWT cookie minting, user seeding
- `src/Omphalos.IntegrationTests/ImageEndpointTests.cs` - 6 endpoint tests covering ownership, caching, and upload validation
- `src/Omphalos.Domain/Interfaces/IImageService.cs` - orchestrator interface fronting the 3 image-bearing repositories
- `src/Omphalos.Services/Implementations/ImageService.cs` - thin `IImageService` implementation
- `src/Omphalos.Services/Implementations/ImageValidation.cs` - magic-byte sniff, size cap, upload-validity guard
- `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs` - session-owned `/api/sessions/{sessionId}/characters/{id}/portrait/{variant}`
- `src/Omphalos.Web/Endpoints/LocationImageEndpoints.cs` - session-owned `/api/sessions/{sessionId}/locations/{id}/image/{variant}`

**Modified:**
- `src/Omphalos.Domain/Interfaces/{ISessionRepository,IGlobalCharacterRepository,IGlobalLocationRepository}.cs` - added image fetch method signatures
- `src/Omphalos.Repository/Repositories/{SessionRepository,GlobalCharacterRepository,GlobalLocationRepository}.cs` - implemented ownership-scoped/unscoped image fetch projections
- `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs`, `GlobalLocationEndpoints.cs` - added public binary GET routes + upload-validation guard on create/update
- `src/Omphalos.Web/Endpoints/SessionEndpoints.cs` - added upload-validation guard on PUT upsert and `/import`
- `src/Omphalos.Web/Program.cs` - registered `IImageService`, mapped the 2 new endpoint groups, appended `public partial class Program {}`
- `src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj` - added `Microsoft.AspNetCore.Mvc.Testing` + `Omphalos.Web` project reference

## Decisions Made
- Centralized the upload-size/magic-byte guard in `ImageValidation.IsInvalidUpload` rather than duplicating the two checks inline at each of the 3 write call sites (`GlobalCharacterEndpoints`, `GlobalLocationEndpoints`, `SessionEndpoints`), so all three share one provably-identical rule.
- Also applied the same validation guard to `SessionEndpoints`'s `/import` bulk endpoint (not explicitly named in the plan's task action, which called out only the PUT upsert handler) — `ImportAsync` ultimately calls the identical `UpsertAsync` write path per session, so leaving it unguarded would have left the same T-04-02 DoS/tampering hole open on a second entry point into the same code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WebAppFactory's Jwt:Secret override was invisible to Program.cs's eager config read**
- **Found during:** Task 3 (writing and running `ImageEndpointTests.cs` — every authenticated-route test returned 401 instead of the expected status)
- **Issue:** `WebAppFactory.ConfigureWebHost` originally overrode `Jwt:Secret`/`Jwt:Issuer`/`Jwt:Audience`/`ConnectionStrings:DefaultConnection` via `builder.ConfigureAppConfiguration(... AddInMemoryCollection ...)`. `Program.cs` reads `Jwt:Secret` **eagerly** into a local variable (`var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw ...`) as a top-level statement, which executes before that `ConfigureAppConfiguration` callback's values are folded into the same live configuration snapshot. The app ended up signing/validating with `appsettings.json`'s default secret while test tokens were signed with the override value, so every test-minted JWT failed signature validation (`IDX10517`, confirmed via a scratch diagnostic capturing `JwtBearerEvents.OnAuthenticationFailed`). The `ConnectionStrings:DefaultConnection` override happened to still work because `AddDbContext`'s connection-string lambda is evaluated lazily at DI-resolution time (after `Build()`), not eagerly like the JWT secret read — so this bug was invisible until an authenticated route was actually exercised.
- **Fix:** Switched all 6 overrides to `builder.UseSetting(key, value)`, which lands in the host configuration before `Program.cs`'s top-level code runs, making eager reads see the correct values.
- **Files modified:** `src/Omphalos.IntegrationTests/WebAppFactory.cs`
- **Verification:** Diagnostic scratch test (removed before final commit) confirmed `/api/auth/me` returned 200 with the correct user identity after the fix; the full `ImageEndpointTests` suite (6/6) and full solution test suite (19/19) pass.
- **Committed in:** `f4bc23e` (Task 3 commit — the WebAppFactory fix and the tests that exposed it landed together since the bug was only discoverable once Task 3's authenticated-route tests existed)

**2. [Rule 1 - Bug] `CreateAuthenticatedClient`'s manually-set Cookie header was silently dropped**
- **Found during:** Task 3 (same debugging session as above)
- **Issue:** `WebApplicationFactory.CreateClient()`'s default client wraps a cookie-container handler (`HandleCookies = true` by default) that recomputes the request's `Cookie` header from its own (empty, since no `Set-Cookie` response was ever received) container, silently overwriting the manually-added `omphalos_token` cookie header before every request.
- **Fix:** `CreateAuthenticatedClient` now calls `CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false })` so the manually-set `Cookie` header passes through unmodified.
- **Files modified:** `src/Omphalos.IntegrationTests/WebAppFactory.cs`
- **Verification:** Confirmed via a scratch middleware that echoed the raw `Cookie` header as seen server-side, matching the token exactly after the fix.
- **Committed in:** `f4bc23e` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in the new test infrastructure that blocked verifying this plan's own acceptance criteria, not scope creep into unrelated code).
**Impact on plan:** Both fixes were necessary for the plan's own required `dotnet test ... --filter FullyQualifiedName~ImageEndpoint` verification command to run meaningfully at all — without them every authenticated-route assertion was a false negative (401) rather than a true test of ownership/caching/validation behavior.

## Issues Encountered
- Diagnosing the 401s required a short debugging detour (a throwaway `DebugScratchTests.cs` + a custom `IPostConfigureOptions<JwtBearerOptions>`/`IStartupFilter` to capture the JWT bearer handler's actual `OnAuthenticationFailed` exception and confirm the raw `Cookie` header reaching the server) — this file was deleted before the final Task 3 commit and is not part of the shipped test suite.

## User Setup Required

None - no external service configuration required. `Microsoft.AspNetCore.Mvc.Testing` is a first-party, test-only Microsoft package (T-04-SC in the plan's threat register, disposition `accept`).

## Next Phase Readiness
- All 4 entity kinds now have working, cached, IDOR-safe binary image endpoints matching the exact route contract Plan 02's `getImageUrl` expects (`/api/sessions/{sessionId}/characters/{id}/portrait/{variant}`, `/api/sessions/{sessionId}/locations/{id}/image/{variant}`, `/api/characters/{id}/portrait/{variant}`, `/api/locations/{id}/image/{variant}`) — Plan 05 (frontend wiring) can call these directly.
- Server-side upload validation is now enforced on every write path that can carry new image bytes (Global* create/update, session-upsert PUT/import) — Plan 04 (crop-write wiring) inherits this protection for free with no additional backend work.
- The `WebApplicationFactory` harness (`WebAppFactory.cs`) is reusable for any future endpoint-level test in this repo — the `Jwt:Secret`-via-`UseSetting` and `HandleCookies = false` gotchas documented above are the two things a future author of this pattern would otherwise re-discover the hard way.
- No blockers for Plan 04/05/06.

---
*Phase: 04-image-cropping-storage-cropper-js-v2-rollout*
*Completed: 2026-07-13*

## Self-Check: PASSED
