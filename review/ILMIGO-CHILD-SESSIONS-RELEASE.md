# ILMIGO DIGITAL ACADEMY 0.5.0 — scoped child access and release signing

Verified application commit: `0ad137bc7ddfd6c1593c6d4801f4cdeed3a6579e`.

[GitHub Actions run 40485530870](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40485530870) completed all jobs successfully. Later documentation/export changes do not alter the tested application.

| Verification | Result |
|---|---|
| Web/backend regression tests | 81 passed, 0 failed |
| PostgreSQL 16 | Four migrations; 36 integration assertions passed |
| Docker build and HTTP smoke | Passed |
| Chrome / Playwright | Four scenarios passed |
| Flutter tests on Linux | 24 passed |
| Same Flutter tests on macOS | 24 passed |
| Native analysis | 0 errors; 8 nonfatal informational findings per host |
| Android debug APK | Built |
| iOS simulator app | Built |
| Actual Flutter release without owner credentials | Explicitly rejected by signing guard |

These are 24 distinct Flutter tests run on two hosts, not 48 distinct tests. Passing these checks is not proof of zero defects or live-production readiness.

## Child cloud access implemented

- A signed-in owner explicitly consents before uploading a new child profile and starting child cloud access. The server requires consent version `child-cloud-v1`; ordinary family sync skips unsent local child profiles. Anonymous/explicitly unverified provider users are denied cloud access.
- The server issues an independent random 256-bit child token, storing only its SHA-256 hash. Tokens bind to one owner and one child profile, expire after 24 hours and are checked against the database on every authenticated child request. At most five child-device sessions are retained per profile; newer ones revoke the oldest beyond that limit.
- Child sessions allow only own-profile progress sync, membership access status and their selected-language lesson collection. Other family profiles, new profile creation, metadata promotion, AI, trial activation, purchases/admin actions, account deletion and further token issuance are denied server-side. An opaque child token is not a Supabase parent JWT and grants no direct database permissions.
- Browser/native clients replace active parent credentials with the child token and retain no parent refresh token in the active child session. Child sessions cannot refresh into parent access. Normal return requires the parent PIN and verification of the same owner's email. Existing same-owner email PIN recovery remains available if the PIN is lost; it resets the local PIN rather than proving legal guardianship.
- Parents can end all child cloud sessions without deleting progress. Profile/account deletion cascades child sessions and associated consent events. Revocation blocks subsequent cloud requests; it does not remotely erase cached/local lesson data.
- Versioned consent/session-access events and profile consent timestamps are recorded in migration 004. Existing consent is not silently relabelled as versioned consent. This records an account holder's explicit parent/guardian attestation, not independently verified legal parenthood, age verification or a compliance certification.
- An older browser session that retained parent credentials while a child profile was active is quarantined by discarding those credentials. Its local family progress remains intact; parent verification is required to regain cloud permissions.

## Other fixes

Cloud identity now takes priority over a conflicting local alias when merging profiles. An existing adult profile cannot be overwritten by a child row carrying the adult's local ID. Conflicting bound identities no longer silently merge, and newly created local rows avoid duplicate local IDs.

Disposed native dialogs are guarded after asynchronous PIN work. Child cloud profiles cannot edit their nickname/course/goal metadata through the client controls; the backend independently ignores child metadata writes.

## Signing safeguard

Native bootstrap replaces Flutter's default debug-signing fallback for Android release builds. Release signing reads only owner-supplied environment variables:

- `ILMIGO_ANDROID_KEYSTORE` — path to the private upload keystore.
- `ILMIGO_ANDROID_STORE_PASSWORD`
- `ILMIGO_ANDROID_KEY_ALIAS`
- `ILMIGO_ANDROID_KEY_PASSWORD`

No key/password is generated, embedded in source or written to a key-properties file by this helper. Debug builds keep the usual test identity. Release tasks fail explicitly when credentials or the keystore file are absent. CI ran the actual `flutter build appbundle --release --no-pub` path with owner credentials removed and verified the expected guard failure. This is a negative safety test, not a successfully signed production AAB. Apple signing still requires the owner's Apple account/certificates/provisioning.

## Test scope

The real disposable PostgreSQL tests exercise the new compound ownership foreign keys, service-only permissions, concurrent session issuance, the five-device cap, 24-hour expiry, versioned events, owner-specific revocation and deletion cascades, alongside the earlier trial/quota/family isolation checks. Auth roles/functions are stand-ins; no owner's Supabase project was modified.

The three existing browser scenarios still pass. A fourth uses mocked cloud endpoints to exercise actual browser consent, removal of parent credentials from tab storage, refusal of a different email owner, same-owner parent return without resetting the PIN and session revocation controls. Backend scope enforcement is separately tested against the real request handler and actual PostgreSQL schema. Browser mocks are not live OTP/provider verification. Screenshots are generated, not manually visually reviewed. Hardware audio and physical devices are not covered.

## Downloads

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40485530870/artifacts/12724508239): extract `app-debug.apk`. Archive SHA-256: `38ddb668450132d9da27d2013593f1cdd9fd152cde6e428dfa480f4e0dc1fbf6`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40485530870/artifacts/12724818262): not installable on an iPhone. Archive SHA-256: `c8b5989fdc31c2fc6300e027c1a38d6d15667f26afe2a6400ff3b426d8cd811e`.
- [Web preview](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40485530870/artifacts/12724977366).
- [Browser screenshots/scenario evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40485530870/artifacts/12724852216).

Artifacts expire 25 January 2027; GitHub sign-in may be required. Digests are GitHub metadata, not independently unpacked local archives. Native artifacts remain unconfigured previews without a backend URL, paid-build flags or store keys. They do not activate cloud access or collect real payments.

## Rollout and remaining work

Back up an existing project and apply migration 004 after 001–003, before deploying this backend/clients. New accounts apply all four migrations in order. Run real OTP, child consent/revocation and account-deletion checks in staging with owner credentials before publication. End-session controls preserve progress; parents use cloud-data/account deletion to erase data, and store subscriptions must be cancelled separately.

The USD 10/year base plan and one explicit free 72-hour trial are unchanged. Merchant/bank verification, live HTTPS/provider setup, signed Android/iPhone store releases and real purchase lifecycle testing still require owner accounts and credentials. Final child privacy/consent wording and publisher contact details require review for the release markets; the implementation does not certify legal compliance.

The 40 English/Urdu lessons remain original drafts requiring qualified review/expansion. The other 32 catalog languages are still coming soon. Their professional curricula and physical-device/audio/accessibility QA are not completed by these technical fixes.
