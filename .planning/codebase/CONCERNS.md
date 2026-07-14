# Codebase Concerns

**Analysis Date:** 2026-07-10

## Tech Debt

**No debounce on session persistence:**
- Issue: Every keystroke in the session log rich-text editor, session-metadata inputs, and the "Quick Notes" textarea dispatches `UPDATE_SESSION`, which is persisted immediately (no debounce/throttle) via a full `PUT /api/sessions/{id}` containing the entire session payload (all characters, locations, encounters, and their base64 images).
- Files: `src/client/components/tabs/SessionLog.jsx` (`updateLog`, `updateNotes`, `updateMeta`), `src/client/components/RichTextEditor.jsx:19-20` (Tiptap `onUpdate` fires synchronously on every edit), `src/client/context/AppContext.jsx:258-282` (`dispatchWithPersist` calls `saveSession` with no delay)
- Impact: A DM typing session notes during a live game triggers one full-session write per keystroke. Combined with the delete/reinsert pattern in `SessionRepository.UpsertAsync` (see Performance Bottlenecks), this generates excessive Postgres write load and network traffic, and increases the odds of overlapping/out-of-order requests.
- Fix approach: Debounce text-input dispatches (e.g. 500ms–1s) before calling `dispatchWithPersist`, or split "local UI state" from "persisted state" and flush on blur/interval.

**Hand-rolled entity↔DTO mapping duplicated across services:**
- Issue: `SessionService`, `GlobalCharacterService` both hand-write ~60–130 lines of field-by-field mapping between DTOs and entities (including duplicated `NpcStatBlock` mapping logic copy-pasted between the two services).
- Files: `src/Omphalos.Services/Implementations/SessionService.cs:42-177`, `src/Omphalos.Services/Implementations/GlobalCharacterService.cs:71-115`
- Impact: Adding a field to `Character`/`GlobalCharacter`/`NpcStatBlock` requires updating multiple independent mapping blocks; missing one is easy and has already happened (see Known Bugs).
- Fix approach: Extract shared mapping helpers (e.g. a `StatBlockMapper` static class) or introduce a mapping library (Mapperly/AutoMapper) to keep entity↔DTO conversion in one place.

**No linting or formatting tooling:**
- Issue: No ESLint, Prettier, or `.editorconfig` present for the React codebase; CI (`.github/workflows/ci.yml`) only runs `dotnet build` and `npm run build`, with no lint/format/test step for either stack.
- Files: repo root (absence of `.eslintrc*`/`eslint.config.*`/`.prettierrc*`), `.github/workflows/ci.yml`
- Impact: No automated enforcement of code style or basic static-analysis catches (unused vars, hooks-rules violations, etc.); consistency depends entirely on manual review.
- Fix approach: Add `eslint` + `eslint-plugin-react-hooks` and wire a `lint` step into CI.

**Large "kitchen sink" components:**
- Issue: `src/client/components/tabs/Toolkit.jsx` is 912 lines with ~50 inline functions covering dice rolling, DC/trap generators, name generation UI, and several unrelated random-table tools in one file. `src/client/components/Library.jsx` (579 lines) similarly mixes global-character and global-location CRUD, image upload/crop flow, and search/filtering in one component.
- Files: `src/client/components/tabs/Toolkit.jsx`, `src/client/components/Library.jsx`
- Impact: Harder to reason about, test, or safely modify a single tool without risking regressions in unrelated tools sharing the file.
- Fix approach: Split `Toolkit.jsx` into one component per tool (dice roller, DC tracker, trap generator, name generator) under a `toolkit/` subdirectory, mirroring the pattern already used for `session/` and `character/` blocks.

## Known Bugs

**`GlobalCharacterRepository.UpdateAsync` silently drops `IsNpc` and `StatBlock` updates:**
- Symptoms: Editing an existing library (global) character's "Is NPC" flag or NPC stat block via the update flow has no effect — the change is accepted by the API (200 OK) but not persisted for those two fields.
- Files: `src/Omphalos.Repository/Repositories/GlobalCharacterRepository.cs:22-43` — `UpdateAsync` copies `Name`, `Tagline`, `Class`, `Race`, `Alignment`, `PersonalityTraits`, `Flaw`, `Description`, `PortraitBase64`, `PortraitPanX`, `PortraitPanY`, `QuestHooks`, `Relationships` onto `existing`, but never assigns `existing.IsNpc` or `existing.StatBlock` (both of which `CreateAsync`, lines 15-20, does set).
- Trigger: `PUT /api/characters/{id}` (via `UpdateGlobalCharacterRequest`) with a changed `isNpc` or `statBlock` value on an already-existing global character.
- Workaround: Delete and recreate the global character instead of editing it.

