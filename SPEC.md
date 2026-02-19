You are an expert full-stack engineer + product designer. Build an MVP web app that simulates old-fashioned letter writing, intentionally slow and frictionful, NOT like email/texting.
IMPORTANT: Deliver working code, not a concept doc. Create the full project with a minimal UI, database schema, auth, API routes, and background delivery scheduling.

Below are the project specs. Ask anything that needs clarifying or missing and list out any major assumptions made.
Include detailed inline comments and docblocks for all code. After generating the full source, generate a comprehensive README.md that explains how to navigate the files, how to set up the project locally, deploy it, run cron jobs, and where key logic lives.
In the README, include a checklist of next steps (vercel, Supabase, primsa) and detailed steps of what to do.



========================
PRODUCT SUMMARY ======================== App name (working): "Mailbox" Core idea: Users write "letters" (typed, photos of handwritten pages, or voice recordings) and "post" them. Letters take time to arrive: at least 24 business hours (Mon–Fri) after sending, then they become available at the next 4:00 PM in the RECEIVER's timezone. No subject lines.
The experience should feel like:
writing a letter
sealing an envelope
waiting for delivery
tearing it open
optionally replying
Minimal UI (Notion-like simplicity), mailbox metaphor (envelopes/cards), not email client.
======================== 
2) MVP SCOPE (DO THIS)
A) Auth (Supabase Auth) — username login without email
Users log in using username + password (UI only).
Internally, authentication uses Supabase email/password with a synthetic email derived from the Supabase user UUID, not the username, so username changes do not affect auth.
Synthetic email format: {supabase_user_id}@users.mailbox.invalid (or .invalid domain). This email is never displayed to the user.
Signup flow:
Create Supabase auth user (email/password) using a temporary placeholder email (e.g., temp-{uuid}@users.mailbox.invalid) OR create first and then immediately update email to {supabase_user_id}@users.mailbox.invalid.
Insert row into app User table with supabase_user_id, username, region, timezone.
User timezone/region validation:
Validate timezone against IANA timezone database (use luxon's DateTime.local().setZone(tz).isValid)
If invalid, show error: "Invalid timezone. Please select from the list."
Provide dropdown/autocomplete of valid IANA timezones (don't allow freeform text)
Store region as freeform text (e.g., "Victoria, AU") - no validation needed
Timezone dropdown implementation:
Use a timezone picker library (e.g., react-timezone-select) OR build custom dropdown
Display format: "City/Region (UTC±X)" for user clarity
  Examples:
"Australia/Melbourne (UTC+10)"  
"America/New_York (UTC-5)"
 "Europe/London (UTC+0)"
Group by region for better UX:
Americas
Europe  
Asia/Pacific
Africa
Middle East
Include only IANA canonical timezones (not deprecated aliases)
Source: use Intl.supportedValuesOf('timeZone') in browser OR import from luxon
Handle DST in labels dynamically: show current offset, not standard offset
 Example: "America/New_York (UTC-5)" in winter, "America/New_York (UTC-4)" in summer
Allow search/filter (autocomplete) for quick selection
Default to user's browser-detected timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
Signup implementation details:
Create Supabase auth user with temp-{randomUUID}@users.mailbox.invalid
Immediately update auth user email to {supabase_user_id}@users.mailbox.invalid
Then create app User record
If any step fails, rollback: delete Supabase auth user and throw error
Handle cleanup gracefully to prevent orphaned auth records
Login flow: resolve username -> supabase_user_id in app DB, compute synthetic email {supabase_user_id}@users.mailbox.invalid, then call Supabase signInWithPassword({ email: syntheticEmail, password }).
Username can change without touching Supabase auth email.
Optional recovery email: user may add a real email later in settings only for password recovery. It is stored in app DB (e.g., User.recovery_email, nullable). Login never uses it.
Password reset: if recovery_email is set, allow “Forgot password” to trigger Supabase password reset email to that recovery email (implementation can use Supabase reset flow but should not require recovery email for login). If not set, show “Add a recovery email in Settings to enable password reset.”
Recovery email is stored UNVERIFIED (user's responsibility to enter correctly). Show warning during input: "Make sure this email is correct. We cannot verify it, and this is your only way to reset your password." No email verification flow in MVP.
Recovery email integration: when user sets recovery_email, also update the Supabase auth user email to the same value using service role. This enables Supabase password reset emails. Email is never used for login UI. If recovery_email is set, Supabase auth email becomes the recovery email; otherwise it remains the synthetic UUID email. Login UI still uses username and never accepts email input.

B) Compose letter
Letter can be:
Typed letter (plain text only, but can select from 4–6 "stationery fonts"; italics allowed via toolbar toggle applying to selection; NO bold).
Letter content limits:
Typed letter: max 50,000 characters (approximately 10,000 words)
Enforce on client (show character counter) and server (reject if exceeded)
ProseMirror JSON should not exceed ~100KB after serialization
If user hits limit, show: "Letter is too long. Maximum 50,000 characters."
Handwritten letter photo pages (multiple images allowed; counts toward total image limit)
Voice letter (MVP: show as "Voice letters — coming soon" disabled UI; architect for future support)
Attach up to 10 images TOTAL per letter (this includes handwritten pages).
Constraints for MVP:
up to 5MB per image
up to 25MB total images per letter
accept JPG/PNG/HEIC; server converts HEIC to JPG at 85% quality using server-side conversion
HEIC conversion implementation:
Attempt conversion using Sharp with HEIF support (requires libheif at runtime)
On Vercel serverless, libheif may not be available (this is acceptable for MVP)
If Sharp.heif is unavailable or conversion fails:
 Return 400 error: "HEIC images are not supported. Please upload JPG or PNG."
 Log the error for debugging but don't expose internals to user
Implementation: wrap conversion in try-catch, check for specific Sharp HEIF errors
V2: consider using a separate image processing service (Cloudinary, imgix) for HEIC support
strip EXIF data (GPS, camera info) for privacy
generate thumbnails (300px wide) for list views
Image upload error handling:
Upload images sequentially (not parallel) to avoid partial failures
If upload fails, show error and stop (user must retry)
Already-uploaded images for that letter remain (draft autosaves with partial images)
Video letters: show "Video letters — coming soon" as disabled UI.
C) Intentional friction (critical)
No subject line.
The letter list shows only: From, Sent time + Region, Delivery status, Received date/time (once delivered).
Hard limit: user can SEND max 3 letters/day (in sender's timezone).
NO RECEIVE LIMIT (unlimited incoming letters).
Drafts unlimited.
Strictly block COPY, CUT, and PASTE in the typed letter editor WHILE COMPOSING (like writing a letter: you must type it).
Prevent: Ctrl/Cmd+C, Ctrl/Cmd+X, Ctrl/Cmd+V, context menu copy/cut/paste, and paste events.
Still allow normal typing, selection, arrow keys, undo/redo.
IMPORTANT: Once a letter is RECEIVED and opened, the recipient CAN copy text from it (to copy a quote, recipe, address, etc.). Only block copy/paste during composition.
Typed letters are plain text + italics. No links auto-detected. No rich formatting besides italics.
Once sent, you CANNOT delete the letter. It's in the postal system. No "recall" function.
No sent folder (data vs UI):
Sent letters remain stored in the database for delivery, auditing, and abuse handling.
All sender-facing queries/UI MUST exclude letters where senderId = me and status IN (IN_TRANSIT, DELIVERED). Sender should only ever see drafts.
D) Sending / delivery delay
When user clicks Send:
show "Seal envelope" step (confirmation)
letter becomes immutable (no edits, no deletion)
letter disappears from sender's view (no sent folder)
Delivery delay definition:
Compute earliest_delivery by adding 24 elapsed time, counting only hours that fall on business days (Mon–Fri) in the receiver’s timezone.
Business-day hours count from 00:00–24:00 on Mon–Fri
Weekend hours (Sat/Sun) do not count toward the 24 hours.
Then compute scheduled_delivery as the next occurrence of 4:00 PM in the receiver’s timezone on or after earliest_delivery.
If earliest_delivery is before 4:00 PM on a business day → schedule 4:00 PM same day.
If earliest_delivery is at/after 4:00 PM → schedule 4:00 PM next business day.
If the scheduled 4:00 PM lands on weekend → bump to next Monday 4:00 PM.
Store all timestamps in UTC; use Luxon for timezone math and DST correctness.
DST handling: Use IANA timezone (e.g., "America/New_York") which automatically handles DST transitions. The date-fns-tz or Luxon library will correctly resolve "4pm on date X in timezone Y" regardless of DST.
Examples:
Send Fri 5:00 PM (receiver TZ): count 24 business-hours clock hours → earliest Mon 5:00 PM → next 4:00 PM after that is Tue 4:00 PM.
Send Tue 10:00 AM (receiver TZ): earliest Wed 10:00 AM → deliver Wed 4:00 PM.
E) Addressing / routing letters (anti-enumeration)
To send a letter, sender can enter:
recipient username (preferred)
OR email/phone/address as a lookup attempt
System MUST NOT reveal whether an account exists for email/phone/address.
UI message always: "If an account exists, we'll route it."
User privacy setting:
Users can opt out of being discoverable via email/phone/address.
Usernames are NOT searchable/browsable; only usable if you know it already.
Routing rule: only route by EMAIL/PHONE/ADDRESS if the recipient has the matching discoverability flag enabled; USERNAME routing always works if the username exists.
Default delivery permission:
Letters from anyone can arrive (no gating).
Receiver can Block sender after receiving (prevents future letters).
F) Mailboxes / folders
Required system folders:
My mailbox (unopened)
My mailbox (opened)
Drafts
Custom folders:
user can create up to 30 custom folders.
folder names max 30 characters, allow spaces/punctuation, enforce unique names per user (case-insensitive).
user can move OPENED letters into custom folders (simulates piles/filing).
Tear-open envelope action:
Delivered letters initially appear as "unopened."
Opening requires user to click "Tear open envelope"; only then mark as opened and reveal full content.
Opening moves it to "opened" mailbox list.
G) Reply function
When viewing an opened letter, user can click "Reply" button.
Reply creates a new letter draft pre-addressed to the original sender.
The reply does NOT quote/thread the original (like traditional mail: you just know you're replying).
In the letter metadata (not visible in body), store in_reply_to letterId for future threading UI (v2).
Reply still counts toward sender's 3/day quota.
Reply follows same delivery rules (24 business hours + 4pm window).
H) Pen Pal Matching
"Write to a stranger" feature:
User can opt-in to be discoverable for pen pal matching (separate from email/phone discoverability).
Matching algorithm (simple for MVP):
Match by region (same or different, user preference)
Match by timezone (within ±3 hours)
Random selection from pool
Prevent duplicate matches: Track who user has previously matched with (store in MatchHistory table), never match same pair twice.
Pen pal timezone matching:
Match users whose timezone offsets are within ±3 hours
Example: User in UTC+10 (Melbourne) matches users in UTC+7 to UTC+13
Use current UTC offset (handles DST automatically)
Calculate: Math.abs(user1_offset - user2_offset) <= 3 hours
When user clicks "Write to a stranger":
System finds a match (excluding previous matches)
Creates MatchHistory record for the pair (prevents future duplicate matches)
Pre-addresses a new draft to that person for the requester
IMPORTANT: Matching is recorded bidirectionally - after matching, EITHER person can initiate a letter to the other, but the system only creates a draft for the requester.
The matched person won't know they've been matched until they receive a letter (or until they also request a match and happen to get paired with the same person, which is prevented by MatchHistory).
Both can now write to each other freely using the username, but only the initial requester gets an auto-created draft.
Settings:
Toggle "Available for pen pal matching" (default: OFF)
Preference: "Match me with people in my region" vs "Match me with people anywhere"
I) Reporting / blocking
Receiver can Block a sender (prevents future letters from that sender; existing letters remain).
Blocked sender experience: If Alice blocks Bob, and Bob tries to send a letter to Alice:
Letter appears to send normally (status = IN_TRANSIT)
Delivery cron job silently marks it BLOCKED without delivering
Bob never knows he's blocked (privacy for Alice)
Receiver can Report a letter (store report record for admin review later; no admin UI required but store data).
Provide basic "Safety" page explaining.
J) Automated checks (free for now)
Do NOT integrate paid moderation services in MVP, but architect so it's easy to add later.
Enforce strict MIME types, file size limits.
Basic antivirus placeholder hook: scanUpload(file) { /* TODO: integrate ClamAV or similar */ }
Add rate-limiting via Upstash Redis + @upstash/ratelimit to protect endpoints (especially lookup + send).
Rate limit responses: show generic error (no countdown timer).
K) Account deletion
User can delete their account.
Grace period: Account marked for deletion, actually deleted after 30 days unless the user cancels.
In grace period: 
User CAN:
Log in to the app
Cancel deletion (clears markedForDeletionAt)
View existing letters (unopened, opened, drafts)
Receive new letters (they will be deleted when grace period ends)
Open/read received letters
User CANNOT:
Send new letters (blocked with error: "Account scheduled for deletion. Cancel deletion in Settings to send letters.")
Use pen pal matching
Change username
Add new user identifiers (email/phone/address)
Enforce these restrictions in API routes by checking if (user.markedForDeletionAt !== null)
When account is deleted (after grace period):
All letters they RECEIVED are deleted (their mailbox is destroyed).
All letters they SENT remain in recipients' mailboxes (you can't destroy mail already delivered).
Drafts are deleted.
L) Username changes
Users CAN change their username after signup, enforce uniqueness
Username change handling:
Update User.username
Letters in transit: delivery still works (uses userId, not username for routing)
BlockList, Reports: still reference userId (not affected)
Username change implementation:
Database UNIQUE constraint will prevent duplicate usernames (Prisma will throw error on conflict)
Handle P2002 (unique constraint violation) error gracefully
Show user-friendly error: "Username already taken. Please try another."
No retry logic needed (user must choose different username)
M) Unroutable addressing (anti-enumeration):
Always accept the “Send” action UX-wise (seal envelope, success screen), even if recipient cannot be routed.
If not routable at send time, keep letter status = IN_TRANSIT with recipientUserId = null.
Cron job will attempt routing on each run; if still unroutable after 3 days, mark status = UNDELIVERABLE and never deliver. This outcome is not visible to sender (sender has no sent folder).

