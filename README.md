# Missive

> Slow mail for the modern age. Write letters, seal them, and wait for delivery.

---

## 1. Project Overview

Missive is a web application that simulates old-fashioned letter writing. It is intentionally slow and frictionful — the opposite of email or instant messaging.

### Core philosophy

- **Write** a typed letter (with a choice of stationery fonts, italics only — no copy/paste allowed during composition) or upload photos of handwritten pages.
- **Seal** the envelope. Once sent, letters are immutable — no edits, no recalls.
- **Wait** — letters take at least 24 business hours to arrive, delivered at 4:00 PM in the recipient's timezone.
- **Tear open** the sealed envelope to reveal the contents.
- **Reply** to start a conversation the old-fashioned way.

### Key MVP features

| Feature | Details |
|---|---|
| Auth | Username + password; no email shown in UI; Supabase Auth under the hood |
| Compose | Typed (TipTap) or handwritten (photo upload); up to 10 images / 25MB |
| Delivery delay | 24 business hours (Mon–Fri) + next 4 PM in recipient's timezone |
| Mailboxes | Unopened / Opened / Drafts + up to 30 custom folders |
| Pen pal matching | Opt-in stranger matching by timezone (±3 hours) + region preference |
| Blocking & reporting | Silent blocking; report letters for admin review |
| Rate limiting | Upstash Redis (send: 5/hr; lookup: 10/hr; auth: 5/15 min) |
| Account deletion | 30-day grace period |

---

## 2. Architecture Summary

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (username + password via synthetic email) |
| Database | Supabase Postgres + Prisma ORM |
| Storage | Supabase Storage (private bucket) |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` |
| Background jobs | Vercel Cron (every 5 minutes) |
| Image processing | Sharp (EXIF strip, resize, HEIC→JPEG, thumbnail) |
| Timezone math | Luxon |
| Editor | TipTap (ProseMirror) |

### High-level system design

```
Browser
  │
  ├── GET /api/me         — authenticate every page load (localStorage token)
  ├── POST /api/letters   — create draft
  ├── PUT  /api/letters/:id — autosave draft
  ├── POST /api/letters/:id/send — seal + schedule delivery
  │
  └── Vercel Cron (*/5 min)
        └── POST /api/cron/deliver
              ├── Mark UNDELIVERABLE (null recipient + >3 days)
              ├── Re-route unresolved letters (lookup by email/phone/address)
              └── Deliver due letters (BlockList check → DELIVERED or BLOCKED)
