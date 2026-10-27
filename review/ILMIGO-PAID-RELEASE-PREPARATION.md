# ILMIGO 0.5.1 — goal screen fix and paid release preparation

Application commit: `8555b78ceea1058905151e120690da2e21ec0c93`.
Cloud verification: https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40498273610

## Changes

The native goal selector previously assumed every restored goal was one of four fixed strings. A custom goal restored from local storage could fail Flutter's dropdown assertion. The selector now includes the current goal once, uses the current form API, and is keyed by profile and goal to refresh its state after changes. It expands within available width. Cloud merge already normalizes remote goals; this fix protects restored/local state and future custom goals. A widget regression opens My space with a custom goal and then persists another goal, checking for framework exceptions and stale text.

The new My space widget regression also exposed a Flutter ListTile painting diagnostic: a decorated card background could hide profile-row tap ink. Shared cards now paint their shape/background using Material, keeping tile ink visible without a painted DecoratedBox between the row and its Material. The regression continues to reject framework exceptions.

Two other dropdowns use the current initialValue API; a calendar timestamp string uses interpolation. Speech/radio deprecation notices are not silenced or represented as fixed.

`build-paid-android.py` validates the HTTPS backend origin, Android public RevenueCat SDK key, owner signing fields/file, bootstrapped signing guard and explicit owner acceptance marker before building. It sets both purchase/access defines, temporarily strips lesson bodies and restores source assets even after compiler failure. A temporary public config file is deleted after use; server secrets are not written into Dart defines. It removes stale generated AAB output before invoking Flutter and requires the expected new artifact. The script does not upload an app, verify provider readiness or certify acceptance.

`check-production-config.mjs --paid` requires subscriptions to be enabled, a non-placeholder RevenueCat server credential and distinct annual product IDs, alongside the existing HTTPS/cloud/AI configuration checks. Field values are not printed. These are shape checks, not live provider validation.

## Evidence and limits

Locally, all 87 Node tests and JavaScript syntax checks passed; Python compilation passed. New build-tool tests use temporary fixtures and a simulated compiler to prove define selection, missing-setup rejection, source restoration and temporary-file cleanup. They do not generate or validate a real signed AAB. This host has no Flutter SDK; actual widget/native verification runs in GitHub Actions.

The paid-build command rejects this unconfigured workspace before compilation, as expected. No owner's keystore, account settings, API credentials or live database were changed. The existing plan remains USD 10/year and one explicitly started 72-hour trial with no automatic conversion.

## Still required for a commercial launch

- Owner-configured HTTPS hosting, Supabase/SMTP, OpenAI, RevenueCat/store products and verified merchant/bank payout; real staging OTP, AI, purchases, restore, renewal/expiry/cancellation checks.
- Owner-signed Android release and Apple provisioning/signing, store review and publication. Debug/simulator artifacts are test previews.
- Expand and obtain qualified review for the 40 English/Urdu drafts; author/review the other 32 languages. This release does not provide complete professional-fluency curricula.
- Physical Android/iPhone audio, accessibility and RTL QA; final publisher contacts/privacy/child consent acceptance for release markets.

Passing automated checks is not proof of zero defects or completion of the above work.

## Current cloud verification

The web job passed all 87 Node tests, four migrations with 36 PostgreSQL assertions, Docker image build/runtime smoke and four browser scenarios. Android passed 25 distinct Flutter tests, built the debug APK and rejected missing owner release credentials through the actual release command. Native analysis has no errors; informational findings reduced from eight to four (remaining speech/radio API deprecations). The new widget regression first exposed the card painting diagnostic; this was fixed and the regression now passes.

The Android preview has no backend URL, purchase flag or provider SDK key configured. It is not the owner-signed paid AAB produced by the new helper. The helper's successful compilation path is tested with a simulated compiler only; real signing/provider acceptance remains an owner staging step.

The complete run succeeded. macOS also passed the same 25 distinct Flutter tests and built the iOS simulator app. These are 25 distinct tests executed twice, not 50 different tests. Documentation-only follow-up commits do not change tested application code.

## Downloads

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40498273610/artifacts/12732207001): extract `app-debug.apk`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40498273610/artifacts/12731817720): not installable on a physical iPhone.
- [Web preview](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40498273610/artifacts/12732306138).
- [Browser evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40498273610/artifacts/12731906806).

GitHub sign-in may be required; artifacts expire 25 January 2027. IDs, sizes and GitHub-provided archive SHA-256 digests are in `cloud/paid-release-verification.json`. Archives were not independently unpacked locally. Browser screenshots are generated, not manually visually reviewed. Physical devices and live providers remain untested.
