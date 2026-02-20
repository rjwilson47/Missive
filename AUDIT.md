
Full Project Audit — Missive vs. SPEC.md
✅ Fully Implemented
§2-A Auth (core flow)

Username + password login via synthetic email pattern ({uuid}@users.mailbox.invalid)
Signup: temp email → update to synthetic email → create app User row → rollback on failure
Username resolves to supabase_user_id at login (anti-enumeration preserved)
IANA timezone validation via Luxon isValid
Rate limiting on signup/login (5 req/15 min per IP)
§2-B Compose letter

Typed, handwritten, voice (disabled "coming soon") letter types
Up to 10 images, 5MB each, 25MB total — enforced client and server
HEIC → JPG via Sharp (wrapped in try-catch, graceful degradation with user-friendly error)
EXIF strip via Sharp .rotate()
300px thumbnail generation
Sequential image upload to avoid partial failures
§2-C Intentional friction

No subject line anywhere
Copy/cut/paste and context menu blocked in editor during composition
Copy allowed on received letters (separate read-only render)
Letter cannot be deleted after sending (DELETE /api/letters/:id rejects if status ≠ DRAFT)
No sent folder (sender UI excludes IN_TRANSIT/DELIVERED letters where sender = me)
§2-D Sending / delivery

computeScheduledDelivery correctly counts 24 business-hours (Mon–Fri), then next 4 PM in receiver's TZ
All critical test cases have unit tests
DST handled correctly via Luxon
§2-E Addressing / routing

Username, email, phone, address routing all implemented
Anti-enumeration: POST /api/lookup always returns "If an account exists, we'll route it." regardless of result
Discoverability flags respected for email/phone/address routing
Rate limiting on lookup (10 req/hr per IP)
§2-F Mailboxes / folders

UNOPENED / OPENED / DRAFTS system folders
Custom folders (up to 30 enforced)
Folder name max 30 chars
Move opened letters to custom folders (POST /api/letters/:id/move)
Tear-open envelope action sets opened_at, moves to OPENED folder (atomic transaction)
Delete folder: moves letters to OPENED in transaction
§2-G Reply

POST /api/letters/:id/reply creates draft pre-addressed to original sender
Stores in_reply_to reference
Reply blocked during deletion grace period
§2-H Pen Pal Matching

Timezone ±3 hour window matching
Region preference (SAME_REGION / ANYWHERE)
MatchHistory prevents duplicate pairs (sorted UUID pattern)
Creates pre-addressed draft for requester
Rate limited (5 req/hr per user)
§2-I Reporting / blocking

POST /api/letters/:id/block-sender — upserts BlockList, idempotent
Blocked sender never notified (cron marks letter BLOCKED silently)
POST /api/letters/:id/report — creates Report record for admin review
Safety page (/safety) implemented
§2-J Automated checks

No paid moderation services
Strict MIME type + file size validation (client + server)
scanUpload() placeholder hook present
Upstash Redis rate limiting on all sensitive endpoints
§2-K Account deletion (partial — see ⚠️)

POST /api/me/delete — sets markedForDeletionAt, idempotent
POST /api/me/cancel-delete — clears markedForDeletionAt, idempotent
Grace-period restrictions enforced in API routes (send, pen-pal-match, username change, add identifiers)
User can log in, view letters, cancel deletion during grace period
§2-L Username changes

PUT /api/me validates + updates username
Prisma P2002 handled with user-friendly error ("Username already taken")
Username change blocked during deletion grace period
Letters use userId (not username) for routing — no cascading changes needed
§2-M Unroutable addressing

Letter sends succeed UX-wise even with unresolvable recipient
recipientUserId = null + status = IN_TRANSIT
Cron re-attempts routing each run
Marked UNDELIVERABLE after 3 days — invisible to sender (no sent folder)
§4 Tech stack — Next.js 14 App Router, TypeScript, Tailwind, Supabase Auth, Prisma, Supabase Storage, Upstash Redis, Vercel Cron, Sharp, Luxon — all correct.

§5 Data model — All tables present: User, UserIdentifier, Letter, LetterImage, Folder, LetterFolder, BlockList, Report, DailyQuota, MatchHistory. All FK cascade rules implemented. @@unique on MatchHistory and UserIdentifiers. sorted UUID pattern for MatchHistory pairs.

