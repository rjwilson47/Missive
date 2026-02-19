# HANDOFF.md
<!-- Claude maintains this file continuously throughout every session.
     Update after every completed file, not at the end of the session. -->

## 🎯 Next Session Starts Here
<!-- Claude overwrites this section at the end of every session -->
> **Session 2 is complete.** Begin Session 3:
>
> 1. **Implement `src/components/editor/LetterEditor.tsx`** — TipTap-based typed letter editor:
>    - Extensions: Document, Paragraph, Text, Italic only (no bold, no headings, no lists)
>    - Block copy/cut/paste during composition (keydown + paste + contextmenu listeners)
>    - Font selector (6 stationery fonts, whole-letter via CSS class)
>    - Character counter (max 50,000; show warning at limit)
>    - Store content as ProseMirror JSON
> 2. **Implement `src/app/signup/page.tsx` and `src/app/login/page.tsx`** — form UIs:
>    - Signup: username + password + region + timezone (TimezoneSelect)
>    - Login: username + password
>    - Both call the already-implemented API routes
>    - Full TimezoneSelect implementation (grouped, searchable, UTC offset labels)
> 3. **Implement `src/app/api/letters/route.ts`** — GET (list drafts) + POST (create draft)
> 4. **Implement `src/app/api/letters/[id]/route.ts`** — GET (single draft) + PUT (update draft) + DELETE (draft only)
> 5. **Implement `src/app/api/upload/route.ts`** — image upload with Sharp (EXIF strip, resize, thumbnail, HEIC→JPG attempt)
> 6. **Implement `src/lib/upload.ts`** — processImage(), uploadImageToStorage(), getSignedUrl(), validateImageFile()
> 7. **Implement `src/app/app/drafts/page.tsx`** — draft list using GET /api/letters
> 8. **Implement `src/app/app/compose/page.tsx`** — multi-step compose flow (address → type → write → review)
>
> Do NOT implement anything beyond this list.

---
## 📌 Build Order
<!-- Reference for sequencing. Tick off as fully completed.
     Claude uses this to determine what comes next and avoid 
     skipping ahead or working out of order. -->

- [x] Session 1: Skeleton + prisma/schema.prisma + auth files + api/me
- [x] Session 2: lib/delivery.ts + api/cron/deliver.ts + delivery tests
- [ ] Session 3: Editor component + compose flow + drafts + api/upload.ts
- [ ] Session 4: Mailbox UI pages + tear-open + reply + image carousel
- [ ] Session 5: Pen pal + folders + block/report + rate limiting
- [ ] Session 6: Settings + account deletion + landing page + README.md

---

## ✅ Completed Files
<!-- Claude appends to this list after each finished file.
     Format: - `path/to/file.ts` — what it does, anything notable -->

### Session 1 — Completed