```

### Delivery scheduler concept

When a letter is sent, `computeScheduledDelivery(sentAtUTC, receiverTimezone)` is called:
1. **Count 24 business hours** — walks hour-by-hour in receiver TZ, skipping Saturday/Sunday.
2. **Find next 4 PM** — on or after the earliest delivery time, on a business day.
3. **Skip weekends** — if the resulting 4 PM falls on Sat/Sun, push to next Monday 4 PM.

All math uses Luxon for DST-correct timezone handling.

---

## 3. File Structure Guide

```
/
├── package.json               — all dependencies
├── tsconfig.json              — TypeScript strict mode, @/* path alias
├── next.config.ts             — Sharp as server-side external
├── tailwind.config.ts         — paper/ink color palette, stationery font vars
├── jest.config.js             — ts-jest, @/* alias
├── vercel.json                — Vercel Cron every 5 minutes
├── .env.local.example         — all required env vars with explanations
├── prisma/
│   └── schema.prisma          — 10 models, 7 enums, all FK cascades
└── src/
    ├── types/index.ts         — all shared TS types (AppUser, LetterDetail, etc.)
    ├── lib/
    │   ├── prisma.ts          — singleton PrismaClient (dev hot-reload safe)
    │   ├── supabase.ts        — anon + admin clients, getUserFromHeader()
    │   ├── auth.ts            — signupUser(), loginUser(), getAppUser()  ← AUTH LOGIC
    │   ├── delivery.ts        — computeScheduledDelivery()              ← DELIVERY LOGIC
    │   ├── ratelimit.ts       — Upstash rate limiter instances           ← RATE LIMITING
    │   └── upload.ts          — processImage(), uploadImageToStorage()  ← IMAGE PROCESSING
    ├── app/
    │   ├── page.tsx           — landing page (/)
    │   ├── signup/page.tsx    — signup form
    │   ├── login/page.tsx     — login form
    │   ├── safety/page.tsx    — static safety/blocking info page
    │   ├── app/
    │   │   ├── layout.tsx             — server component → AppShell (auth guard)
    │   │   ├── unopened/page.tsx      — received, not yet opened
    │   │   ├── opened/page.tsx        — opened mailbox
    │   │   ├── drafts/page.tsx        — draft list
    │   │   ├── folder/[id]/page.tsx   — custom folder view
    │   │   ├── compose/page.tsx       — 4-step compose flow
    │   │   ├── letter/[id]/page.tsx   — letter detail + tear-open
    │   │   └── settings/page.tsx      — all settings sections
    │   └── api/
    │       ├── auth/{signup,login,logout}/route.ts
    │       ├── me/route.ts                 — GET + PUT profile
    │       ├── me/identifiers/route.ts     — GET + POST identifiers
    │       ├── me/identifiers/[id]/route.ts — DELETE identifier
    │       ├── me/delete/route.ts          — POST initiate deletion
    │       ├── me/cancel-delete/route.ts   — POST cancel deletion
    │       ├── lookup/route.ts             — POST anti-enumeration lookup
    │       ├── pen-pal-match/route.ts      — POST match with stranger
    │       ├── letters/route.ts            — GET list + POST create draft
    │       ├── letters/[id]/route.ts       — GET detail + PUT update + DELETE
    │       ├── letters/[id]/send/route.ts  — POST seal + schedule       ← QUOTA LOGIC
    │       ├── letters/[id]/tear-open/route.ts
    │       ├── letters/[id]/reply/route.ts
    │       ├── letters/[id]/block-sender/route.ts
    │       ├── letters/[id]/report/route.ts
    │       ├── letters/[id]/move/route.ts
    │       ├── folders/route.ts            — GET + POST folders
    │       ├── folders/[id]/route.ts       — DELETE folder
    │       ├── upload/route.ts             — POST image upload
    │       └── cron/deliver/route.ts       — POST delivery cron         ← CRON LOGIC
    └── components/
        ├── editor/LetterEditor.tsx         — TipTap with copy/paste blocking
        ├── mailbox/{EnvelopeCard,MailboxList}.tsx
        ├── compose/{AddressStep,TypeStep,WriteStep,ReviewStep}.tsx
        ├── letter/{LetterView,ImageCarousel,ImageLightbox}.tsx
        ├── layout/{AppShell,Sidebar}.tsx
        └── ui/{Button,TimezoneSelect}.tsx
```

**Where key logic lives:**

| Concern | File |
|---|---|
| Delivery scheduling | `src/lib/delivery.ts` → `computeScheduledDelivery()` |
| Daily quota (3/day) | `src/app/api/letters/[id]/send/route.ts` |
| Editor restrictions | `src/components/editor/LetterEditor.tsx` (keydown/paste/contextmenu handlers) |
| Auth flow | `src/lib/auth.ts` (signupUser, loginUser, getAppUser) |
| Image processing | `src/lib/upload.ts` (processImage, uploadImageToStorage, getSignedUrl) |
| Delivery cron | `src/app/api/cron/deliver/route.ts` |
| Rate limiting | `src/lib/ratelimit.ts` |

---

## 4. Local Development Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- An Upstash Redis database (free tier is fine)
- npm or pnpm

### Installation steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd missive

# 2. Install dependencies
npm install

# 3. Copy the environment variable template
cp .env.local.example .env.local

# 4. Fill in .env.local (see Environment Variables below)
#    You will need: Supabase URL, anon key, service role key,
#    database URL, Upstash Redis URL + token, and a CRON_SECRET.

# 5. Generate the Prisma client
npx prisma generate

# 6. Push the schema to your Supabase Postgres database
npx prisma db push

# 7. (Optional but recommended) Create the partial index for cron performance
#    Run this SQL in the Supabase SQL editor:
#    CREATE INDEX IF NOT EXISTS idx_deliverable_letters
#    ON "Letter"(status, scheduled_delivery_at)
#    WHERE status = 'IN_TRANSIT';

# 8. Start the development server
npm run dev
```

The app will be running at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in each value:

| Variable | Description | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**server-side only**, never expose) | Supabase Dashboard → Project Settings → API |
| `DATABASE_URL` | Postgres connection string for Prisma | Supabase Dashboard → Project Settings → Database → Connection string |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: `letters-images`) | You create this — see Storage Setup below |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Upstash Console → your database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Upstash Console → your database → REST API |
| `CRON_SECRET` | Secret to authenticate the cron endpoint | Generate with: `openssl rand -hex 32` |

> **Note:** Variables prefixed `NEXT_PUBLIC_` are exposed to the browser. Never put secrets in `NEXT_PUBLIC_` variables.

### Running tests

```bash
npm test
```

This runs the Jest test suite, which covers `computeScheduledDelivery()` with all SPEC §12 critical test cases.

---

## 5. Database & Prisma

### Schema overview

The Prisma schema (`prisma/schema.prisma`) defines 10 models:

| Model | Purpose |
|---|---|
| `User` | App user record (linked to Supabase auth via `supabase_user_id`) |
| `UserIdentifier` | Optional email/phone/address for routing letters |
| `Letter` | Core letter entity (DRAFT → IN_TRANSIT → DELIVERED) |
| `LetterImage` | Images attached to a letter (stored in Supabase Storage) |
| `Folder` | System + custom folders per user |
| `LetterFolder` | Maps a letter to exactly one folder (UNIQUE on `letterId`) |
| `BlockList` | Records a user blocking a sender |
| `Report` | Records a user reporting a letter |
| `DailyQuota` | Tracks daily send count per user (max 3/day) |
| `MatchHistory` | Tracks pen pal matches to prevent duplicate pairs |

### Migration workflow

Missive uses `prisma db push` (schema-first, no migration files). This is suitable for the MVP development pace:

```bash
# After any schema change:
npx prisma generate  # regenerate Prisma Client
npx prisma db push   # sync schema to DB (destructive changes prompt warning)
```

For production, consider switching to `prisma migrate dev` / `prisma migrate deploy` for a tracked migration history.

### Partial index (manual step required)

Prisma does not support partial indexes natively. After `prisma db push`, run this SQL in the Supabase SQL editor to optimize the cron delivery query:

```sql
CREATE INDEX IF NOT EXISTS idx_deliverable_letters
ON "Letter"(status, scheduled_delivery_at)
WHERE status = 'IN_TRANSIT';
```

### Reset / seed

There are no seed files in the MVP. To reset the database:

```bash
# WARNING: this drops and recreates all tables
npx prisma db push --force-reset
```

---

## 6. Storage Setup

Missive stores all letter images in a **private** Supabase Storage bucket. Images are never publicly accessible — signed URLs with 1-hour expiry are generated server-side.

### Create the bucket

1. Go to your Supabase Dashboard → Storage.
2. Click **New bucket**.
3. Name it `letters-images` (or whatever you set in `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`).
4. **Set the bucket to Private** (toggle off "Public bucket").
5. Click **Create bucket**.

### Permissions

No RLS policies are needed on the storage bucket. The API routes use the service role key (`SUPABASE_SERVICE_ROLE_KEY`) which bypasses RLS for all storage operations. This is secure because:
- All API routes verify the user's JWT before any DB or storage access.
- Signed URLs are only generated after verifying the requesting user is authorized to view the letter.

### Signed URL strategy

- Signed URLs are generated at page load time with a **1-hour expiry**.
- If a user has a letter open for more than an hour, images will stop loading. They can refresh the page to get fresh URLs.
- This is an intentional MVP trade-off. V2 could refresh URLs client-side before expiry.

---

## 7. Deployment (Vercel)

### Step-by-step

1. **Push your code** to a GitHub repository.

2. **Import the project** into Vercel:
   - Go to [vercel.com](https://vercel.com) → Add New → Project.
   - Select your GitHub repository.
   - Framework preset: **Next.js** (auto-detected).

3. **Set environment variables** in Vercel:
   - Go to your project → Settings → Environment Variables.
   - Add all variables from `.env.local.example`.
   - For `DATABASE_URL`, use the **connection pooler URL** (port 6543) from Supabase for serverless compatibility. Format:
     ```
     postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
     ```

4. **Deploy** — Vercel will build and deploy automatically.

5. **Verify the cron job** is enabled:
   - Go to your project → Settings → Cron Jobs.
   - You should see `/api/cron/deliver` scheduled at `*/5 * * * *`.
   - If not, ensure `vercel.json` is present in your repository root.

### Build settings

The default Next.js build settings work without modification. Sharp is configured as a server-side external in `next.config.ts`.

### Database connection notes

- **Development:** Use the direct connection string (port 5432) in `.env.local`.
- **Vercel (serverless):** Use the **Transaction Pooler** URL (port 6543) to avoid connection pool exhaustion. Add `?pgbouncer=true&connection_limit=1` to the connection string.

---

## 8. Cron Jobs / Delivery Processor

### Purpose

The Vercel Cron job runs every 5 minutes and hits `POST /api/cron/deliver`. This endpoint:

1. **Marks UNDELIVERABLE** — letters with `status = IN_TRANSIT`, `recipientUserId = null`, and `sent_at ≤ now - 3 days` (recipient could never be resolved).

2. **Re-routes unresolved letters** — letters with `status = IN_TRANSIT` and `recipientUserId = null` that were sent to an email/phone/address the system couldn't find at send time. If the recipient has since registered with a matching identifier, the letter is routed and `scheduled_delivery_at` is updated.

3. **Delivers due letters** — letters with `status = IN_TRANSIT` and `scheduled_delivery_at ≤ now`:
   - Checks if the sender is blocked by the recipient → marks `BLOCKED` (silently).
   - Otherwise marks `DELIVERED`, sets `delivered_at`, and upserts the letter into the recipient's UNOPENED folder.

### Configuring Vercel Cron

The `vercel.json` file at the project root configures the cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/deliver",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Authentication

The cron endpoint is protected by a shared secret:

```
Authorization: Bearer <CRON_SECRET>
```

To test the endpoint manually:

```bash
curl -X POST https://your-app.vercel.app/api/cron/deliver \
  -H "Authorization: Bearer your-cron-secret"