======================== 3) NON-GOALS (DO NOT BUILD)
No forward function.
No real-time chat, read receipts, typing indicators.
No public profiles or searchable directory (except opt-in pen pal matching).
No payments yet.
No video/voice sending in MVP (show as "coming soon").
No email notifications (user must check app to see new letters).
======================== 4) TECH STACK (FINAL)
Framework: Next.js 14+ (App Router) + TypeScript
Styling: Tailwind CSS
Auth: Supabase Auth (username + password via custom auth flow)
Database: Supabase Postgres (free tier: 500MB)
ORM: Prisma
Storage: Supabase Storage (free tier: 1GB)
Rate limiting: Upstash Redis + @upstash/ratelimit
Background jobs: Vercel Cron (5-min interval) hitting /api/cron/deliver endpoint
Image processing: Sharp (server-side) for resize, EXIF strip, thumbnail generation, HEIC conversion
Timezone handling: Luxon or date-fns-tz
Deployment: Vercel (free Hobby tier)
======================== 5) DATA MODEL (DESIGN + IMPLEMENT)
Design database tables (Prisma schema) for:
User
id (UUID, PK)
supabase_user_id (UUID, unique, FK to Supabase auth.users)
username (string, unique, lowercase, 3-20 chars)
region (string, e.g., "Victoria, AU")
timezone (IANA string, e.g., "Australia/Melbourne")
discoverableByEmail (bool, default false)
discoverableByPhone (bool, default false)
discoverableByAddress (bool, default false)
availableForPenPalMatching (bool, default false)
penPalMatchPreference (enum: SAME_REGION | ANYWHERE, default SAME_REGION)
markedForDeletionAt (timestamp, nullable, set when user initiates deletion)
created_at, updated_at
UserIdentifiers (optional identifiers for routing)
id (UUID, PK)
userId (UUID, FK)
type (enum: EMAIL | PHONE | ADDRESS)
value_normalized (string, unique composite index with type)
Email: lowercase, trimmed
Phone: E.164 format if possible (or simple normalization: digits only)
Address: lowercase, remove extra spaces
Created_at
UserIdentifiers normalization examples:
Email: "Alice@Example.COM " → "alice@example.com"
Phone: "+1 (555) 123-4567" → "+15551234567" (E.164) or "15551234567" (digits only)
Phone: "0412 345 678" (AU) → "61412345678" (if E.164 possible) or "0412345678" (fallback)
Address: "123 Main St, Melbourne" → "123 main st, melbourne"
Letter
id (UUID, PK)
senderId (UUID, FK to User)
recipientUserId (UUID, FK to User, nullable during composition, required after send)
addressingInputType (enum: USERNAME | EMAIL | PHONE | ADDRESS | PEN_PAL_MATCH, nullable)
addressingInputValue (string, nullable, plain for username, encrypted/obscured for others)
status (enum: DRAFT | IN_TRANSIT | DELIVERED | BLOCKED | UNDELIVERABLE)
sent_at (timestamp, nullable)
scheduled_delivery_at (timestamp, nullable, indexed)
delivered_at (timestamp, nullable)
opened_at (timestamp, nullable)
in_reply_to (UUID, FK to Letter, nullable)
font_family (string, e.g., "Crimson Text", nullable for handwritten/voice)
content_type (enum: TYPED | HANDWRITTEN | VOICE)
typed_body_json (JSONB, nullable, stores ProseMirror/TipTap doc)
sender_region_at_send (string, captured at send time)
sender_timezone_at_send (string, captured at send time)
created_at, updated_at
CREATE INDEX idx_deliverable_letters ON Letter(status, scheduled_delivery_at) WHERE status = 'IN_TRANSIT';
LetterImage
id (UUID, PK)
letterId (UUID, FK)
storage_path (string, Supabase Storage path)
thumbnail_path (string, Supabase Storage path for 300px thumbnail)
mime_type (string)
size_bytes (integer)
width (integer)
height (integer)
order_index (integer, for page ordering)
created_at
Folder
id (UUID, PK)
userId (UUID, FK)
name (string, max 30 chars)
system_type (enum: UNOPENED | OPENED | DRAFTS | null)
created_at
LetterFolder (mapping, for receiver only)
id (UUID, PK)
letterId (UUID, FK)
folderId (UUID, FK)
created_at
UNIQUE(letterId) -- a letter can only be in one folder at a time
BlockList
id (UUID, PK)
blockerUserId (UUID, FK to User)
blockedUserId (UUID, FK to User)
created_at
UNIQUE(blockerUserId, blockedUserId)
Report
id (UUID, PK)
reporterUserId (UUID, FK to User)
letterId (UUID, FK)
reason (text, optional)
created_at
DailyQuota
id (UUID, PK)
userId (UUID, FK)
date (DATE, in user's timezone YYYY-MM-DD)
sent_count (integer, default 0)
UNIQUE(userId, date)
MatchHistory (for pen pal matching)
id (UUID, PK)
userId1 (UUID, FK to User)
userId2 (UUID, FK to User)
created_at
UNIQUE(userId1, userId2) 
Implementation note: 
Always store userId1 < userId2 (sorted order) to prevent duplicate pairs.
Before inserting, sort the two user IDs: const [id1, id2] = [userAId, userBId].sort();
This ensures (alice, bob) and (bob, alice) are treated as the same pair by the DB constraint.
Important:
Enforce unique username (case-insensitive).
Enforce max 30 custom folders per user (check in API).
Sending quota (3/day) based on sender's timezone and sender's local date at send time.
Quota resets at midnight in user's timezone.
Quota enforcement implementation:
When user clicks "Send", compute sender's local date using their CURRENT timezone setting
Store this date in DailyQuota table (format: YYYY-MM-DD)
Changing timezone does NOT retroactively change quota dates (past sends remain in old date)
Quota for "today" is based on current timezone's current date
No receive quota (removed).
For lookups via email/phone/address: NEVER return "not found." Always respond success-ish.
Letters sent cannot be deleted (enforce in API: reject DELETE if status != DRAFT).
No sent folder (don't create one; sent letters disappear from sender's view).
Foreign key cascade rules (Prisma):
Letter.senderId → onDelete: NoAction (sent letters remain after sender deletion)
Letter.recipientUserId → onDelete: Cascade (received letters deleted with recipient)
All other FKs → onDelete: Cascade (cleanup dependent records)
Prisma schema implementation notes:
Use @@unique([userId1, userId2]) for MatchHistory (composite unique constraint)
Use @@unique([type, value_normalized]) for UserIdentifiers (composite index)
Partial index for deliverable letters: use @@ syntax or raw SQL in migration
Example: CREATE INDEX idx_deliverable_letters ON "Letter"(status, scheduled_delivery_at) WHERE status = 'IN_TRANSIT';
If Prisma doesn't support partial indexes directly, create via raw migration after prisma db push
======================== 6) DELIVERY SCHEDULER LOGIC (IMPLEMENT)
Implement a timezone-safe function:
computeScheduledDelivery(sentAtUTC, receiverTimezone) -> scheduledDeliveryAtUTC
Rules:
Business days Mon–Fri. Ignore public holidays.
earliest = addelapsed24Hours(sentAtLocal(receiverTZ), 24) then convert to UTC.
Add 24 hours by counting only hours that fall on Mon–Fri. Equivalent to: add 1 business day preserving local time if sent on a business day; if sent on weekend, start counting from next business day same local time.
scheduled = nextLocal4pmOnOrAfter(earliestLocal, receiverTZ) BUT must be on or after earliest.
If that 4pm falls on weekend, shift to next Monday 4pm.
DST handling: Luxon/date-fns-tz automatically handles DST when resolving "4pm on date X in timezone Y".
Business hours calculation - detailed implementation:
Count "24 clock hours" where each hour must fall on a business day (Mon-Fri).
Algorithm:
1. Convert sentAtUTC to receiver's local time
2. Initialize hours_counted = 0
3. Initialize current_time = sent_time_local
4. While hours_counted < 24:
If current_time is on Mon-Fri (business day):
 Increment hours_counted by 1