§6 Delivery cron

POST /api/cron/deliver protected by CRON_SECRET header
5-minute Vercel cron configured in vercel.json
Three-phase logic: UNDELIVERABLE → re-route → deliver
BlockList check before delivery
Per-letter error handling (doesn't abort full run)
§7 Editor (partial — see ⚠️/❌)

TipTap configured with Document, Paragraph, Text, Italic only
Copy/paste/context-menu blocked during composition
ProseMirror JSON stored in typed_body_json
4–6 stationery fonts available for selection
Read-only TipTap render for received letters (no copy blocking)
Draft autosave debounced 2–3 seconds
§8 UX — Minimal Notion-like style, envelope card list view, left sidebar with all required nav items, compose flow (Address → Type → Write → Review), carousel + lightbox, settings page comprehensive.

§9 Security — Service role for all DB ops, all queries scoped by session userId, 401 before DB query, signed URLs server-side with 1hr expiry, private storage bucket, no RLS (correct per spec), no trusted client-provided userId.

§10 Pages/routes — All required pages and API routes implemented.

§14 Code quality — JSDoc/TSDoc docblocks on all exports, inline comments, section headers in complex files.

§15 README — Comprehensive README with all 11 required sections.

⚠️ Partially Implemented
§2-A Recovery email

recovery_email stored in DB ✅
Supabase auth email update when recovery email set: not visible in audit — PUT /api/me doesn't appear to call supabase.auth.admin.updateUserById() to sync the Supabase auth email. The spec explicitly requires this for password reset emails to work.
No UI in settings to add/change recovery email — Settings page has no recovery email input field.
No "Forgot password" link on login page — Login page has no forgot-password flow.
§2-D Sending — field name mismatch (CRITICAL)

computeScheduledDelivery is correct ✅
POST /api/letters/:id/send fails at runtime: updates Letter using camelCase Prisma field names that don't match the schema:
sentAt          → should be sent_at
scheduledDeliveryAt → should be scheduled_delivery_at
senderRegionAtSend  → should be sender_region_at_send
senderTimezoneAtSend → should be sender_timezone_at_send

Every send attempt throws a Prisma runtime error. No letters ever reach IN_TRANSIT status.
§2-D Sending — DailyQuota field name mismatch (CRITICAL)

Schema field is sent_count, code uses sentCount throughout send/route.ts
quotaRecord.sentCount is always undefined → quota is never enforced
upsert increment uses sentCount: { increment: 1 } → quota counter never increments
§2-K Account deletion — 30-day actual deletion

Grace period initiation and cancellation: ✅
Restrictions during grace: ✅
Actual deletion after 30 days: ❌ The delivery cron does NOT implement deleting accounts where markedForDeletionAt <= now - 30 days. The send route comments note this is "out of MVP scope" — but the spec requires it.
§7 Font selection

WriteStep.tsx passes font={font} to LetterEditor
LetterEditor expects fontFamily prop
Font selection never applies to the editor — the editor always renders in its default font regardless of selection.
§7 Italic toolbar button

TipTap Italic extension loaded ✅
No visible italic toolbar button rendered in the editor UI
Only keyboard shortcut (Cmd/Ctrl+I) would work — not discoverable by users
SPEC §8-F requires: "Italic toggle button has aria-pressed state"
§2-D Review step delivery estimate

compose/page.tsx always passes scheduledDeliveryAt={null} to ReviewStep
ReviewStep shows "Will arrive in 1–5 business days" (generic fallback) instead of the actual computed delivery time ("Will arrive Wednesday, Feb 21 at 4:00 PM")
The computeScheduledDelivery result is never passed to the ReviewStep
§2-H Pen Pal — isPenPalEligible

compose/page.tsx hardcodes isPenPalEligible={true} for AddressStep
Should read from the session user's availableForPenPalMatching flag
Users who have opted OUT of pen pal matching still see the "Write to a stranger" button
§2-B Handwritten image removal

Client-side: removes image from UI state ✅
No API call to delete image from Supabase Storage when user removes a handwritten photo during composition
Orphaned images accumulate in storage
§8-C Typed letter character counter

SPEC requires showing a character counter and enforcing 50,000 char limit on client
Server-side enforcement: need to verify in PUT /api/letters/:id
Client-side counter: not observed in WriteStep
❌ Not Implemented
§2-A Forgot password flow

No /forgot-password page
No "Forgot password?" link on login page
No POST /api/auth/forgot-password route
SPEC §2-A: "If recovery_email is set, allow 'Forgot password'… If not set, show 'Add a recovery email in Settings to enable password reset.'"
§2-A Recovery email UI

Settings page has no field to add/change recovery email
SPEC §8-E: "Manage UserIdentifiers (add/remove email/phone/address)" — this is implemented, but recovery email (separate from routing identifiers) has no UI
§2-K Actual 30-day account deletion by cron

The delivery cron does not scan for accounts where markedForDeletionAt <= now - 30 days and delete them
Received letters are never actually deleted; sent letters are never preserved through cascade
This is a core spec requirement for §K (SPEC §2-K)
§12 Integration tests

Only unit tests for computeScheduledDelivery exist
All 7 required integration test scenarios are missing:
Send 3 letters → 4th rejected
Send letter → advance time → cron → letter delivered
Block sender → future letters silently blocked
Delete account → wait 30 days → mailbox destroyed, sent letters remain
Cancel deletion → account restored
Reply creates correct draft
Pen pal match → cannot match again
§9 Authorization test coverage

No tests verifying User A cannot read User B's letters
No tests for cross-user draft deletion prevention
No tests for cross-user folder operations
🔀 Implemented Differently Than Spec
§2-A Signup — email update timing

SPEC: create with temp email, immediately update to {uuid}@users.mailbox.invalid
Implemented: uses signupUser() abstraction (need to verify exact flow in lib/auth.ts), but appears functionally equivalent
§5 LetterImage — field casing

Schema mixes camelCase (mimeType) with snake_case (size_bytes, order_index, storage_path, thumbnail_path)
SPEC lists all as snake_case (mime_type, etc.)
Doesn't break functionality (Prisma generated client matches schema) but inconsistent with spec naming
§8-D Carousel — no thumbnail strip

SPEC: "No thumbnail strip below main image (keep UI minimal)" — implemented correctly ✅
Counter shown (optional per spec) ✅
§2-F Folder deletion confirmation

SPEC: "Show confirmation: 'This folder contains X letters. They will be moved to Opened.'"
Implemented: confirmation shown client-side in folder/[id]/page.tsx ✅
API returns count of moved letters ✅
🧪 Untested / No Test Coverage
Delivery computation edge cases:

Thursday 4pm → Friday 4pm (exact 4pm boundary — delivers same day, not next)
DST transitions (spring forward / fall back) — Luxon handles automatically but untested
Auth flows:

Rollback on signup failure (orphaned Supabase auth user cleanup)
Login with wrong password (anti-enumeration preserved)
Session expiry handling
Rate limiting:

Upstash fail-open behavior (no Redis connection → request passes)
Rate limit boundary conditions (exactly 5th vs 6th attempt)
File upload:

HEIC graceful degradation when libheif unavailable (code path exists, untested)
Sequential upload abort behavior (partial upload recovery)
25MB total limit boundary
Pen pal matching:

No eligible matches → correct error response
DST-affected timezone offset calculation
Cron delivery:

BlockList check correctly blocks delivery
UNDELIVERABLE transition after exactly 3 days
Re-routing of previously unresolvable letters when recipient adds identifier
Priority Order for Fixing
🔴 Critical Blockers (app is broken without these)
src/app/api/letters/[id]/send/route.ts — Prisma field name mismatch
Fix: rename sentAt → sent_at, scheduledDeliveryAt → scheduled_delivery_at, senderRegionAtSend → sender_region_at_send, senderTimezoneAtSend → sender_timezone_at_send in the Prisma update call.

src/app/api/letters/[id]/send/route.ts — DailyQuota sentCount → sent_count
Fix: rename all occurrences of sentCount to sent_count in the DailyQuota select, compare, upsert, and create calls.

src/components/compose/WriteStep.tsx — font prop → fontFamily
Fix: change <LetterEditor font={font} to <LetterEditor fontFamily={font}.

🟠 High Priority (spec requirements, user-facing gaps)
Italic toolbar button missing — Add a visible italic toggle button with aria-pressed to LetterEditor toolbar.

ReviewStep delivery estimate — Pass computed scheduledDeliveryAt from compose/page.tsx state into ReviewStep. Requires calling computeScheduledDelivery with the addressed recipient's timezone during address/review steps.

isPenPalEligible hardcoded — Read from me.availableForPenPalMatching in compose/page.tsx and pass the real value to AddressStep.

Recovery email UI in Settings — Add a recovery email input field to settings/page.tsx with the spec-required warning ("Make sure this email is correct…").

Forgot password flow — Add /forgot-password page + POST /api/auth/forgot-password route. Check if recovery_email set; if yes, trigger Supabase reset; if no, show "Add a recovery email in Settings."

Recovery email → Supabase auth email sync — In PUT /api/me (or dedicated recovery-email route), call supabase.auth.admin.updateUserById() to keep Supabase auth email in sync when recovery_email is updated.

30-day account deletion in cron — Add a phase to POST /api/cron/deliver that deletes accounts (and their received letters/drafts) where markedForDeletionAt <= now - 30 days.

🟡 Medium Priority (quality / completeness)
Handwritten image server-side delete — When user removes a handwritten photo in WriteStep, call DELETE /api/upload (or similar) to remove from Supabase Storage.

Client-side character counter — Add character count display in WriteStep for typed letters, with 50,000 char enforcement. Also verify server enforces this in PUT /api/letters/:id.

Integration tests — Implement the 7 required integration test scenarios from SPEC §12.

🟢 Low Priority (polish / nice-to-have)
Authorization tests — Add cross-user access prevention tests (§9 test coverage checklist).

Signup flow verification — Confirm signupUser() lib function correctly creates temp email, updates to synthetic email, and rolls back on failure.

letters/route.ts folder query field check — Verify GET /api/letters queries Folder using correct system_type field name (not systemType).

Session Estimate
Priority	Items	Estimated Sessions
Critical blockers (1–3)	3 targeted fixes	0.5 sessions (30 min each, simple find/replace)
High priority (4–10)	7 features	2–3 sessions
Medium priority (11–13)	3 items	1–2 sessions
Low priority (14–16)	3 items	0.5 sessions
Total		~4–6 sessions
The critical blockers (#1–3) are all surgical fixes (wrong property names) — each is under 10 lines of change. High-priority items involve new UI components (forgot password, recovery email) and wiring existing computed values to components. Integration tests are the largest effort.

Spec Conflicts and Ambiguities
Recovery email vs. UserIdentifier email: SPEC §2-A describes recovery_email (for password reset only, never used for routing). SPEC §2-E describes EMAIL UserIdentifiers (for letter routing). These are separate — recovery email is NOT a routing identifier. But SPEC §8-E says "Manage UserIdentifiers (add/remove email/phone/address)" without mentioning recovery email separately. This creates UI confusion: the Settings page needs two distinct email sections. Recommendation: clearly label them "Recovery email (for password reset only)" and "Routing identifiers (for receiving letters)."

computeScheduledDelivery called when?: The spec says "compute scheduled_delivery_at" at send time (§6). But to show "Will arrive Wednesday Feb 21 at 4:00 PM" in the ReviewStep (§8-C), the computation must happen before send — requiring the recipient's timezone to be known at review time. If the recipient is unresolvable (email/phone/address with unknown user), their timezone is unknown, and the delivery estimate cannot be computed. The spec says to always accept sends (§2-M) but also always show a delivery estimate (§8-C/D). Recommendation: show a generic "1–5 business days" estimate when recipient timezone is unknown, and the actual date when routing to a known username.

Folder case-insensitive uniqueness: SPEC §2-F says "enforce unique names per user (case-insensitive)" but the schema and API don't appear to enforce case-insensitive folder name uniqueness. Need to verify whether POST /api/folders normalizes names before the unique check.

DailyQuota.date format vs. timezone: SPEC says quota is based on "sender's local date at send time." The schema stores date as a DATE field. The send route must compute the sender's local date correctly using their timezone at the moment of sending — not UTC date. This is correct in design but the sent_count bug means it was never actually running, so this logic is unverified in practice.

Signed URL authorization for sender: SPEC §9 says "Sender can never request signed URLs for any letter images once sent." The GET /api/letters/:id route returns 404 for letters where sender = me and status ≠ DRAFT — which prevents signed URL generation for senders. This is correct but means senders can't preview their own DRAFT images via the same endpoint that generates signed URLs. The draft view must use a different mechanism — worth verifying.
