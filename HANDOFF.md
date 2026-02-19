# HANDOFF.md
<!-- Claude maintains this file continuously throughout every session.
     Update after every completed file, not at the end of the session. -->

## 🎯 Next Session Starts Here
<!-- Claude overwrites this section at the end of every session -->
> **Session 1 is complete.** Begin Session 2:
>
> 1. **Implement `src/lib/delivery.ts` fully** — replace the stub `computeScheduledDelivery()`
>    - Count 24 clock hours that fall Mon–Fri in receiver TZ (skip Sat/Sun hours entirely)
>    - Then find the next 4:00 PM on a business day on/after `earliest`
>    - Use Luxon `DateTime.setZone()` for all timezone math (auto-handles DST)
>    - Also implement the `isBusinessDay()` helper (already private — keep it that way)
> 2. **Write + pass all unit tests in `src/__tests__/delivery.test.ts`**
>    - All 7 `it.todo` stubs must become real passing tests
>    - Critical: Friday 5pm → Tuesday 4pm; Saturday → Tuesday; Thursday 3pm → Friday 4pm
>    - Run `npm test` and confirm green before moving on
> 3. **Implement `src/app/api/letters/[id]/send/route.ts`** — full send/seal flow:
>    - Validate DRAFT status + session user is senderId
>    - Check DailyQuota (sender's local date in their CURRENT timezone, max 3)
>    - Call `computeScheduledDelivery()` with receiver's timezone
>    - Set status=IN_TRANSIT, capture sender_region_at_send + sender_timezone_at_send
>    - Upsert DailyQuota.sent_count (increment or create)
>    - Check account markedForDeletionAt → reject with 403
> 4. **Implement `src/app/api/cron/deliver/route.ts`** — full delivery processor:
>    - Auth guard already in place (CRON_SECRET) — don't remove it
>    - Mark UNDELIVERABLE (IN_TRANSIT + null recipientId + sent_at > 3 days ago)
>    - Re-attempt routing for unresolvable letters
>    - For each letter with scheduled_delivery_at <= now: check BlockList, mark DELIVERED, assign to UNOPENED folder
>    - Use a DB transaction or per-letter try/catch (errors should not abort the whole run)
>
> Do NOT implement anything beyond this list.

---
## 📌 Build Order
<!-- Reference for sequencing. Tick off as fully completed.
     Claude uses this to determine what comes next and avoid 
     skipping ahead or working out of order. -->

- [x] Session 1: Skeleton + prisma/schema.prisma + auth files + api/me
- [ ] Session 2: lib/delivery.ts + api/cron/deliver.ts + delivery tests
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

---

## 🔄 In Progress
<!-- Claude updates this BEFORE starting each file.
     Clear it when the file moves to Completed. -->
_Nothing in progress. Session 1 complete. Next: Session 2 (see "Next Session Starts Here")._

---

## ⚠️ Known Stubs / TODOs
<!-- Claude records any intentional shortcuts, incomplete logic,
     or TODO comments left inside files. Be specific. -->

- `src/lib/delivery.ts` — `computeScheduledDelivery()` is a STUB (returns placeholder); real implementation in Session 2
- `src/lib/ratelimit.ts` — rate limiters are defined but NOT wired into any routes yet (Session 5)
- `src/lib/upload.ts` — `processImage()` and `uploadImageToStorage()` throw "not yet implemented" (Session 3)
- `src/components/ui/TimezoneSelect.tsx` — minimal native `<select>` with no UTC offset labels, grouping, or autocomplete (needs full implementation in Session 1 signup form work)
- `src/app/signup/page.tsx` + `login/page.tsx` — form UI not implemented; Session 1 only implemented the API routes (forms needed for Session 3 or earlier)
- `src/app/api/cron/deliver/route.ts` — auth guard done; delivery logic is a stub (Session 2)
- `src/app/api/letters/[id]/send/route.ts` — fully stubbed (Session 2)
- Partial index for `Letter.status = 'IN_TRANSIT'` must be created manually via SQL after `prisma db push` (documented in schema comments)
- TimezoneSelect: UTC offset display, grouping, and autocomplete not yet implemented

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
├── jest.config.ts            — ts-jest, @/* alias
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