Increment current_time by 1 hour
(Skip hours that fall on Sat/Sun without incrementing hours_counted)
5. earliest_delivery_local = current_time
6. Convert earliest_delivery_local back to UTC
Edge case handling:
If sent on Friday 5:00 PM:
Hours 0-7 count (Fri 5pm-Sat 12am): 7 hours
Skip all Saturday hours (0 hours counted)
Skip all Sunday hours (0 hours counted)  
Hours 8-24 count (Mon 12am-Mon 4pm): 16 hours
Result: earliest = Monday 5:00 PM (24 hours later, skipping weekend)
If sent on Saturday 2:00 PM:
Skip all Saturday hours (0 hours counted)
Skip all Sunday hours (0 hours counted)
Start counting Monday 2:00 PM onwards
Result: earliest = Tuesday 2:00 PM (24 hours later, all on business days)
Critical test cases (must pass):
Friday 5pm → earliest Monday 5pm → deliver Tuesday 4pm ✓
Saturday 10am → earliest Tuesday 10am → deliver Tuesday 4pm ✓  
Thursday 3pm → earliest Friday 3pm → deliver Friday 4pm ✓
Monday 5pm → earliest Tuesday 5pm → deliver Wednesday 4pm ✓
Persist scheduled_delivery_at when letter is sent.
Delivery Cron Job (runs every 5 minutes via Vercel Cron):
Endpoint: POST /api/cron/deliver (protected by secret header or Vercel Cron signature)
Logic:
Attempt to resolve unroutable letters:
Mark letters as UNDELIVERABLE after 3 days:
For letters with status = IN_TRANSIT, recipientUserId = null, and sent_at <= (now - 3 days):
Mark status = UNDELIVERABLE
These letters will never be delivered and are invisible to sender (no sent folder)
For letters with status = IN_TRANSIT and recipientUserId = null:
Re-check addressingInputType/value against User and UserIdentifiers
Respect discoverability/privacy settings
If recipient is now resolvable:
Set recipientUserId
Compute/update scheduled_delivery_at if needed
Find all letters with status = IN_TRANSIT and scheduled_delivery_at <= now
For each letter:
Check if sender is blocked by recipient -> if yes, mark BLOCKED, skip delivery
Mark letter DELIVERED
Set delivered_at = now
Assign to recipient's UNOPENED folder
Handle errors gracefully (retry next cron run if DB fails)
Accept that deliveries may be up to 5 minutes late (acceptable for slow mail app)
Sending flow:
When user clicks "Send":
Check DailyQuota for sender's local date (in sender's TZ at send time)
If sent_count >= 3 for that date, reject with error: "You've sent 3 letters today. Try again tomorrow."
Otherwise:
Compute scheduled_delivery_at
Set status = IN_TRANSIT
Set sent_at = now
Increment sent_count for sender's local date
Letter disappears from sender's view (no sent folder)
Timezone handling:
Use Luxon or date-fns-tz for all timezone conversions.
Always store timestamps in UTC in DB.
Convert to user's local timezone for display and quota calculations.
======================== 7) EDITOR IMPLEMENTATION (IMPORTANT)
We need a typed letter editor that:
Is primarily plain text.
Allows italics on selected text only.
Allows choosing 4–6 stationery fonts for the whole letter (not per-paragraph).
Blocks copy, cut, paste during composition only (not when viewing received letters).
Implementation guidance:
Use TipTap (ProseMirror wrapper) configured to ONLY allow paragraph + italic marks; no bold, no headings, no lists, no links.
Extensions: Document, Paragraph, Text, Italic (only)
Disable all default keyboard shortcuts for bold, headings, etc.
Store content as ProseMirror JSON in typed_body_json field.
Render received letters with TipTap in read-only mode OR convert JSON to HTML with strict sanitization.
Block copy/cut/paste during composition:
editor.on('create', ({ editor }) => {
  const element = editor.view.dom;
  
  // Block keyboard shortcuts
  element.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  
  // Block paste event
  element.addEventListener('paste', (e) => {
    e.preventDefault();
  });
  
  // Block context menu
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
});

