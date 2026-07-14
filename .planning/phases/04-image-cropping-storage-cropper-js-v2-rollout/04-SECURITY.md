---
phase: 04
slug: image-cropping-storage-cropper-js-v2-rollout
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-14
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| DB migration (in-place data transform) | Existing production Base64 image data crosses a text->bytea cast | Image bytes (all users) |
| npm dependency install | `cropperjs` executes as part of the client bundle | Build-time supply chain |
| Browser file input -> client-side canvas | User-selected image bytes processed client-side before crop/upload | Image bytes (single user) |
| client -> image GET endpoints | Any authenticated user can request an image URL by id; ownership must be enforced server-side | Image bytes (per-entity) |
| client -> image write (Global create/update, session upsert) | User-supplied image bytes cross into storage | Image bytes (per-entity) |
| browser cache <- Cache-Control header | Shared vs per-user cacheability of served images | HTTP cache directives |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-M1 | Tampering (data integrity) | `RenameImageColumnsAddCropped` migration | high | mitigate | `USING CASE ... decode(col,'base64')` / `encode(col,'base64')` casts with `IS NULL OR = ''` guards (20260713134719_RenameImageColumnsAddCropped.cs) — never `AlterColumn` | closed |
| T-04-02 | Denial of Service / Tampering | Image upload write endpoints (Global create/update, session upsert) | high | mitigate | Server-side `ImageValidation.IsRecognizedImage` (magic-byte) + `MaxImageBytes` length check in `GlobalCharacterEndpoints`, `GlobalLocationEndpoints`, `CharacterImageEndpoints`, `LocationImageEndpoints`; Kestrel 30MB body limit as backstop | closed |
| T-04-M2 | Denial of Service | Unbounded image write (pre-endpoint-hardening window) | medium | transfer | Transferred to and closed by T-04-02's server-side validation | closed |
| T-04-01 | Elevation of Privilege / Information Disclosure (IDOR) | Session Character/Location image GET endpoints | high | mitigate | Ownership enforced in the repository query — `c.Session.UserId == userId` / `l.Session.UserId == userId` (`SessionRepository.cs:72,78`), not id-only | closed |
| T-04-03 | Tampering (MIME spoofing) | Content-Type of served images | medium | mitigate | `DetectImageMimeType` magic-byte sniff on the read path reflects real bytes regardless of client-declared type | closed |
| T-04-04 | Information Disclosure (cross-user cache poisoning) | Cache-Control on image endpoints | medium | mitigate | All 4 image endpoints (Character, Location, GlobalCharacter, GlobalLocation) serve `private, max-age=31536000, immutable` — stricter than the original plan (which allowed `public` for Global*); upgraded during code review since Global* endpoints remain `RequireAuthorization()`-gated. Confirmed live via network inspection this session (ETag + `Cache-Control: private`). | closed |
| T-04-C1 | Denial of Service | `createImageBitmap` on a huge image | low | mitigate | Client `MAX_IMAGE_BYTES` gate (5MB) + `WORKING_COPY_MAX_EDGE=2400` downscale in `imageUpload.js`, caps canvas below the iOS Safari ceiling | closed |
| T-04-05 | Tampering (GIF type spoof) | `isGifFile` check | low | accept | Matches locked D-04 precedent; read-side magic-byte sniff self-corrects served Content-Type regardless. The check gates a single shared file-handler used by both initial upload and re-crop (`CharacterModal.jsx`, `AddLocationModal.jsx`, `Library.jsx`) — CR-01 fix confirmed both paths skip the crop modal. Verified live via browser UAT this session (upload + re-crop round trip). | closed |
| T-04-SC | Tampering (supply chain) | `cropperjs@2.1.1` install | low | accept | RESEARCH Package Legitimacy Audit verdict OK/Approved (github.com/fengyuanchen/cropperjs, ~1.55M weekly downloads, no postinstall script). `package-lock.json` pins the exact resolved version (2.1.1) with an integrity hash, so `npm ci` cannot drift even though `package.json` declares a caret range. | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-05 | GIF detection relies on client-declared `file.type`, which is spoofable; accepted because the read-side magic-byte sniff (`DetectImageMimeType`) self-corrects the served Content-Type regardless, and GIFs render via `<img>` (no script execution surface) | Phase 04 planning (D-04 precedent) | 2026-07-14 |
| AR-04-02 | T-04-SC | `cropperjs@2.1.1` supply-chain risk accepted per Package Legitimacy Audit (OK/Approved verdict); exact version pinned via committed lockfile with integrity hash | Phase 04 planning | 2026-07-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-14 | 9 | 9 | 0 | /gsd-secure-phase orchestrator (L1 grep-depth verification against plan-time threat register; ASVS level 1, threats_open: 0 short-circuit — no auditor subagent spawn required) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-14