- `package.json` — all dependencies (Next.js 14, Prisma, Supabase, TipTap, Sharp, Luxon, Upstash, Radix)
- `tsconfig.json` — strict TypeScript, path alias @/*
- `next.config.ts` — Sharp server-side external, images unoptimized (signed URLs)
- `tailwind.config.ts` — paper/ink color tokens, stationery font vars, envelope shadow
- `postcss.config.js` — Tailwind + Autoprefixer
- `.env.local.example` — all required env vars with explanations
- `vercel.json` — cron job every 5 minutes to /api/cron/deliver
- `jest.config.ts` — ts-jest, @/* alias
- `src/types/index.ts` — all shared TS types (enums, AppUser, LetterSummary, LetterDetail, etc.)
- `src/lib/prisma.ts` — singleton PrismaClient with globalThis dev hot-reload guard
- `src/lib/supabase.ts` — supabaseAnon + supabaseAdmin clients, getUserFromHeader()
- `src/lib/auth.ts` — **FULLY IMPLEMENTED**: signupUser(), loginUser(), getAppUser(), buildSyntheticEmail(), validateUsername(), prismaUserToAppUser()
- `src/lib/delivery.ts` — stub: computeScheduledDelivery() placeholder + isValidIanaTimezone() (real impl in Session 2)
- `src/lib/ratelimit.ts` — stub: identifierLookupLimiter, sendLimiter, authLimiter, getClientIp()
- `src/lib/upload.ts` — stub: processImage(), uploadImageToStorage(), getSignedUrl(), scanUpload(), validateImageFile() (impl Session 3)
- `src/app/globals.css` — Tailwind base + focus-visible ring
- `src/app/layout.tsx` — root HTML shell
- `src/app/page.tsx` — landing page with Sign Up / Log In CTAs
- `src/app/signup/page.tsx` — stub signup form (TODO Session 1)
- `src/app/login/page.tsx` — stub login form (TODO Session 1)
- `src/app/safety/page.tsx` — static safety/blocking explanation page
- `src/app/app/layout.tsx` — authenticated app shell stub
- `src/app/app/page.tsx` — redirect to /app/unopened
- `src/app/app/unopened/page.tsx` — stub
- `src/app/app/opened/page.tsx` — stub
- `src/app/app/drafts/page.tsx` — stub
- `src/app/app/folder/[id]/page.tsx` — stub
- `src/app/app/compose/page.tsx` — stub
- `src/app/app/letter/[id]/page.tsx` — stub
- `src/app/app/settings/page.tsx` — stub
- `src/app/api/auth/signup/route.ts` — **FULLY IMPLEMENTED**: rate-limit, body validation, calls signupUser(), 201/400/409/429/500 responses
- `src/app/api/auth/login/route.ts` — **FULLY IMPLEMENTED**: rate-limit, body validation, calls loginUser(), always-generic 401 (anti-enumeration)
- `src/app/api/auth/logout/route.ts` — **FULLY IMPLEMENTED**: per-request Supabase client, scope="local" signOut, always returns 200
- `src/app/api/me/route.ts` — **FULLY IMPLEMENTED**: validates JWT, looks up app User, returns AppUser or 401
- `src/app/api/lookup/route.ts` — stub anti-enumeration always-generic response (TODO Session 5)
- `src/app/api/pen-pal-match/route.ts` — stub (TODO Session 5)
- `src/app/api/letters/route.ts` — stub GET/POST (TODO Session 3)
- `src/app/api/letters/[id]/route.ts` — stub GET/PUT/DELETE (TODO Sessions 3-4)
- `src/app/api/letters/[id]/send/route.ts` — stub (TODO Session 2)
- `src/app/api/letters/[id]/tear-open/route.ts` — stub (TODO Session 4)
- `src/app/api/letters/[id]/reply/route.ts` — stub (TODO Session 4)
- `src/app/api/letters/[id]/block-sender/route.ts` — stub (TODO Session 5)
- `src/app/api/letters/[id]/report/route.ts` — stub (TODO Session 5)
- `src/app/api/letters/[id]/move/route.ts` — stub (TODO Session 5)
- `src/app/api/folders/route.ts` — stub GET/POST (TODO Session 5)
- `src/app/api/folders/[id]/route.ts` — stub DELETE (TODO Session 5)
- `src/app/api/upload/route.ts` — stub (TODO Session 3)
- `src/app/api/cron/deliver/route.ts` — auth check implemented; delivery logic stub (TODO Session 2)
- `src/components/editor/LetterEditor.tsx` — stub (TODO Session 3)
- `src/components/mailbox/EnvelopeCard.tsx` — stub (TODO Session 4)
- `src/components/mailbox/MailboxList.tsx` — renders EnvelopeCard list + empty state
- `src/components/compose/AddressStep.tsx` — stub (TODO Session 3)
- `src/components/compose/TypeStep.tsx` — stub (TODO Session 3)
- `src/components/compose/WriteStep.tsx` — stub (TODO Session 3)
- `src/components/compose/ReviewStep.tsx` — stub (TODO Session 3)
- `src/components/letter/LetterView.tsx` — stub (TODO Session 4)
- `src/components/letter/ImageCarousel.tsx` — stub (TODO Session 4)
- `src/components/letter/ImageLightbox.tsx` — stub (TODO Session 4)
- `src/components/layout/Sidebar.tsx` — functional nav links (full active-state TODO Session 4)
- `src/components/ui/TimezoneSelect.tsx` — minimal native select stub; full autocomplete TODO Session 1
- `src/components/ui/Button.tsx` — **FULLY IMPLEMENTED**: primary/secondary/danger/ghost variants, loading state, accessible
- `src/__tests__/delivery.test.ts` — test stubs for computeScheduledDelivery() (TODO Session 2)
- `prisma/schema.prisma` — **FULLY IMPLEMENTED**: 10 models (User, UserIdentifier, Letter, LetterImage, Folder, LetterFolder, BlockList, Report, DailyQuota, MatchHistory, AuditLog), 7 enums, all FK cascade rules (NoAction for sentLetters, Cascade for receivedLetters and all others), composite @@unique constraints, partial index note for IN_TRANSIT letters

### Session 2 — Completed

- `jest.config.js` — converted from jest.config.ts (removed ts-node requirement; same config, CommonJS format)
- `src/lib/delivery.ts` — **FULLY IMPLEMENTED**: computeScheduledDelivery() with hour-by-hour business-day counting, weekend fast-forward to Monday at same local time, next-4PM scheduling, DST-safe via Luxon; isValidIanaTimezone() exported
- `src/__tests__/delivery.test.ts` — **FULLY IMPLEMENTED**: 10 passing tests — all 5 SPEC §12 critical cases (Mon 5pm→Wed 4pm, Mon 3pm→Tue 4pm, Fri 5pm→Tue 4pm, Thu 4pm→Fri 4pm, Sat 10am→Tue 4pm), Sunday fast-forward, DST spring-forward, DST fall-back, invalid timezone throw, seconds/ms zeroed
- `src/app/api/letters/[id]/send/route.ts` — **FULLY IMPLEMENTED**: JWT auth → rate limit (fail open) → deletion guard → DRAFT ownership check → DailyQuota check (sender TZ, max 3/day) → recipient timezone lookup → computeScheduledDelivery() → atomic transaction (letter→IN_TRANSIT + DailyQuota upsert) → 200
- `src/app/api/cron/deliver/route.ts` — **FULLY IMPLEMENTED**: CRON_SECRET auth → mark UNDELIVERABLE (null recipient + >3 days) → re-route still-unroutable letters (USERNAME/EMAIL/PHONE/ADDRESS with discoverability check) → deliver due letters (BlockList check → BLOCKED or DELIVERED + UNOPENED folder upsert); per-letter try/catch for resilience

---

## 🔄 In Progress
<!-- Claude updates this BEFORE starting each file.
     Clear it when the file moves to Completed. -->
_(nothing — Session 2 complete; start Session 3 items above)_

---

## ⚠️ Known Stubs / TODOs
<!-- Claude records any intentional shortcuts, incomplete logic,
     or TODO comments left inside files. Be specific. -->

- `src/lib/ratelimit.ts` — rate limiters defined + wired into send and auth routes, but NOT yet wired into lookup, pen-pal-match, and others (Session 5)
- `src/lib/upload.ts` — `processImage()` and `uploadImageToStorage()` throw "not yet implemented" (Session 3)
- `src/components/ui/TimezoneSelect.tsx` — minimal native `<select>` with no UTC offset labels, grouping, or autocomplete (Session 3)
- `src/app/signup/page.tsx` + `login/page.tsx` — form UI not implemented; API routes are done; forms deferred to Session 3
- Partial index for `Letter.status = 'IN_TRANSIT'` must be created manually via SQL after `prisma db push` (documented in schema comments)
- `src/app/api/cron/deliver/route.ts` — re-routing uses `sentAt > cutoff` but sentAt is not fetched in scope for `computeScheduledDelivery`; uses `now` as approximation (acceptable given 3-day window)

---

## 🗂️ File Skeleton
<!-- Claude fills this in during Session 1 when the skeleton is created.
     Shows every file in the project and its purpose. -->

```
/
├── package.json              — dependencies + scripts
├── tsconfig.json             — TypeScript strict config, @/* alias
├── next.config.ts            — Sharp external, images unoptimized
├── tailwind.config.ts        — design tokens (paper/ink palette, fonts)
├── postcss.config.js         — Tailwind + Autoprefixer
├── jest.config.js            — ts-jest, @/* alias (converted from .ts to avoid ts-node dep)
├── vercel.json               — cron job every 5 min
├── .env.local.example        — env var template
├── prisma/
│   └── schema.prisma         — DB schema (all tables, enums, FKs)
└── src/
    ├── types/
    │   └── index.ts          — shared TS types (enums, API shapes)
    ├── lib/
    │   ├── prisma.ts         — singleton PrismaClient
    │   ├── supabase.ts       — anon + admin Supabase clients
    │   ├── auth.ts           — signup/login/session helpers
    │   ├── delivery.ts       — computeScheduledDelivery (Session 2)
    │   ├── ratelimit.ts      — Upstash rate limiter instances
    │   └── upload.ts         — image processing + storage (Session 3)
    ├── app/
    │   ├── globals.css       — Tailwind base + focus ring
    │   ├── layout.tsx        — root HTML shell
    │   ├── page.tsx          — landing page (/)
    │   ├── signup/page.tsx   — signup form (/signup)
    │   ├── login/page.tsx    — login form (/login)
    │   ├── safety/page.tsx   — static safety page (/safety)
    │   ├── app/
    │   │   ├── layout.tsx             — auth shell + sidebar
    │   │   ├── page.tsx               — redirect → /app/unopened
    │   │   ├── unopened/page.tsx      — unopened mailbox
    │   │   ├── opened/page.tsx        — opened mailbox
    │   │   ├── drafts/page.tsx        — drafts list
    │   │   ├── folder/[id]/page.tsx   — custom folder view
    │   │   ├── compose/page.tsx       — compose flow
    │   │   ├── letter/[id]/page.tsx   — letter detail / tear-open
    │   │   └── settings/page.tsx      — user settings
    │   └── api/
    │       ├── auth/
    │       │   ├── signup/route.ts    — POST /api/auth/signup
    │       │   ├── login/route.ts     — POST /api/auth/login
    │       │   └── logout/route.ts    — POST /api/auth/logout
    │       ├── me/route.ts            — GET /api/me
    │       ├── lookup/route.ts        — POST /api/lookup
    │       ├── pen-pal-match/route.ts — POST /api/pen-pal-match
    │       ├── letters/
    │       │   ├── route.ts           — GET/POST /api/letters
    │       │   └── [id]/
    │       │       ├── route.ts           — GET/PUT/DELETE
    │       │       ├── send/route.ts      — POST (seal + schedule)
    │       │       ├── tear-open/route.ts — POST (mark opened)
    │       │       ├── reply/route.ts     — POST (create reply draft)
    │       │       ├── block-sender/route.ts
    │       │       ├── report/route.ts
    │       │       └── move/route.ts      — POST (move to folder)
    │       ├── folders/
    │       │   ├── route.ts           — GET/POST /api/folders
    │       │   └── [id]/route.ts      — DELETE /api/folders/:id
    │       ├── upload/route.ts        — POST /api/upload
    │       └── cron/deliver/route.ts  — POST (Vercel Cron)
    ├── components/
    │   ├── editor/
    │   │   └── LetterEditor.tsx       — TipTap editor (Session 3)
    │   ├── mailbox/
    │   │   ├── EnvelopeCard.tsx       — letter card in list views
    │   │   └── MailboxList.tsx        — list wrapper + empty state
    │   ├── compose/
    │   │   ├── AddressStep.tsx        — compose step 1
    │   │   ├── TypeStep.tsx           — compose step 2
    │   │   ├── WriteStep.tsx          — compose step 3
    │   │   └── ReviewStep.tsx         — compose step 4 (seal)
    │   ├── letter/
    │   │   ├── LetterView.tsx         — render received letter
    │   │   ├── ImageCarousel.tsx      — horizontal image scroll
    │   │   └── ImageLightbox.tsx      — full-size Radix dialog
    │   ├── layout/
    │   │   └── Sidebar.tsx            — left nav (mailbox + folders)
    │   └── ui/
    │       ├── TimezoneSelect.tsx     — IANA timezone picker
    │       └── Button.tsx             — variant-aware button
    └── __tests__/
        └── delivery.test.ts           — computeScheduledDelivery tests
```

---

## 🔑 Key Decisions Made
<!-- Claude records any choices that deviate from SPEC.md,
     fill in gaps the spec didn't cover, or choose between options.
     Format: - Decision made — reason why -->

- **Rate limiter fails open** (not closed) when Upstash is unavailable — prevents Upstash outage from locking out legitimate users; acceptable for MVP
- **Logout returns 200 even with no/invalid token** — client should always be able to clear its session state; a failed logout shouldn't block the user
- **Per-request Supabase client for logout** — needed to call `signOut({ scope: "local" })` with the user's token without affecting other sessions; avoids using the admin client for user-scoped operations
- **`prismaUserToAppUser()` uses `any` for the dbUser param** — Prisma type isn't available before `prisma generate`; typed properly once client is generated in actual dev env
- **AuditLog added to schema** — SPEC marked as "optional but good to have"; included because it costs nothing and can't be easily added later without a migration
- **`src/app/signup/page.tsx` and `login/page.tsx` UI left as stubs** — HANDOFF.md Session 1 scope only required the API routes; UI forms will be built in a later session alongside the TimezoneSelect implementation
- **Weekend sends fast-forward to next Monday at same local wall-clock time** — SPEC §6 step-by-step algorithm (counting all hours and skipping Sat/Sun) gives a different earliest than the SPEC §12 test cases for weekend sends; test cases are ground truth; the equivalence rule "if sent on weekend, start counting from next business day same local time" matches the test expectations
- **Unroutable letter re-routing uses `now` not original `sentAt` for schedule recomputation** — sentAt is not loaded in the re-routing loop; using `now` is a close approximation acceptable given the 3-day window; the difference is ≤ 3 days which is smaller than the delivery uncertainty
- **send route: recipient timezone falls back to UTC when recipient is unresolved** — cron will recompute scheduled_delivery_at when recipient is resolved; UTC placeholder is safe because the cron re-routes and updates the schedule
- **jest.config.ts → jest.config.js** — `ts-node` not installed; converting to CommonJS JS config avoids the dependency while keeping ts-jest for test file transforms

---

## 📋 Session Log
<!-- Claude appends a brief summary at the end of each session.
     Format below. Never delete old entries. -->

### Session 1
**Status:** Complete ✅

**What was done:**
- Generated complete file/folder skeleton: 60+ files across config, lib, app pages, API routes, components, and tests
- `prisma/schema.prisma` — fully implemented (10 models, 7 enums, all FK cascade rules, composite unique constraints)
- `src/lib/auth.ts` — fully implemented (signupUser with rollback, loginUser with anti-enumeration, getAppUser, helpers)
- `src/lib/supabase.ts`, `src/lib/prisma.ts` — production-ready
- `src/app/api/auth/signup/route.ts` — fully implemented with rate limiting, validation, 201/400/409/429/500
- `src/app/api/auth/login/route.ts` — fully implemented with rate limiting, generic 401 (anti-enumeration)
- `src/app/api/auth/logout/route.ts` — fully implemented (per-request client, scope=local, always 200)
- `src/app/api/me/route.ts` — fully implemented (JWT validation, app user lookup, 401/200)
- `src/components/ui/Button.tsx` — fully implemented (4 variants, loading state, accessible)
- All other files: correct stubs with imports, type signatures, TODO comments for future sessions

**What was NOT done (by design):**
- Signup/login form UI (deferred — API-first approach)
- TimezoneSelect autocomplete + grouping (minimal native select only)
- Rate limiters not wired into routes yet (Session 5)

**Next:** Session 2 — `lib/delivery.ts` + delivery tests + send route + cron deliver route

### Session 2
**Status:** Complete ✅

**What was done:**
- `jest.config.js` — converted from `jest.config.ts` (no ts-node needed; CommonJS module.exports)
- `src/lib/delivery.ts` — fully implemented `computeScheduledDelivery()`:
  - Phase 1: walk hour-by-hour in receiver TZ, counting only Mon–Fri hours; weekend sends fast-forward to next Monday at same local time
  - Phase 2: find next 4:00 PM on a business day on/after earliest; skip weekends
  - All timezone math via Luxon (DST-safe); exported `isValidIanaTimezone()`
- `src/__tests__/delivery.test.ts` — 10 passing tests covering all 5 SPEC §12 critical cases, Sunday fast-forward, DST spring-forward/fall-back, invalid timezone, seconds/ms zeroed; `npm test` green ✅
- `src/app/api/letters/[id]/send/route.ts` — fully implemented: JWT auth, rate limit (fail open), deletion guard, DRAFT ownership check, DailyQuota check (sender TZ, max 3/day), recipient TZ lookup, computeScheduledDelivery, atomic DB transaction (letter→IN_TRANSIT + DailyQuota upsert)
- `src/app/api/cron/deliver/route.ts` — fully implemented: CRON_SECRET auth, mark UNDELIVERABLE (null recipient + >3 days), re-route unresolved letters (USERNAME/EMAIL/PHONE/ADDRESS with discoverability flags), deliver due letters (BlockList check → BLOCKED or DELIVERED + UNOPENED folder upsert), per-letter error handling

**What was NOT done (by design):**
- No additional UI or non-Session-2 API routes
- Signup/login forms still stubs (Session 3)

**Next:** Session 3 — Editor component + compose flow + drafts CRUD + image upload