Allow copy when viewing received letters:
Render received letter content in a separate read-only editor OR plain HTML without the above event listeners.
Users can select text and copy normally.
Font selection:
Provide dropdown with 4–6 fonts (examples):
Crimson Text (serif, elegant)
Merriweather (serif, readable)
Lora (serif, warm)
Courier Prime (monospace, typewriter)
Caveat (handwriting-style)
Open Sans (sans-serif, clean)
Font loading:
Use next/font/google for automatic optimization and self-hosting
Preload only the selected font for each letter (don't load all 6 fonts on every page)
Load regular weight (400) and italic variant only
Example: import { Crimson_Text } from 'next/font/google';
Apply font to entire letter via CSS class on editor wrapper: <div class="font-crimson">
Store font_family in Letter table.
Font applies to whole letter only (not per-paragraph).
Drafts:
Autosave drafts: debounced 2-3 seconds after typing stops (use useDebouncedCallback or similar).
Drafts can be edited freely.
Drafts can be deleted.
Sending finalizes and makes immutable (status = IN_TRANSIT).
Draft autosave behavior with images:
Autosave only includes successfully uploaded images
Show upload progress indicator (e.g., "Uploading 2 of 5...")
Disable navigation/leaving page while uploads in progress (show warning)
If user forces navigation, incomplete uploads are lost (acceptable for MVP)
======================== 8) UX / UI REQUIREMENTS
A) Visual style:
Minimal, lots of whitespace, Notion-like
Mailbox metaphor: letters shown as envelope cards
No clutter, very few buttons
No subject lines
In list view show:
From (username)
Postmarked: sent time + sender region (e.g., "Sent 16 Feb 2026, 5:12 PM — Victoria, AU")
Status: "In transit", "Arrives 4:00 PM Wed", "Delivered Tue 4:00 PM"
Unopened badge (red dot or similar)
B) Main navigation:
Left sidebar:
My mailbox (unopened)
My mailbox (opened)
Drafts
Custom folders (up to 30, user-created)
Settings
Main panel list + detail view:
Clicking a letter shows the envelope detail.
If unopened: show envelope front and "Tear open envelope" button.
When torn open: reveal content, images (carousel for multiple), and "Reply" button.
C) Compose flow:
"Write a letter" CTA
Step 1: Address it
Input field with radio buttons: Username | Email | Phone | Address
If not username: show "If an account exists, we'll route it." Always.
OR: "Write to a stranger" button (if user opted-in to pen pal matching)
Step 2: Choose letter type (Typed | Handwritten | Voice [disabled])
Step 3: Write
For Typed: show editor with font selector (dropdown, whole letter), italic button, copy/paste blocked
For Handwritten: upload images (up to 10 total, including handwritten pages)
Attach additional images (up to total limit of 10)
Step 4: Review + "Seal envelope" (confirmation modal)
Show delivery estimate: "Will arrive Wednesday, Feb 21 at 4:00 PM"
Confirm button
Then show "Letter sent!" confirmation and letter disappears (no sent folder).
D) Image display (handwritten pages and attachments):
In letter detail view: display images in a carousel (horizontal swipe/arrow navigation)
Click image to open in lightbox/modal (full-size view)
Use Radix UI Dialog or similar for lightbox
Carousel behavior: 
Manual navigation only (arrow buttons or swipe) 
No auto-advance
No position persistence (if user navigates away and returns, carousel resets to first image) 
Optional: show image counter (e.g., "2 / 5") but not required No thumbnail strip below main image (keep UI minimal)
E) Settings page:
Change username (allowed)
Change region/timezone
Toggle discoverability by email/phone/address
Toggle "Available for pen pal matching"
Pen pal match preference (same region / anywhere)
Manage UserIdentifiers (add/remove email/phone/address)
Delete account (with confirmation and warning about:
30-day grace period
Received letters will be deleted
Sent letters will remain in recipients' mailboxes)
Cancel deletion (if within grace period)
F) Accessibility:
Keyboard navigable (Tab, Enter, Escape)
Clear focus states (Tailwind focus-visible classes)
ARIA labels on envelope cards, buttons, form fields
Color contrast ratio ≥ 4.5:1 for text
Italic toggle button has aria-pressed state
======================== 9) SECURITY / ANTI-SPAM
Database access / authorization model (MVP):
All API routes run server-side using Supabase service role credentials for DB and Storage operations.
Every DB query MUST be scoped by the authenticated userId (e.g., senderId = me for drafts, recipientUserId = me for mailbox, etc.). Never trust client-provided userId.
Supabase RLS policy:
DO NOT implement Row Level Security (RLS) policies for MVP.
Reasons:
- All API routes use service role key (bypasses RLS anyway)
- Authorization is enforced in API route logic (required and testable)
- RLS adds complexity without benefit when using service role
- V2: Consider RLS if adding client-side Supabase queries
Critical authorization rules (enforce in every API route):
- Letters query: WHERE senderId = currentUserId (for drafts) OR recipientUserId = currentUserId (for received)
- Folders query: WHERE userId = currentUserId
- BlockList query: WHERE blockerUserId = currentUserId
- Never trust userId from request body/params - always use session userId
- Never expose other users' data, even in error messages
Example pattern for all API routes:
```typescript
// Get current user from Supabase session
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
// Look up app user
const appUser = await prisma.user.findUnique({
  where: { supabase_user_id: user.id }
});


// ALWAYS scope queries by appUser.id
const letters = await prisma.letter.findMany({
  where: { 
    recipientUserId: appUser.id, // CRITICAL: scope by session user
    status: 'DELIVERED'
  }
});
```