```

Generate a strong secret with:

```bash
openssl rand -hex 32
```

### How delivery + send caps work

- **Send cap:** Max 3 letters per user per day, counted in the sender's current timezone. Checked in `POST /api/letters/:id/send` via the `DailyQuota` table.
- **No receive cap:** Recipients can receive unlimited letters.
- **Late delivery tolerance:** Vercel Cron runs every 5 minutes — deliveries can be up to ~5 minutes late, which is fine for slow mail.

---

## 9. Testing

### Run tests

```bash
npm test
```

### What is covered

The test suite (`src/__tests__/delivery.test.ts`) covers `computeScheduledDelivery()`:

| Test case | Spec §12 case |
|---|---|
| Monday 5pm → Wednesday 4pm | ✅ Critical |
| Monday 3pm → Tuesday 4pm | ✅ Critical |
| Friday 5pm → Tuesday 4pm | ✅ Critical (skip weekend) |
| Thursday 4pm → Friday 4pm | ✅ Critical (exact 4pm) |
| Saturday 10am → Tuesday 4pm | ✅ Critical (weekend start) |
| Sunday send → Monday start | ✅ |
| DST spring-forward | ✅ (Luxon handles automatically) |
| DST fall-back | ✅ (Luxon handles automatically) |
| Invalid timezone → throws | ✅ |
| Seconds/ms zeroed | ✅ |

### Manual QA checklist

- [ ] Sign up with a unique username, set timezone and region
- [ ] Log in with username + password
- [ ] Write a typed letter — verify copy/paste is blocked during composition
- [ ] Select a stationery font — verify it applies to the whole letter
- [ ] Toggle italic on selected text
- [ ] Attach images (up to 10, up to 25MB total)
- [ ] Send a letter to a username — letter enters "In transit", disappears from your view
- [ ] Run the cron job (`curl POST /api/cron/deliver`) — verify letter is delivered
- [ ] Recipient tears open envelope — content is visible
- [ ] Recipient clicks an image → opens in lightbox
- [ ] Recipient can copy text from a received letter
- [ ] Recipient clicks Reply → new draft pre-addressed to sender
- [ ] Send 4th letter in same day → rejected ("You've sent 3 letters today")
- [ ] Write to a stranger (pen pal match, if opted in) → draft pre-addressed
- [ ] Block a sender → future letters from them silently not delivered
- [ ] Report a letter → confirmed (no visible change, data stored)
- [ ] Create a custom folder → move an opened letter into it
- [ ] Delete a custom folder (with letters) → letters move to Opened
- [ ] Change username in Settings → still receive letters (uses userId, not username)
- [ ] Add routing identifier (email/phone/address) → discoverable via that identifier
- [ ] Initiate account deletion → 30-day grace period shown
- [ ] Cancel account deletion → restrictions removed

---

## 10. Troubleshooting

### Database connection issues

**Error:** `P1001: Can't reach database server`
- Check `DATABASE_URL` in `.env.local`.
- For Vercel, ensure you're using the **Transaction Pooler** URL (port 6543), not the direct connection (port 5432).
- Verify your Supabase project is not paused (free tier projects pause after inactivity).

