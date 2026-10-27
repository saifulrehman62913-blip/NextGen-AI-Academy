> Historical 0.4.1 evidence. The [0.5.0 child-session release report](ILMIGO-CHILD-SESSIONS-RELEASE.md) records the current verified code and signing safeguard.

# ILMIGO DIGITAL ACADEMY 0.4.1 — reliability and functional review

Verified application code: `99322a2c1f44297a9728eee646710f2d95518a30`.

[GitHub Actions run 40474428692](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40474428692) completed successfully. Subsequent report/export-only changes do not change the tested application.

| Check | Actual result |
|---|---|
| Node web/backend regression suite | 73 passed, 0 failed |
| PostgreSQL 16 | All three migrations applied; 24 integration assertions passed |
| Backend Docker image | Built and ran; HTTP smoke checks passed |
| Chrome 155.0.8059.39 / Playwright 1.64.1 | Three functional scenarios passed |
| Flutter 3.47.8, Android host | 22 tests passed; debug APK built |
| Flutter 3.47.8, macOS host | Same 22 tests passed; iOS simulator app built |
| Native analysis | 0 errors; 8 nonfatal informational findings per host |

There are 22 distinct Flutter tests executed on two hosts, not 44 distinct tests. Passing these checks does not prove zero defects or production readiness.

## Fixes completed

- Added server-verified refresh-token rotation and automatic, account-bound session refresh in browser and native clients. Concurrent expired requests share one refresh; a request is replayed at most once with its original body.
- Kept refresh credentials out of learning exports and preferences. Browser credentials use tab session storage when available; native credentials stay in memory. Closing the native client invalidates pending refreshes. Re-login is still required after an invalid/revoked refresh token or closing the native app.
- Prevented late refresh/login/service replies from overwriting a different account. Duplicate browser code verification is locked to its original form. A failed local sign-out preserves the current valid session and releases the sign-out lock.
- Removed a stale-account restoration issue: if writing the new browser session fails, the previous stored account is removed rather than silently restored on reload.
- Distinguished upstream provider authentication failure from learner authentication failure. An OpenAI/RevenueCat/service-key 401 is returned as a service error; it no longer triggers learner refresh/replay and an extra AI quota reservation.
- Converted malformed native service responses into readable errors. Rejected query/fragment-bearing backend URLs. Guarded browser single-feedback replies against profile/page changes.
- Cancelled delayed native voice playback after leaving a screen or superseding the phrase. This is playback lifecycle logic, not audio pronunciation grading or real-device voice verification.

The USD 10/year base price and one explicit 72-hour trial remain unchanged. The trial never creates a charge. Real purchases remain disabled in the supplied previews.

## Real database and container checks

CI used a fresh, disposable PostgreSQL database with stand-in Supabase auth roles/functions. Actual SQL execution verified migration syntax, row isolation, restricted function/table privileges, fixed trial expiry, concurrent first-trial creation, atomic quota enforcement, the concurrent 12-profile family limit, monotonic completion dates, practice-day history and account-deletion audit/cascade behavior. The two expected "Family profile limit reached" errors in PostgreSQL logs are negative-test refusals, not failing checks.

The test setup refuses a non-local, differently named or already populated application database. No owner's live project was modified. These checks do not verify Supabase JWT/SMTP integration, production credentials or an existing-project rollout.

The non-root Docker image was built and started in CI. It served the actual app, session module and 40 lessons; unconfigured cloud/purchases stayed disabled and `.env` stayed inaccessible. No live provider was contacted by that smoke check.

## Real browser scenarios

1. English onboarding and lesson flow: unanswered/wrong quizzes refuse completion; correct answers complete; writing drafts and progress survive reload; repeating a lesson does not add duplicate XP.
2. Local family flow: actual browser PIN hashing/setup, wrong-PIN refusal, child/adult progress separation, disabled child conversation and correct-PIN adult restoration.
3. Urdu at a 390-pixel mobile viewport: RTL/language selection, no horizontal page overflow and saved onboarding after reload.

External font requests were blocked to make these checks independent of font-provider availability. Screenshots were generated, not manually visually reviewed here. Mobile browser emulation is not a physical phone. Browser child-PIN checks do not implement independently scoped cloud child sessions or verify legal parenthood.

## Downloads

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40474428692/artifacts/12720370667): extract `app-debug.apk`. Archive SHA-256: `c98c809d5f9d01a1fb65e3ae6c5dc7916a166f1547e2492264c2381e362bb371`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40474428692/artifacts/12719569809): not installable on a physical iPhone. Archive SHA-256: `7cb9eec4d4dad029f37b1e708d6776cc75257ea893c894cb7a7446696763a4fd`.
- [Browser preview](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40474428692/artifacts/12718814919).
- [Browser screenshots and scenario evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40474428692/artifacts/12718704965).

GitHub sign-in may be required. Artifacts expire 25 January 2027. Archive digests/sizes are GitHub metadata; archives were not independently unpacked locally. Native previews have no API URL, store keys or paid-build flags configured and do not activate payments.

## Still pending

Owner accounts, secure credentials, live HTTPS deployment, actual OTP/AI/store transaction checks, bank payout verification and release signing/publication remain pending while the owner creates accounts. See [Pakistan payment setup](PAYMENT-SETUP-PAKISTAN.md).

The current 40 English/Urdu lessons remain original drafts requiring qualified review/expansion. The other 32 catalog languages remain coming soon. Independent cloud child-session permissions/production consent flows and physical-device/audio/accessibility QA are not completed by this release. The app is a verified beta, not a complete professional-fluency course or fully launched paid academy.