**Client-generated ID collisions can silently fail a session save:**
- Symptoms: If two sub-resources (characters/locations/encounters/phases/combatants) created within the same session end up with the same generated ID, the next session save throws an unhandled exception (Postgres primary-key violation) which surfaces to the frontend only as a swallowed promise rejection — the DM sees no error, but the save did not happen.
- Files: ID generator helpers duplicated across `src/client/components/tabs/Characters.jsx`, `src/client/components/tabs/Encounters.jsx`, `src/client/components/session/NpcQuickBar.jsx`, `src/client/components/session/PhaseCard.jsx`, `src/client/components/tabs/SessionPrep.jsx`, `src/client/components/Library.jsx`, `src/client/components/LocationsLibrary.jsx`, `src/client/components/location/AddLocationModal.jsx` — all use the pattern `` `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}` ``
- Trigger: Rapid successive "add" actions (e.g. bulk-adding combatants to an encounter) where `Date.now()` resolves to the same millisecond and the `Math.random()` suffix also collides (low probability, non-zero).
- Workaround: None currently; would require retrying the add action.

## Security Considerations

**No rate limiting on login:**
- Risk: `POST /api/auth/login` has no throttling, lockout, or CAPTCHA — brute-force/credential-stuffing is possible against any exposed instance.
- Files: `src/Omphalos.Web/Endpoints/AuthEndpoints.cs:22-29`
- Current mitigation: None beyond BCrypt hashing making individual guesses slow.
- Recommendations: Add ASP.NET Core rate limiting middleware (`Microsoft.AspNetCore.RateLimiting`) scoped to the auth endpoints, and/or exponential backoff per username/IP.

**JWT cookie `Secure` flag is deliberately disabled, with no forwarded-headers handling:**
- Risk: The auth cookie (`omphalos_token`) is set with `HttpOnly` + `SameSite=Lax` but `Secure` is commented out (`// Secure = true ← enable once behind HTTPS`), and `Program.cs` has no `UseForwardedHeaders`/`UseHttpsRedirection` configured for reverse-proxy deployments. If the app is ever reached over plain HTTP (misconfigured proxy, direct port access, local network), the 30-day auth cookie is sent in clear text.
- Files: `src/Omphalos.Web/Endpoints/AuthEndpoints.cs:10-16`, `src/Omphalos.Web/Program.cs`
- Current mitigation: Documented assumption that a reverse proxy terminates TLS (per `CLAUDE.md`: "No HTTPS in the container; terminate TLS at the reverse proxy"), but nothing enforces or verifies this at runtime.
- Recommendations: Make `Secure` configurable via an env var (e.g. `Cookie__Secure=true` in production compose), and add `ForwardedHeadersMiddleware` so the app correctly recognizes `X-Forwarded-Proto` when Secure cookies are enabled.

**Long-lived, non-revocable JWTs:**
- Risk: Tokens are valid for 30 days and are purely stateless (HMAC-signed, no server-side session/allow-list). `POST /api/auth/logout` only deletes the client-side cookie — a copied or intercepted token remains valid for up to 30 days regardless of logout.
- Files: `src/Omphalos.Services/Implementations/AuthService.cs:37-57` (`GenerateToken`, `expires: DateTime.UtcNow.AddDays(30)`), `src/Omphalos.Web/Endpoints/AuthEndpoints.cs:31-35` (`logout`)
- Current mitigation: `HttpOnly` cookie makes token theft harder via XSS, but does not address token leakage via other means (e.g. server logs, compromised network).
- Recommendations: Shorten token lifetime and/or add a refresh-token flow, or maintain a minimal server-side revocation list (e.g. token version/nonce per user, bumped on password change or explicit "log out everywhere").