Test coverage required:
- [ ] User A cannot read User B's letters (returns 403 or empty array)
- [ ] User A cannot delete User B's drafts (returns 403)
- [ ] User A cannot move User B's letters to folders (returns 403)
- [ ] Unauthenticated requests return 401 before DB query
Rate-limit using Upstash Redis + @upstash/ratelimit:
Identifier lookup endpoint (email/phone/address): 10 requests/hour per IP
Send endpoint: 5 requests/hour per user (beyond daily quota, this prevents rapid retries)
Login/signup: 5 attempts/15 min per IP
Rate limit responses: 
Show error "Too many requests. Please try again later." (no countdown timer, no specific time)
DO NOT reveal the exact rate limit threshold
DO NOT show a countdown or "try again in X minutes"
Prevent account enumeration:
Lookup returns generic response always ("If an account exists, we'll route it.")
Do not reveal whether identifier is linked to account
File upload security:
Enforce MIME type + size on client AND server
Store uploads in Supabase Storage with private bucket (auth required to access)
Generate signed URLs for image display (short-lived, e.g., 1 hour)
Strip EXIF data using Sharp: sharp(buffer).rotate().toBuffer() (rotate auto-strips EXIF)
Convert HEIC to JPG server-side using heic-convert library or Sharp with HEIF support
Sanitize filenames (remove path traversal chars)
Signed URL rule:
Supabase Storage bucket is private.
Signed URLs are generated only server-side, and only after verifying the requesting user is authorized to view the letter.
Authorization: recipient can request signed URLs only after the letter is DELIVERED (and for opened/unopened views). Sender can never request signed URLs for any letter images once sent.
Signed URL handling:
Generate signed URLs on page load with 1-hour expiry
Accept that images may break after 1 hour (acceptable for slow mail app metaphor)
User can refresh page to regenerate signed URLs
No client-side polling or auto-refresh in MVP
V2: implement refresh before expiry or longer-lived tokens
Password hashing with bcrypt (Supabase Auth handles this)
CSRF protection via Next.js middleware (SameSite cookies)
Audit log (optional for MVP, but good to have):
Store key actions: letter sent, letter delivered, letter opened, sender blocked, letter reported
Table: AuditLog(id, userId, action, letterId, timestamp)
======================== 9.5) IMPLEMENTATION QUALITY CHECKLIST
Critical implementation requirements that AI must follow:

