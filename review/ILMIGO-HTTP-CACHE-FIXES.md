# HTTP and offline cache review

Application commit: `e03afa99ed7e8cfe0213cf7637efeac3564075dc`.

## Fixed

- Config, public catalog, membership and member catalog accept GET only. Unsupported mutation methods return 405 before authentication/provider work.
- Provider connection failures return 502 and provider timeouts return 504 with a retry message. Internal exception details are not exposed. Existing session authentication errors remain separate.
- Both service-worker installation and subsequent network updates respect `Cache-Control: no-store`. Cache version changes retire the previous cache on activation. Runtime cache quota/write failures no longer reject a successfully fetched response.

## Verification

85 Node tests passed locally with `node --test --test-isolation=none tests/*.test.mjs`; JavaScript syntax checks passed. Four new regression tests exercise the actual HTTP handler and execute the service-worker code with simulated fetch/cache APIs, including quota errors and install-time catalog exclusion. These cache tests are not a real browser offline integration test.

Cloud build: https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40496457690

The complete cloud run succeeded: 85 Node tests, all four migrations with 36 PostgreSQL assertions, Docker build/HTTP smoke and four Chrome browser scenarios. Both Linux and macOS passed the same 24 distinct Flutter tests. Android debug APK and iOS simulator app built successfully. Missing owner signing credentials were explicitly rejected by the real Flutter release path. Native analysis reported zero errors and eight nonfatal informational findings per host.

Downloads (GitHub sign-in may be required; expire 25 January 2027):

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40496457690/artifacts/12731600445): extract `app-debug.apk`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40496457690/artifacts/12731920125): not an iPhone IPA.
- [Browser evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40496457690/artifacts/12730703829).

Artifact IDs, sizes and GitHub-provided digests are in `cloud/http-cache-verification.json`; archives were not independently unpacked locally. Native artifacts are still unconfigured previews, not live paid releases. Browser screenshots were generated, not manually visually inspected.

Native source and SQL migrations are unchanged from the verified 0.5.0 release. See ILMIGO-CHILD-SESSIONS-RELEASE.md for that release's builds, signing guard and precise test limits.

## Release boundaries

This is a test beta, not a completed paid academy launch. Live HTTPS/backend, OTP, AI, merchant subscriptions and Meezan payout require the owner's configured provider accounts. No payment/payout has been performed. The configured plan remains USD 10/year with one explicitly started, non-converting 72-hour trial per verified account.

Signed Android/iOS releases require owner signing credentials. Android debug and iOS simulator builds do not replace these. Physical-device audio/purchase/accessibility QA is still required. The current 40 English/Urdu lesson drafts need qualified review and further professional-course expansion; 32 other languages remain coming soon. No claim of zero bugs or completed professional fluency courses is made.