**Admin self-delete / last-admin lockout is enforced only in the UI:**
- Risk: `DELETE /api/admin/users/{id}` has no server-side check preventing an admin from deleting their own account or the last remaining admin. The "can't delete yourself" guard exists only in `AdminModal.jsx` (hides the delete button when `u.id === state.user?.id`); a direct API call bypasses it entirely. Deleting all users locks the app out of admin access until the container is restarted (the admin re-seed in `Program.cs` only runs when `AnyUsersExistAsync()` is false).
- Files: `src/Omphalos.Web/Endpoints/AdminEndpoints.cs:21-25`, `src/Omphalos.Services/Implementations/UserService.cs:29-30`, `src/Omphalos.Repository/Repositories/UserRepository.cs:25-29`, `src/client/components/AdminModal.jsx:82`
- Current mitigation: Frontend-only guard.
- Recommendations: Add a server-side check in `UserService.DeleteAsync`/`UserRepository.DeleteAsync` rejecting deletion of the last user with `Role == Admin`, and/or rejecting self-deletion via the authenticated caller's ID.

**No server-side request validation:**
- Risk: No `[Required]`/DataAnnotations or FluentValidation exist anywhere under `Omphalos.Domain/DTOs`. Field constraints only exist as EF Core `HasMaxLength` on a handful of properties (e.g. `Character.Name`, `GameSession.Title`); most string fields (including base64 image fields) are unconstrained. Oversized or malformed payloads surface as unhandled 500s rather than clean 400 responses.
- Files: `src/Omphalos.Domain/DTOs/*.cs` (no validation attributes present), `src/Omphalos.Repository/Configurations/*.cs` (partial `HasMaxLength` coverage only)
- Current mitigation: None.
- Recommendations: Add minimal-API endpoint filters or DataAnnotations validation for request DTOs, and a request body size limit for image-bearing endpoints.

**Gemini API key handled client-side and stored in plaintext:**
- Risk: The Gemini API key (`UserSettings.GeminiApiKey`) is stored unencrypted in Postgres, sent to the browser in the `/api/settings` response, and used directly from the client with the key embedded in the request URL query string (`generateContent?key=${apiKey}`) rather than proxied server-side. This exposes the key to browser history, devtools network logs, and any client-side error/telemetry logging that captures URLs.
- Files: `src/client/components/tabs/SessionLog.jsx:65-98` (`handleAISummary`), `src/Omphalos.Domain/Entities/UserSettings.cs`
- Current mitigation: None.
- Recommendations: Proxy the Gemini call through a backend endpoint that reads the key server-side, or at minimum pass the key via a header instead of a URL query string.

**Fallback JWT secret committed to source control:**
- Risk: `appsettings.json` ships a default `Jwt:Secret` value (`"change-me-in-production-minimum-32-chars!!"`). Docker Compose enforces a real `JWT_SECRET` via `:?required`, but running the API directly (`dotnet run`, outside Compose) without an explicit override silently uses this well-known, publicly-visible secret.
- Files: `src/Omphalos.Web/appsettings.json:13`
- Current mitigation: Compose-only enforcement.
- Recommendations: Fail fast (throw at startup, as already done for the Compose path) whenever the configured secret matches the placeholder value, regardless of how the app is launched.

## Performance Bottlenecks

**Session list endpoint eagerly loads and then discards all child data:**
- Problem: `GET /api/sessions` (called on every login/app load) fetches every session belonging to the user with `.Include(Characters).Include(Locations).Include(Encounters)` — pulling all base64 portrait/location images and full encounter data from Postgres — then maps the result down to a 4-field `SessionSummaryDto` (`Id`, `Title`, `DateCreated`, `DateModified`), discarding everything else.
- Files: `src/Omphalos.Repository/Repositories/SessionRepository.cs:9-16` (`GetAllByUserAsync`), `src/Omphalos.Services/Implementations/SessionService.cs:9-13` (`GetAllAsync`)
- Cause: The `Include()` calls are copy-pasted from `GetByIdAsync`/`UpsertAsync` without being trimmed for the summary-only use case; the frontend comment in `AppContext.jsx:231-233` even documents that "sessions from the list endpoint are summaries only" — but the backend doesn't actually implement that as a lightweight query.
- Improvement path: Replace the eager-loaded query in `GetAllByUserAsync` with a projection query (`.Select(s => new { s.Id, s.Title, s.DateCreated, s.DateModified })`) that never touches the child tables/images at the database level.