**Error:** `P2021: Table does not exist`
- Run `npx prisma db push` to sync the schema.
- If tables still don't appear, run `npx prisma generate` first, then `npx prisma db push`.

### Cron not triggering

- Verify `vercel.json` exists at the project root and contains the cron configuration.
- In the Vercel dashboard, go to your project → Logs → Cron. Check for execution logs.
- Vercel Cron only runs on **Production** deployments, not preview deployments.
- Test manually: `curl -X POST https://your-app.vercel.app/api/cron/deliver -H "Authorization: Bearer <CRON_SECRET>"`.

### Rate limiting not working

- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set correctly.
- The app fails open on rate limiter errors — if Upstash is unavailable, requests are allowed through (a `console.warn` is logged).
- Check the Upstash console to confirm your database is active and the REST API credentials are correct.

### Images not loading

- Signed URLs expire after 1 hour. Refresh the page to get new URLs.
- Verify the storage bucket is set to **Private** in Supabase.
- Check that `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` matches the actual bucket name.
- If images were uploaded but signed URLs return errors, check `SUPABASE_SERVICE_ROLE_KEY` is set on the server.

### Upload errors / HEIC not working

- Sharp's HEIC support requires `libheif` at runtime. On Vercel, `libheif` is not available.
- HEIC images will return a 400 error with: "HEIC images are not supported. Please upload JPG or PNG."
- This is expected MVP behavior. For HEIC support in production, use an external image processing service (e.g., Cloudinary).

