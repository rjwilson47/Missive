# HANDOFF.md

## ✅ Completed
<!-- Claude appends here after each finished file -->

## 🔄 In Progress
<!-- Claude updates this before starting each file -->
_Nothing in progress yet._

## ❌ Not Started
<!-- Claude maintains this as a shrinking list -->
All files — project not yet started.

## Key Decisions Made
<!-- Claude records any choices that deviate from SPEC.md or fill gaps -->

## Known Stubs / TODOs
<!-- Claude records any intentional shortcuts taken under time pressure -->

## Next Session Starts Here
<!-- Claude overwrites this at the end of every session -->
> Session 1 not yet started.
```

---

## 3. Session Starter Prompt (Use This Every Time)

Copy and paste this at the start of each Claude Code session, changing only the last line:
```
Read SPEC.md and HANDOFF.md before doing anything else.

WORKING RULES FOR THIS SESSION:
- Work on one file at a time
- After completing each file: write it to disk, update HANDOFF.md 
  "Completed" section, then confirm before moving on
- Before starting each file: update HANDOFF.md "In Progress" section
- Never defer HANDOFF.md updates to end of session
- When the conversation is getting long: stop starting new files, 
  finalize anything in progress with TODO comments, update HANDOFF.md, 
  write a SESSION END summary in the "Next Session Starts Here" section

THIS SESSION'S GOAL:
[Paste the relevant section from the build order below]
```

---

## 4. Your 6-Session Build Order (Paste the Relevant One Each Time)

**Session 1**
```
Goal: Skeleton + Schema + Auth
- Generate complete file/folder tree with stub files (correct imports, 
  type signatures, TODO comments, no implementation yet)
- Implement prisma/schema.prisma in full
- Implement lib/auth.ts, api/auth/signup, api/auth/login, api/auth/logout
- Implement api/me
Do NOT implement anything else this session.
```

**Session 2**
```
Goal: Delivery Logic + Cron
- Implement lib/delivery.ts (computeScheduledDelivery with all test cases)
- Implement api/cron/deliver.ts (full delivery processor)
- Write unit tests for delivery logic
Do NOT build UI this session.
```

**Session 3**
```
Goal: Editor + Compose Flow + Drafts
- Implement components/Editor.tsx (TipTap, copy/paste blocking, fonts)
- Implement api/letters (create, update, delete draft)
- Implement api/letters/[id]/send (quota check, scheduling, seal flow)
- Implement api/upload.ts (Sharp processing, EXIF strip, thumbnail, HEIC)
```

**Session 4**
```
Goal: Mailbox UI
- Implement app/app/unopened, app/app/opened, app/app/drafts pages
- Implement app/app/letter/[id] (envelope view, tear-open, reply button)
- Implement api/letters/[id]/tear-open
- Implement api/letters/[id]/reply
- Implement components/LetterCard.tsx, components/ImageCarousel.tsx
```

**Session 5**
```
Goal: Pen Pal + Folders + Block/Report + Rate Limiting
- Implement api/pen-pal-match.ts
- Implement api/folders (create, delete, move letter)
- Implement api/letters/[id]/block-sender
- Implement api/letters/[id]/report
- Implement lib/ratelimit.ts (Upstash)
- Implement api/lookup.ts
```

**Session 6**
```
Goal: Settings + Polish + README
- Implement app/settings page (all settings from spec section 8E)
- Implement account deletion + grace period logic
- Implement app/safety static page
- Implement landing page /
- Generate README.md per spec section 15
- Final pass: check all TODOs in HANDOFF.md and resolve or document