**Full session write on every keystroke:**
- Problem: See Tech Debt — every text-field edit anywhere in the active session view issues a full `PUT /api/sessions/{id}` containing all characters/locations/encounters and their images.
- Files: `src/client/components/tabs/SessionLog.jsx`, `src/client/context/AppContext.jsx:258-282`
- Cause: No debounce; `dispatchWithPersist` fires the save synchronously with the dispatch.
- Improvement path: Debounce text input persistence (see Tech Debt fix approach).

**`SessionRepository.UpsertAsync` deletes and reinserts all child rows on every save:**
- Problem: Every session save (including saves triggered by editing a single character or a single metadata field) removes *all* `Character`/`Location`/`Encounter` rows for the session and reinserts the full set from the request payload, rather than diffing.
- Files: `src/Omphalos.Repository/Repositories/SessionRepository.cs:27-58`
- Cause: `UpsertAsync` calls `db.Characters.RemoveRange(existing.Characters)` / `RemoveRange(existing.Locations)` / `RemoveRange(existing.Encounters)` unconditionally before reassigning from the incoming session, instead of reconciling by ID.
- Improvement path: Diff incoming vs. existing child collections by ID (add/update/remove only what changed) instead of full replace; combine with the debounce fix above to reduce the frequency of these round trips overall.

## Fragile Areas

**"Save after next render" persistence pattern in `AppContext`:**
- Files: `src/client/context/AppContext.jsx:243-250` (`dirtySessionRef` + `useEffect`)
- Why fragile: Sub-resource mutations (characters/locations/encounters) don't call `saveSession` directly; instead they set `dirtySessionRef.current = sessionId` and rely on a separate `useEffect` (keyed on `state.sessions`) to fire *after* React re-renders with the mutated state, specifically to avoid persisting a stale pre-mutation snapshot. This is a documented past bug (see commit `444c048 Add shared locations library and fix broken session data persistence`). The pattern depends on exact `useEffect` dependency arrays and reducer purity; any future change to the reducer (e.g. an async action, or a change that skips triggering a `state.sessions` identity change) can silently reintroduce stale saves.
- Safe modification: Any new sub-resource action type must follow the existing `dirtySessionRef.current = action.sessionId` convention in `dispatchWithPersist`; do not call `saveSession` directly from a new mutation branch.
- Test coverage: None — this exact class of bug has no regression test guarding it.

**Client-generated primary keys with no uniqueness guarantee:**
- Files: ID helpers across `src/client/components/tabs/Characters.jsx`, `Encounters.jsx`, `SessionPrep.jsx`, `src/client/components/session/NpcQuickBar.jsx`, `PhaseCard.jsx`, `src/client/components/Library.jsx`, `LocationsLibrary.jsx`, `src/client/components/location/AddLocationModal.jsx`
- Why fragile: IDs (`char-...`, `loc-...`, `enc-...`, `gchar-...`, `gloc-...`, `block-...`, `phase-...`) are generated client-side from `Date.now()` + `Math.random()` and used directly as Postgres string primary keys, with no server-side generation or uniqueness check.
- Safe modification: Any new entity type introduced with a client-generated ID should ideally switch to `crypto.randomUUID()` (already available in all supported browsers) rather than copying the existing `Date.now()-Math.random()` helper.
- Test coverage: None.

**Manual entity↔DTO mapping is easy to desync from the entity model:**
- Files: `src/Omphalos.Services/Implementations/SessionService.cs`, `src/Omphalos.Services/Implementations/GlobalCharacterService.cs`, `src/Omphalos.Repository/Repositories/GlobalCharacterRepository.cs`, `src/Omphalos.Repository/Repositories/GlobalLocationRepository.cs`
- Why fragile: `UpdateAsync` methods in the repositories copy fields one-by-one onto the tracked entity rather than replacing/merging the whole object graph; adding a field to an entity requires remembering to add it in at least 3-4 separate places (Create mapping, Update mapping, DTO→entity mapping, entity→DTO mapping). This has already caused the `IsNpc`/`StatBlock` update bug documented above.
- Safe modification: When adding a new field to `Character`, `GlobalCharacter`, `Location`, `GlobalLocation`, or `NpcStatBlock`, grep for every existing field-by-field mapping block for that type and update all of them, or refactor to a shared mapper first.
- Test coverage: None — no unit tests exist to catch a missed field in any mapping path.