### Auth issues

- If login returns "Invalid username or password" despite correct credentials, check that `SUPABASE_SERVICE_ROLE_KEY` is set.
- The synthetic email format `{supabase_user_id}@users.mailbox.invalid` is used for Supabase auth — never shown to users.

---

## 11. Next Steps Checklist

### ☐ Vercel production setup

1. Create a Vercel account at [vercel.com](https://vercel.com).
2. Connect your GitHub repository.
3. Set all environment variables in Vercel → Settings → Environment Variables.
4. Use the **Transaction Pooler** URL for `DATABASE_URL` (see Deployment section).
5. Set `CRON_SECRET` to a 64-character random string (`openssl rand -hex 32`).
6. Deploy and verify the app loads, signup works, and the cron job appears in Vercel → Settings → Cron Jobs.

### ☐ Supabase project setup

1. Create a project at [supabase.com](https://supabase.com) (free tier: 500MB database, 1GB storage).
2. Note your **Project URL**, **anon key**, and **service role key** from Project Settings → API.
3. Copy the **connection string** from Project Settings → Database for `DATABASE_URL`.
4. Create the `letters-images` storage bucket (see Storage Setup).
5. Run `npx prisma db push` to create all tables.
6. Run the partial index SQL (see Database section).

### ☐ Prisma migrate/deploy workflow

For the MVP, `prisma db push` is used (no migration history). When you're ready to move to production-grade migrations:

```bash
# Switch to migration workflow
npx prisma migrate dev --name init      # create baseline migration
npx prisma migrate deploy               # apply in CI/CD or production
```

Consider setting up a separate Supabase branch for staging.

### ☐ Hardening auth/security

1. **Add CSRF protection** — Next.js App Router uses SameSite cookies by default; ensure your Supabase session handling respects this.
2. **Review rate limits** — the current limits are conservative. Adjust `identifierLookupLimiter`, `sendLimiter`, and `authLimiter` in `src/lib/ratelimit.ts` based on real usage.
3. **Add input sanitization** for user-supplied text fields (username, region) — currently these rely on DB constraints only.
4. **Consider RLS** — for V2, add Supabase Row Level Security policies if you plan to use client-side Supabase queries.
5. **Recovery email** — currently stored unverified in the `User.recovery_email` field but not surfaced in the UI. Build a Settings form field + Supabase password reset integration to complete this feature.

### ☐ Adding a moderation provider

The upload pipeline has a placeholder hook in `src/lib/upload.ts`:

```typescript
async function scanUpload(buffer: Buffer): Promise<void> {
  // TODO: integrate ClamAV or a cloud moderation API (e.g., AWS Rekognition)
}
```

To integrate ClamAV:
1. Add the `clamscan` npm package.
2. Replace the placeholder with actual scanning logic.
3. Throw an error if the scan detects malware — the upload route will return 400.

For cloud moderation (nudity/CSAM detection):
1. Use AWS Rekognition `DetectModerationLabels` or Google Vision SafeSearch.
2. Call the API after Sharp processing, before uploading to Supabase Storage.

### ☐ Enabling voice letters

Voice letters are architecturally prepared:

1. The `ContentType` enum includes `VOICE`.
2. `TypeStep.tsx` shows a disabled "Voice — coming soon" card.
3. To enable: add audio recording to `WriteStep.tsx` (use the Web Audio API or a library like `RecordRTC`), store audio files in Supabase Storage (similar to images), and add rendering in `LetterView.tsx`.

### ☐ Implementing priority postage

The delivery delay is hard-coded to 24 business hours. To add "priority" (faster delivery) as a future paid feature:

1. Add a `delivery_speed` enum to the `Letter` model: `STANDARD` (24h) | `EXPRESS` (8h) | `OVERNIGHT` (next 4 PM).
2. Pass the chosen speed to `computeScheduledDelivery()` and adjust the hour count accordingly.
3. Gate express/overnight behind a Stripe subscription check in the send route.

### ☐ Spam prevention upgrades

Current rate limits provide basic protection. For scale:

1. **IP-based reputation** — integrate IPQualityScore or similar to block known spam IPs at the rate limiter layer.
2. **Content moderation** — scan typed letter content with OpenAI Moderation API before sending.
3. **Account age gates** — require accounts to be N days old before using pen pal matching.
4. **Captcha on signup** — add Cloudflare Turnstile or hCaptcha to `POST /api/auth/signup`.

### ☐ Mobile / PWA evolution

1. Add a `manifest.json` and service worker to make the app installable as a PWA.
2. Add `meta viewport` and responsive breakpoints (most pages use `max-w-prose` / `max-w-2xl` which are already responsive).
3. Test swipe gestures in `ImageCarousel.tsx` — the current implementation uses arrow buttons only.
4. Consider a React Native wrapper (Expo) for a native app feel with push notifications (arrival alert).

---

*Missive is an MVP. The code is intentionally simple and direct. Build on top of it rather than refactoring prematurely.*