A) Prisma Schema:
[ ] Composite unique constraints use @@unique([field1, field2]) syntax
[ ] Partial index for Letter.status created (via raw SQL if needed)
[ ] All foreign keys have explicit onDelete behavior specified
[ ] Username uses @unique with mode: insensitive (case-insensitive)

B) Timezone Logic:
[ ] Business hours count only Mon-Fri clock hours (skip Sat/Sun hours entirely)
[ ] Test case passes: Friday 5pm → Monday 5pm earliest → Tuesday 4pm delivery
[ ] Test case passes: Saturday → start counting Monday same time
[ ] DST handled by Luxon (setZone automatically adjusts)

C) Image Processing:
[ ] HEIC conversion wrapped in try-catch (fails gracefully if libheif unavailable)
[ ] Error message: "HEIC images not supported. Upload JPG/PNG." (not internal error)
[ ] Sharp EXIF stripping: use .rotate() which auto-strips metadata
[ ] Thumbnails generated at 300px width, preserve aspect ratio

D) Authorization:
[ ] Every API route gets session user, never trusts client userId
[ ] All Prisma queries scoped by currentUserId (senderId or recipientUserId)
[ ] No RLS policies implemented (service role bypasses anyway)
[ ] 401 returned before any DB query if unauthenticated

E) Timezone Dropdown:
[ ] Displays as "City/Region (UTC±X)" format
[ ] Grouped by continent/region for UX
[ ] Searchable/filterable (autocomplete)
[ ] Defaults to browser timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
[ ] Validates selection against IANA database before saving

