> **Historical 0.2.0 fix report.** The current 0.3.0 curriculum and build status is in [ILMIGO-COURSE-BUILD-REPORT.md](ILMIGO-COURSE-BUILD-REPORT.md).

# ILMIGO 0.2.0 — Bug fixes aur verification report

Date: 26 October 2026  
Previous review: 0.1.0  
**Result: reviewed defects ke code fixes implement hue. 34 automated Node checks PASS. Production approval abhi pending hai.**

## 1. Kya solve kiya?

| Review ID | Fix | Evidence / present limit |
|---|---|---|
| R01: account data leak | Guest aur har signed-in user ke separate local stores; fresh sign-in apni cloud profiles restore karta hai; logout guest scope kholta hai. Late sync responses ignore hote hain. | Actual web logout/sync regression PASS. Native implementation/tests included, native execution pending. |
| R02: replay date/progress loss | Client newer date preserve karta hai. Server atomic `sync_completion` RPC use karta hai. Separate daily history sync hoti hai; second-device restore days return karta hai. | Mocked handler/client regression PASS. Database migration 002 apply aur live concurrency test pending. |
| R03: invalid quiz publish/crash | Strict shared schema: required bilingual strings, correctly typed words/readings, actual 2–6 distinct options, answer membership, unique IDs. Invalid collection publish se pehle reject. | String/null options, missing question/Urdu question, numeric words/readings, duplicate options aur wrong answer regression PASS. |
| R04: malformed JSON shape par 500 | Body must be a JSON object. Sync profiles aur nested completions/days validate hote hain. Null/arrays/primitives par 400. | Regression PASS; invalid auth payload par provider call zero. |
| R05: reviewer account deletion | Migration reviewer auth FK ko `ON DELETE SET NULL` banati hai; non-identifying `reviewer_audit_id` publish audit preserve karta hai. Published check auth-user existence par depend nahi rehta. | Migration static check PASS. Live PostgreSQL/user deletion test pending; isay deployed fix na samjhein. |
| R06: offline remote lessons | Browser validated catalog device storage mein persist karta hai. Native validated catalog download ko preferences mein save karta hai aur startup par load karta hai. Invalid caches fallback/reject hote hain. | JS cache/schema checks PASS. Native restart test included but unrun; actual browser service-worker/network-offline QA pending. |
| R07: fresh-device language mismatch | New profiles random IDs use karti hain. Legacy local-key match par existing metadata update hota hai. Client canonical server name/kind/language/goal reconcile karta hai. | Actual handler/mock-db regression PASS; English → Urdu case consistent. |

**Meaning of “fixed” here:** source code has changed and listed automated checks passed. Database-dependent fixes are not active in a hosted app until migration/deployment occurs. Native behavior is not certified until Flutter/device checks run.

## 2. Extra improvements

- Guest data import explicit adult action hai. Shared device par doosre signed-in account stores import nahi hote. Imported profiles ko fresh local IDs milti hain.
- Same account ki reauthentication unsynced local progress preserve karti hai.
- Parent PIN (6–12 digits), salted PBKDF2 hash aur failed-attempt cooldown add hua. Child-to-adult normal profile switching PIN maangti hai. PIN progress backups/cloud exports mein nahi jata.
- Child profile se data export/import, adult sync/sign-out aur destructive data controls restrict kiye gaye.
- Har sample quiz ka Urdu question add hua; Urdu mode ab translated question use karta hai. Goal labels bhi Urdu mein dikhte hain.
- New published language ke liye voice locale English par silently default nahi hota; installed device voice/recognition phir bhi zaroori hai.
- Corrupt nested backup completions, invalid dates, duplicate profile IDs aur bad resume timers sanitize hote hain.
- Browser storage blocked ho to app temporary memory store use karti hai aur warning dikhati hai.
- Database family-size limit transactional trigger mein enforce hota hai. Retried profile creation uses conflict-safe insertion.
- Account deletion current account ka local store bhi remove karti hai. Unrelated guest/other-account stores is action mein delete nahi hote.
- Service worker cache version bump hua aur naye shared modules offline asset list mein hain.

## 3. Test results

Command:

```sh
npm run check
node --test --test-isolation=none tests/*.test.mjs
```

**34 passed · 0 failed · 0 skipped** during this verification.

Coverage includes:

