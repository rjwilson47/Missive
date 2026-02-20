# AUDIT.md
<!-- Full structured audit of the Missive codebase against SPEC.md sections 1–13.
     Conducted after Session 6. Findings use FIX-N labels matching HANDOFF.md Remediation Order. -->

## Status Summary (updated after Remediation Session 1)

| FIX | Status | File(s) |
|---|---|---|
| FIX-1 | ✅ DONE | send/route.ts — Letter field names |
| FIX-2 | ✅ DONE | send/route.ts — DailyQuota sent_count |
| FIX-3 | ✅ DONE | WriteStep.tsx — font prop |
| FIX-4 | ✅ DONE | LetterEditor.tsx — italic toolbar button |
| FIX-5 | ✅ DONE | letters/route.ts + compose/page.tsx — delivery estimate |
| FIX-6 | ✅ DONE | compose/page.tsx — isPenPalEligible |
| FIX-7 | 🔲 OPEN | settings/page.tsx + me/route.ts — recovery email UI |
| FIX-8 | 🔲 OPEN | login/page.tsx + new /forgot-password page + API route |
| FIX-9 | 🔲 OPEN | me/route.ts — sync recovery_email to Supabase auth |
| FIX-10 | 🔲 OPEN | cron/deliver/route.ts — 30-day account deletion |
| FIX-11 | 🔲 OPEN | WriteStep.tsx + new DELETE route — image server-side delete |
| FIX-12 | 🔲 OPEN | src/__tests__/integration/ — 7 integration test scenarios |
| FIX-13 | 🔲 OPEN | letters/route.ts — verify Folder system_type field name |
| FIX-14 | 🔲 OPEN | auth.test.ts — cross-user authorization tests |

---

## 🔴 Critical Blockers

### FIX-1 · `src/app/api/letters/[id]/send/route.ts` — Letter field name mismatch
**Status:** ✅ FIXED in Remediation Session 1
**Was:** Prisma update used camelCase keys; schema defines snake_case. Every send threw a runtime error.

| Wrong (was) | Correct (now) |
|---|---|
| `sentAt` | `sent_at` |
| `scheduledDeliveryAt` | `scheduled_delivery_at` |
| `senderRegionAtSend` | `sender_region_at_send` |
| `senderTimezoneAtSend` | `sender_timezone_at_send` |

---

### FIX-2 · `src/app/api/letters/[id]/send/route.ts` — DailyQuota `sentCount` → `sent_count`
**Status:** ✅ FIXED in Remediation Session 1
**Was:** Schema field is `sent_count`; code used `sentCount` in TypeScript type, `select`, condition, `upsert update`, and `upsert create`. Quota was always `undefined` — never enforced.

---

### FIX-3 · `src/components/compose/WriteStep.tsx` — `font` prop → `fontFamily`
**Status:** ✅ FIXED in Remediation Session 1
**Was:** `<LetterEditor font={font}` — LetterEditor's prop is `fontFamily`. Font selection was silently ignored.

---

## 🟠 High Priority

### FIX-4 · `src/components/editor/LetterEditor.tsx` — No italic toolbar button
**Status:** ✅ FIXED in Remediation Session 1
**Was:** TipTap Italic extension loaded but no visible toggle button. Only discoverable via Cmd+I.
**Fix applied:** Added `<div role="toolbar">` with `<button aria-label="Italic" aria-pressed={editor?.isActive("italic")}>`; only shown in `!readOnly` mode.

---

### FIX-5 · `src/app/app/compose/page.tsx` + `src/app/api/letters/route.ts` — ReviewStep delivery estimate always null
**Status:** ✅ FIXED in Remediation Session 1
**Was:** compose/page.tsx always passed `scheduledDeliveryAt={null}` to ReviewStep. Generic "1–5 business days" always shown.
**Fix applied:** `POST /api/letters` now resolves USERNAME recipient at draft creation, calls `computeScheduledDelivery(now, recipientTimezone)` server-side, returns `{ id, scheduledDeliveryAt }`. compose/page.tsx stores and passes it to ReviewStep.

---

### FIX-6 · `src/app/app/compose/page.tsx` — `isPenPalEligible` hardcoded `true`
**Status:** ✅ FIXED in Remediation Session 1
**Was:** `<AddressStep isPenPalEligible={true}` — users who opted out still saw the "Write to a stranger" button.
**Fix applied:** compose/page.tsx fetches `GET /api/me` on mount and reads `availableForPenPalMatching`.

---

### FIX-7 · `src/app/app/settings/page.tsx` + `src/app/api/me/route.ts` — No recovery email field
**Status:** 🔲 OPEN
**Spec:** §2-A requires recovery email UI with unverified warning.
**Fix needed:**
1. Add "Recovery email" section to settings/page.tsx with input + save button
2. Warning text: "Make sure this email is correct. We cannot verify it, and this is your only way to reset your password."
3. Add `recovery_email` field to `PUT /api/me` body parsing and Prisma update