F) Error Handling:
[ ] Rate limit errors: "Too many requests. Try again later." (no specifics)
[ ] Quota errors: "You've sent 3 letters today. Try again tomorrow." (specific)
[ ] Upload errors: "Upload failed. Try again." (no internal details)
[ ] All errors logged server-side but sanitized for client response

======================== 10) PAGES / ROUTES (IMPLEMENT)
Public pages:
/ (landing page with signup/login CTAs)
/signup
/login
/safety (static page explaining blocking/reporting)
Authenticated pages:
/app (redirects to /app/unopened)
/app/unopened (default mailbox)
/app/opened
/app/drafts
/app/folder/[id] (custom folders)
/app/compose (new letter)
/app/letter/[id] (letter detail view)
/app/settings
API routes:
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/me (current user info)
POST /api/lookup (for email/phone/address routing; generic response, rate-limited)
POST /api/pen-pal-match (find a stranger to write to, prevent duplicates)
POST /api/letters (create draft)
PUT /api/letters/:id (update draft)
DELETE /api/letters/:id (delete draft only, reject if status != DRAFT)
POST /api/letters/:id/send (seal + enqueue + schedule, increment quota)
POST /api/letters/:id/tear-open (mark as opened)
POST /api/letters/:id/reply (create new draft pre-addressed to sender)
POST /api/letters/:id/block-sender (add to BlockList)
POST /api/letters/:id/report (create Report record)
POST /api/folders (create custom folder, enforce max 30, max name length 30 chars)
DELETE /api/folders/:id (delete custom folder, move letters to opened)
Folder deletion implementation:
Move all letters in folder to OPENED system folder (single DB transaction)
Show confirmation: "This folder contains X letters. They will be moved to 'Opened'."
If folder is empty, delete immediately without confirmation
POST /api/letters/:id/move (move opened letter to folder)
POST /api/upload (upload image, return storage path, generate thumbnail, strip EXIF, convert HEIC)
POST /api/cron/deliver (cron-triggered delivery processor; secret protected)
======================== 11) DEPLOYMENT
README with:
Local setup instructions
Environment variables:
 # SupabaseNEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.coNEXT_PUBLIC_SUPABASE_ANON_KEY=xxxSUPABASE_SERVICE_ROLE_KEY=xxxDATABASE_URL=postgresql://xxx# Upstash RedisUPSTASH_REDIS_REST_URL=https://xxx.upstash.ioUPSTASH_REDIS_REST_TOKEN=xxx# Vercel CronCRON_SECRET=xxx (random string, verify in /api/cron/deliver)# Image processingNEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=letters-images


Prisma setup:
 npx prisma generatenpx prisma db push


Run locally:
 npm installnpm run dev


Configure Vercel Cron:
In vercel.json:
 {  "crons": [{    "path": "/api/cron/deliver",    "schedule": "*/5 * * * *"  }]}

Cron job authentication:
Vercel Cron does not provide signature verification (unlike webhooks)
Use Authorization header with shared secret: req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
Generate CRON_SECRET as a long random string (e.g., openssl rand -hex 32)
Return 401 Unauthorized if header doesn't match
Do NOT rely on x-vercel-cron header alone (not cryptographically secure)
Example implementation:
const authHeader = req.headers.get('authorization'); if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
Free-tier setup guide for Supabase, Upstash, Vercel
Supabase Storage setup:
1. In Supabase dashboard, go to Storage
2. Create new bucket: "letters-images"
3. Set bucket to PRIVATE (public: false)
4. No RLS policies needed (API routes use service role)
5. Note bucket name in environment variables:
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=letters-images
======================== 12) TESTING / ACCEPTANCE CRITERIA
Unit tests:
computeScheduledDelivery function:
Monday 5pm -> Wednesday 4pm (24 business hours + next 4pm after Tuesday 5pm)
Monday 3pm -> Tuesday 4pm (24 business hours + same day 4pm)
Friday 5pm -> Tuesday 4pm (skip weekend, 24 hours from Friday 5pm = Monday  5pm, next 4pm = Tuesday 4pm)
Thursday 4pm -> Friday 4pm (24 hours = Friday 4pm, but that's exactly 4pm so deliver then)
Timezone differences (sender in UTC, receiver in UTC+10)
DST transitions (test spring forward / fall back - Luxon should handle automatically)
Integration tests:
Send 3 letters in one day (sender TZ) -> 4th rejected
Send letter, advance time, run cron -> letter delivered
Block sender -> future letters silently blocked (appear to send but marked BLOCKED by cron)
Delete account -> mark for deletion -> wait 30 days -> received letters deleted, sent letters remain
Cancel deletion within 30 days -> account restored
Reply to letter -> new draft created with correct recipient
Pen pal match -> match with stranger -> send letter -> cannot match with same person again
Manual QA checklist in README:
[ ] Sign up with unique username
[ ] Set timezone/region
[ ] Write typed letter with italics
[ ] Select font (whole letter only)
[ ] Cannot copy/paste in editor during composition
[ ] Attach images (up to 10, up to 25MB total)
[ ] Upload HEIC image -> server converts to JPG
[ ] Send to username -> letter enters "In transit"
[ ] Letter disappears from sender's view (no sent folder)
[ ] Run cron job -> letter delivered to recipient unopened folder
[ ] Recipient tears open envelope -> content visible in carousel
[ ] Click image -> opens in lightbox
[ ] Recipient CAN copy text from received letter
[ ] Recipient clicks Reply -> new draft pre-addressed
[ ] Send 4th letter in same day -> rejected
[ ] Write to stranger (pen pal match) -> draft pre-addressed -> send -> cannot match with same person again
[ ] Block sender -> future letters silently blocked
[ ] Report letter -> record stored
[ ] Change username -> still receive letters (uses userId)
[ ] Delete account -> 30 day grace period -> cancel deletion -> account restored
[ ] Delete account -> wait 30 days -> received letters gone, sent letters remain in recipients' mailboxes
Definition of Done:
A new user can sign up, set timezone/region, write a typed letter, attach images, send to a username, see it in transit.
After 24 business hours + scheduler run, letter appears delivered in receiver's unopened mailbox with tear-open action.
Copy/cut/paste blocked in editor during composition.
Recipient can copy text from received letters.
Images displayed in carousel, click to open lightbox.
No subject line anywhere.
Sending cap enforced (3/day, no receive cap).
Lookup endpoint never reveals account existence.
Reply button creates new draft pre-addressed to sender.
Pen pal matching connects strangers, prevents duplicate matches.
No sent folder; sent letters disappear from sender's view.
Cannot delete letter after sending.
Account deletion has 30-day grace period; after that, received letters deleted, sent letters preserved.
Blocked senders experience silent failure (letters appear to send but get blocked by cron).
======================== 13) BUILD ORDER (FOLLOW THIS)
Scaffold Next.js 14 + Tailwind + Prisma + Supabase connection
Auth with Supabase (signup/login/logout with username + password)
DB schema + migrations (Prisma)
Editor component with copy/paste blocking + italics + font selection (whole letter)
Drafts create/update/autosave (debounced)
Image upload with Sharp processing (resize, EXIF strip, thumbnail, HEIC conversion)
Send flow + scheduling computation (computeScheduledDelivery)
Delivery cron processor (Vercel Cron every 5 min)
Mailbox UI + tear-open + opened/unopened separation
Reply function (create new draft pre-addressed)
Pen pal matching algorithm + UI (prevent duplicate matches via MatchHistory)
Image display: carousel + lightbox (click to open)
Folders + custom folder limit (max 30, max name length 30 chars)
Block/report functionality (silent blocking)
Rate limiting with Upstash Redis
Settings page (timezone, discoverability, pen pal opt-in, username change, delete account with grace period)
Polish UI minimal + responsive
Tests + README + deployment guide
Now implement the entire project. Output:
complete source code with file tree
key files in full
instructions to run locally and deploy
any caveats