- Existing catalog, scoring, XP, local family separation, streak and Urdu transcript checks.
- A → logout → B account isolation using actual web actions/sync function.
- Late A response arriving after logout; legacy guest data isolation; explicit guest import; same-account unsynced progress restore.
- Replay date monotonicity, daily-history union and metadata reconciliation using the actual HTTP handler with mocked provider responses.
- Publishing malformed quizzes and invalid request shapes.
- PIN hashing/verification/cooldown, separate account credentials, unavailable storage fallback and invalid local backups.
- Standalone preview startup, catalog/path navigation and lesson next/back wiring using a **synthetic DOM**.

`review/verification.txt` contains the detailed result. `review/evidence.json` records each fix status. `node review/reproduce.mjs` now runs the current regression checks. Original defective-behavior reproductions/evidence are archived under `review/history/`; those historical assertions are not current acceptance tests.

### What these checks do NOT prove

- Synthetic DOM checks are not real browser visual/accessibility/audio testing.
- Mocked service responses are not live Supabase/OpenAI/RevenueCat integration tests.
- SQL source assertions are not execution of the migration or real Postgres concurrency checks.
- Native source assertions are not Flutter compilation. Native tests were added, not executed here.

## 4. Database upgrade — necessary before connected use

For an existing 0.1.0 database:

1. Back up the database.
2. Apply **only** `supabase/migrations/002_review_fixes.sql` in staging.
3. Verify profile ownership/RLS, daily-history restore, concurrent/late replay and reviewer account deletion with real accounts.
4. Deploy the matching 0.2.0 server/client together.

For a new database: apply 001, then 002.

Migration 002 preserves existing profile/completion records. It seeds daily history from known completion rows. Older practice days that version 0.1.0 never stored cannot be recovered from the database alone; surviving device history/backups can contribute them during sync.

No migration was applied to a live Supabase project in this task. This package does not contain production credentials.

## 5. Parent PIN ki practical limits

The new PIN protects ordinary UI switching on the device. It is not verified parent identity, independent child authentication or encryption of all local progress. Someone controlling browser/app storage can reset a local gate. Device locking and adult supervision remain necessary.

There is no automated forgotten-PIN recovery in this development release. Store the PIN safely. Device data reset clears local data/gate; authenticated cloud data can be restored after sign-in. Unsynced guest data needs a backup to survive a reset.

Public child onboarding still requires verified consent/adult identity and independently scoped child sessions. Local PIN alone does not make this a production child platform.

## 6. Abhi kya complete nahi hai?

| Pending item | Why it remains pending |
|---|---|
| Android APK / iPhone IPA | Flutter/Dart SDK absent in this environment. Previous SDK download failed. No successful native analysis, test or build run. |
| Real-device/browser QA | Environment previously blocked TCP listener/Chromium startup. Only in-process/synthetic testing available. |
| Live DB/OTP/AI/billing | Owner service configuration, staging migration and actual provider tests required. |
| 34 complete courses | Catalog has 34 languages but only 8 original beginner sample lessons. Remaining 32 courses and intermediate/professional curriculum are not authored/reviewed. |
| Professional language accuracy | Qualified content/audio review required; sample structure tests do not assess teaching quality. |
| Natural AI voice tutor | Existing integration gives text feedback on submitted transcript. Full spoken conversation, audio grading and phonetic assessment are not built. |
| Paid advanced delivery | RevenueCat bridge is off by default; paid curriculum/gating/store products/terms and lifecycle testing remain unfinished. |
| Public release | Verified parent sessions/consent, privacy/support/retention/monitoring, signing and store submission required. |

These are scope/integration/verification gaps, not claims that the code fixes above were omitted. There is no honest basis yet to label the overall app “complete,” “bug-free,” or “store-ready.”

## 7. Files to use

- `ILMIGO-preview.html`: updated self-contained browser preview; cloud/AI/purchases disabled in that file.
- Flutter source under `mobile/`; run `python3 scripts/bootstrap_mobile.py` on a machine with Flutter installed.
- Server starts with `npm start` on Node 22.9+.
- `.env.example` lists owner-side service configuration; do not share secret values publicly.
- `README.md` has updated setup, account migration, PIN, offline and verification instructions.

**Handoff status:** bug-fix source and tested browser/backend logic delivered. Live database activation, native builds and the full language-learning product still require the pending work listed above.