---

### FIX-8 · `src/app/login/page.tsx` + `/forgot-password` page + `POST /api/auth/forgot-password`
**Status:** 🔲 OPEN
**Spec:** §2-A: "If recovery_email is set, allow 'Forgot password'… If not set, show 'Add a recovery email in Settings.'"
**Fix needed:**
1. Add "Forgot password?" link on login page → `/forgot-password`
2. Create `src/app/forgot-password/page.tsx` — username input form
3. Create `src/app/api/auth/forgot-password/route.ts`:
   - Look up user by username → get `recovery_email`
   - If set: call `supabaseAdmin.auth.resetPasswordForEmail(recovery_email)`; show "Check your email"
   - If not set: show "Add a recovery email in Settings to enable password reset"
   - Anti-enumeration: same response regardless of whether username exists

---

### FIX-9 · `src/app/api/me/route.ts` — Recovery email not synced to Supabase auth email
**Status:** 🔲 OPEN
**Spec:** §2-A: "when user sets recovery_email, also update the Supabase auth user email to the same value using service role."
**Fix needed:** In PUT /api/me handler, when `recovery_email` is being updated, call:
```typescript
await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, { email: recovery_email });
```
If no recovery_email set (clearing it), restore synthetic email:
```typescript
await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, { email: buildSyntheticEmail(supabaseUser.id) });
```

---

### FIX-10 · `src/app/api/cron/deliver/route.ts` — 30-day account deletion not implemented
**Status:** 🔲 OPEN
**Spec:** §2-K: after grace period, delete received letters and drafts; sent letters remain.
**Fix needed:** Add Phase 0 to cron (before existing phases):
```typescript
// Find users past 30-day deletion grace period
const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const toDelete = await prisma.user.findMany({
  where: { markedForDeletionAt: { lte: cutoff } },
  select: { id: true },
});
// Delete each user (cascade handles received letters + drafts per schema FK rules)
for (const u of toDelete) {
  await prisma.user.delete({ where: { id: u.id } });
}
```

---

## 🟡 Medium Priority

### FIX-11 · `src/components/compose/WriteStep.tsx` — Handwritten image remove has no server-side delete
**Status:** 🔲 OPEN
**Was:** Remove button updates local state only; image remains in Supabase Storage and LetterImage DB row stays.
**Fix needed:**
1. Create `DELETE /api/letters/[id]/images/[imageId]` route: verify ownership, delete from storage, delete DB row
2. In WriteStep HandwrittenUploader `handleRemove`: call the DELETE endpoint before updating state

---

### FIX-12 · Integration tests — all 7 required scenarios missing
**Status:** 🔲 OPEN
**Spec:** §12 requires integration tests.
**Fix needed:** Create `src/__tests__/integration/` with mocked Prisma and Supabase:
- Quota enforcement: send 3 letters → 4th rejected
- Cron delivery: advance time → deliver
- Blocking: block sender → future letters marked BLOCKED
- Account deletion: 30-day cycle
- Cancel deletion: account restored
- Reply: correct draft pre-addressed
- Pen pal: match → cannot re-match

---

## 🟢 Low Priority

### FIX-13 · `src/app/api/letters/route.ts` — Folder `system_type` field name in GET query
**Status:** 🔲 OPEN (needs verification)
**Risk:** Line 84: `where: { userId: me.id, systemType: folder }` — if schema has `system_type`, this query ignores the type filter entirely and returns wrong folder.
**Fix needed:** Read the query and confirm field name is `system_type` not `systemType`.

---

### FIX-14 · Authorization tests
**Status:** 🔲 OPEN
**Spec:** §9 test coverage checklist.
**Fix needed:** Add tests verifying:
- User A cannot read User B's letters (403 or 404)
- User A cannot delete User B's drafts (403)
- Unauthenticated requests return 401 before DB query

---

## Spec Conflicts / Ambiguities (no code changes needed)

1. **Recovery email vs. routing email**: `recovery_email` (password reset only) is separate from `UserIdentifier` EMAIL (letter routing). Settings UI must label both clearly.

2. **ReviewStep delivery estimate when recipient unresolvable**: Spec says show estimate (§8-C/D) but also always accept send (§2-M). Resolution (implemented in FIX-5): show actual date for USERNAME routing; show generic "1–5 business days" for email/phone/address routing.

3. **Folder case-insensitive uniqueness**: POST /api/folders enforces uniqueness in application code (lowercases both names for comparison). This is correct but relies on app-level logic rather than DB constraint.

4. **DailyQuota timezone correctness**: Quota date uses sender's IANA timezone at send time — correct in design. Was unverified in practice due to FIX-2 bug (now fixed).