========================
14) CODE QUALITY + DOCUMENTATION (MANDATORY)
========================
Commenting & Docblock Style:
- Use a consistent documentation style across the project:
  - JSDoc/TSDoc-style docblocks for:
    • all exported functions
    • delivery scheduling utilities
    • quota enforcement logic
    • editor restriction handlers
    • auth/session modules
    • upload validation/security modules
  - Each docblock must include:
    • description
    • parameters
    • return value
    • edge cases / important notes (when applicable)
- Use concise but meaningful inline comments explaining WHY, not WHAT.
- Add section headers in complex files (e.g., "// ===== Delivery Logic =====").

Code Structure:
- TypeScript strict mode
- Clear function names
- Small reusable utilities
- Avoid large monolithic files

========================
15) README.md GENERATION (MANDATORY)
========================
After generating the full source code, generate a comprehensive README.md using the structure below:

# README STRUCTURE

1) Project Overview
   - What the app is
   - Core philosophy (slow mail, intentional friction)
   - Key MVP features

2) Architecture Summary
   - Stack explanation
   - High-level system design
   - Delivery scheduler concept

3) File Structure Guide
   - Show file tree
   - Explain purpose of major directories/files
   - Explicitly identify where:
     • delivery logic lives
     • quota logic lives
     • editor logic lives
     • auth logic lives

4) Local Development Setup
   - Prerequisites
   - Installation steps
   - Environment variables (with explanation of each)
   - Database setup
   - Prisma migration commands
   - Running dev server

5) Database & Prisma
   - How schema works
   - Migration workflow
   - Reset/seed instructions

6) Storage Setup
   - Supabase bucket (or chosen storage)
   - Permissions configuration
   - Signed URL / secure access strategy

7) Deployment (Vercel)
   - Step-by-step deploy
   - Environment variables on Vercel
   - Build settings
   - DB connection notes

8) Cron Jobs / Delivery Processor
   - Purpose of cron endpoint
   - How to configure Vercel Cron
   - Required secret/token
   - Suggested schedule frequency
   - How delivery + receive caps work

9) Testing
   - How to run tests
   - What is covered
   - Critical scenarios validated

10) Troubleshooting
   - Common setup mistakes
   - DB connection issues
   - Cron not triggering
   - Upload errors

11) Next Steps Checklist (VERY IMPORTANT)
   Provide a clearly formatted checklist with detailed guidance for:

   □ Vercel production setup  
   □ Supabase project setup  
   □ Prisma migrate/deploy workflow  
   □ Hardening auth/security  
   □ Adding moderation provider  
   □ Enabling video letters  
   □ Implementing priority postage  
   □ Spam prevention upgrades  
   □ Mobile/PWA evolution  

Each checklist item must include practical instructions, not just bullet points.


README.md must be written as if for a real developer onboarding to the project who is new to this stuff

========================
16) WORKING RULES FOR AI SESSIONS (MANDATORY)
========================

These rules apply to every Claude Code session working on this project.

A) HANDOFF.md UPDATES (continuous, not end-of-session):
- After completing each file, immediately update HANDOFF.md
- Before starting a new file, update HANDOFF.md "In Progress" section
- Never defer HANDOFF.md updates to the end of the session
- If a file is partially complete, note exactly what is done and what remains

B) FILE-BY-FILE CHECKPOINTS:
- Complete and write one file to disk before starting the next
- After each file confirm: "✅ [filename] complete. Updating HANDOFF.md. Moving to [next file]."
- Never write multiple files in one stream without checkpointing

C) CONTEXT AWARENESS:
- When the conversation feels long, stop starting new files
- Finalize any in-progress file with TODO comments for gaps
- Do a final HANDOFF.md update and write SESSION END summary

D) HANDOFF.md STRUCTURE:
Always keep HANDOFF.md in this exact format (defined below).


========================
END REQUIREMENT
========================
