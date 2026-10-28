# ILMIGO DIGITAL ACADEMY 0.6.0 — remaining code and release preparation

This round excludes course expansion, qualified course review, the remaining 32 language curricula and physical-phone testing, as requested. It addresses remaining implementation and packaging work. It does not claim a deployed paid service, real bank payout or owner-signed store publication without owner accounts/credentials.

## Fixes

### Web, admin and offline

- Course studio now uses the same bounded, owner-bound session refresh as the learner app. Child/missing sessions are refused locally; the server still enforces administrator permissions. Late replies after a tab's account changes are ignored. Failed credential persistence removes stale credentials and does not replay a publication. Load/save controls prevent concurrent actions and recover from malformed/network/provider errors.
- Service-worker activation removes only old ILMIGO caches, preserving other applications on the same origin. Static network fetch and body download have a 10-second deadline, enabling cached offline fallback on stalled connections. Existing no-store and quota-failure protections remain.
- Profile switching now tracks the latest selection and state/session snapshot through PIN checks, sync and child-token issuance. A late child reply cannot override a newer selection/account. Member catalog downloads are tied to the same active learner/session, and sync rechecks its account after catalog awaits.

### Backend

- Canonical application/Supabase origins accept normal copied trailing slashes/case/default ports without wrong browser-origin comparisons or double-slash provider paths. Invalid URL fields fail without echoing their contents. External HTTP origins are rejected; explicit local development hosts retain HTTP support.
- Wrong/expired OTPs return a readable client error instead of an apparent provider outage. Oversized/malformed codes and emails are rejected before provider access rather than truncated. Body-download provider timeouts return 504, matching fetch timeouts.
- Publishing requires a literal boolean review attestation, not a truthy string. This is an administrator attestation, not independent verification of reviewer qualifications.

### Native

- Replaced deprecated speech-listening parameters and radio-selection APIs. Each assessment question has an independent RadioGroup.
- Adult AI feedback captures original text/lesson/UI and refuses late work after disposal or learner changes. Paid lesson opening and catalog refresh check the cloud session generation, including same-owner parent/child transitions.
- Added four widget regressions for independent quiz selections, disposed-screen request suppression, original-text preservation and child-switch suppression.

## Release preparation delivered

- `scripts/check-deployment.mjs`: read-only public HTTPS checks for paid plan configuration, protected catalog bodies, auth/method/origin boundaries and security headers. It never sends OTP, calls AI, buys a product or changes a bank account. Its HTTP fixtures are tested; it has not run against a configured live deployment because no URL/credentials are available.
- `.github/workflows/android-release.yml`: manually invoked owner-signed paid AAB workflow. It validates owner setup, runs checks, verifies deployed public paid boundaries, builds with the existing owner-only signing guard, uploads only the AAB and removes the temporary private keystore. It does not upload to Play or activate payments. No real owner signing secrets were supplied or used.
- `scripts/build-paid-ios.py`: validates owner distribution identity/profile/team/bundle/export configuration, applies manual signing only to Runner's Release configuration, prepares paid client defines, archives/exports with Xcode and verifies app/IPA signing/profile. It restores original project and lesson asset bytes after success/failure. No global signing override is applied to Pods. A configuration-only no-codesign step cannot count as a signed release. Simulated compiler/signing fixtures test success/failure guards; they are not proof of a real owner-signed IPA.
- `scripts/check-ios-release-template.py`: checks the patch against the actual generated Flutter Xcode project in macOS CI using fixture public identifiers and `plutil -lint`, without modifying/signing the project.
- [OWNER-LAUNCH-SETUP.md](OWNER-LAUNCH-SETUP.md): concrete backend/email, merchant, Android Actions, Apple export and publisher setup, with secret names and actual acceptance limits.

## Verification scope

The combined local suite passes 112 Node tests; JavaScript syntax and Python compilation pass. Native and database/browser results are recorded after the cloud run below. The browser suite now has seven scenarios, adding actual course-studio navigation with mocked refresh/admin responses, and actual service-worker activation/cache namespace preservation. The latter is real browser CacheStorage behavior; service outage/deadline edge cases also have executable VM regressions. Live OTP, OpenAI, store and bank operations are not mocked tests' results.

No SQL migrations are added; apply existing 001–004 before deployment. The USD 10/year base plan, one explicit non-converting 72-hour free trial per verified account, server-verified membership and existing child-scoped access remain unchanged.

## What remains outside this deliverable

The four user-excluded workstreams remain separate. For the rest of launch, the required owner environment is absent: live HTTPS hosting, Supabase/SMTP/OpenAI, merchant/RevenueCat/store products, bank verification, owner signing certificates/keys, publisher identity/support/privacy details and live provider/store acceptance. Code and instructions cannot perform those account actions without the owner's configured access. Signed release commands and the manual workflow have not been executed with real owner credentials. No store app was published, payment collected or payout verified.

Passing the automated suite is evidence for the tested scope, not a guarantee of zero bugs or a complete commercial launch.

## Final verified result

Application commit: `6e36366d2bf82d4856e7d7a0ca9e442690b3ad82`. [Run 40525822488](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40525822488) completed all three jobs successfully.

112 Node tests, 36 PostgreSQL assertions across four migrations, Docker build/HTTP smoke and seven Chrome scenarios passed. The same 29 distinct Flutter tests passed on Linux and macOS. Both native analysis runs reported **No issues found**. Actual generated Xcode signing-template syntax passed plutil without source modification. Android debug APK and iOS simulator app built successfully; missing owner release credentials were correctly rejected by the Android guard. No actual signed paid AAB/IPA was produced.

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40525822488/artifacts/12743843366): extract app-debug.apk.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40525822488/artifacts/12743693410): not installable on a physical iPhone.
- [Browser evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40525822488/artifacts/12743692567).

GitHub sign-in may be required. These are unconfigured previews without live backend/store keys. Browser screenshots were generated, not manually visually reviewed. Physical testing remains outside this round.