## Scaling Limits

**Images stored as base64 text directly in Postgres, no size cap:**
- Current capacity: `PortraitBase64`/`ImageBase64` columns have no `HasMaxLength` and no dedicated object storage; images are pre-resized client-side to ~400×300 JPEG at 0.92 quality (`src/client/components/CropModal.jsx:3-4,85`), keeping individual images modest, but there is no enforced upper bound and no server-side validation rejecting oversized uploads.
- Limit: As a campaign's library of characters/locations grows (each with an embedded image) combined with the full-session-save-per-keystroke behavior, per-request payload size and Postgres row/table size will grow without bound.
- Scaling path: Move images to filesystem or object storage (e.g. a mounted volume served via a static endpoint, or S3-compatible storage) and store only a reference/URL in the database; add server-side size/type validation on upload.

**Sequential, non-transactional bulk import:**
- Current capacity: `ImportAsync` loops over the provided sessions and calls `UpsertAsync` one at a time with no batching and no overarching transaction.
- Limit: A large import (e.g. migrating years of session history from another tool) is slow (one round trip per session) and can partially fail — some sessions committed, others not — with no rollback of already-imported sessions.
- Scaling path: Wrap the whole import in a single DB transaction, or at least report partial-failure results per session so the caller can retry only the failed ones.

## Dependencies at Risk

**No dependency scanning in CI:**
- Risk: Neither `npm audit`/`dotnet list package --vulnerable` nor Dependabot/Renovate config is present; the CI pipeline (`ci.yml`) only builds, it does not check for known-vulnerable packages.
- Impact: Vulnerable transitive dependencies (npm or NuGet) would not be surfaced automatically.
- Migration plan: Add a scheduled CI job (or GitHub Dependabot config) running `npm audit --production` and `dotnet list package --vulnerable --include-transitive`.

## Missing Critical Features

**No React error boundary:**
- Problem: There is no `ErrorBoundary`/`componentDidCatch` anywhere under `src/client`. An uncaught render error in any tab (Session, Locations, Characters, Encounters, Toolkit) or modal crashes the entire SPA to a blank white screen with no recovery path other than a full page reload.
- Blocks: Graceful degradation — a bug in one feature (e.g. a malformed `sessionLog` JSON document from a partially-failed save) can take down the whole app instead of just that panel.

**No offline/save-failure feedback to the user:**
- Problem: Every persistence call in `src/client/context/AppContext.jsx` and `src/client/db/index.js` swallows failures (`.catch(() => {})` or a generic thrown `Error` with no UI surface for most call sites). A DM has no visual indicator when a save fails (network drop, oversized payload, server error) — the UI shows the change as applied locally while the server never received it.
- Blocks: Trustworthy "what you see is what's saved" behavior, which matters most for irreplaceable in-session note-taking.

## Test Coverage Gaps

**No automated tests exist anywhere in the repository:**
- What's not tested: There are zero test files (`*.test.*`, `*.spec.*`, or a dedicated test project) for either the React frontend or the .NET backend. `Omphalos.slnx` has no test project; `package.json` has no test script or test runner dependency.
- Files: entire repository (absence confirmed via search for `*.test.*`/`*.spec.*`/`*Tests*`)
- Risk: Every concern documented above (the `IsNpc`/`StatBlock` update bug, the stale-save race pattern, the ID-collision edge case, the last-admin lockout) would be either caught or prevented by even minimal test coverage. Regressions in persistence logic (`SessionRepository.UpsertAsync`, `dispatchWithPersist`) are especially likely to go unnoticed given how central and non-obvious that logic is.
- Priority: High — persistence and auth logic (`AuthService`, `SessionRepository`, `AppContext.jsx`'s dispatch/persist wiring) are the highest-value targets for initial unit/integration tests given the bugs already found by manual review.

---

*Concerns audit: 2026-07-10*
