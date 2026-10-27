# ILMIGO DIGITAL ACADEMY — Successful cloud build

Date: 27 October 2026. App version: 0.3.1+4. Delivery: **test/beta**, not store release.

## Result

The owner-selected public repository now contains the application and build workflows:

https://github.com/saifulrehman62913-blip/NextGen-AI-Academy

All three jobs completed successfully in this run:

https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712

Verified code commit: `78063c16ee4bed2080b4ef88b1199e1096959120`.

| Check | Actual result |
|---|---|
| Web/curriculum build and JavaScript syntax | PASS |
| Web/backend/content regression tests | 46 passed, 0 failed, Node 24.21.0 |
| Flutter analysis on Linux and macOS | PASS with 0 errors; 8 non-fatal informational/deprecation notes |
| Flutter tests on Linux | 13 passed |
| Flutter tests on macOS | 13 passed |
| Android debug APK | Built and uploaded |
| iOS ARM64 simulator app | Built and uploaded |

Flutter SDK used: **3.47.8 stable**. The 13 Flutter cases are the same cases executed on both hosts, not 26 distinct cases. CI checks are not physical-device/microphone/visual QA.

## Downloads and installation

### Android test app

[Download Android APK artifact ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712/artifacts/12712984740)

Sign in to GitHub if prompted, download/extract the ZIP, and open `app-debug.apk` on Android. The OS may ask to allow installation from the app opening the APK. This is a debug/test build, not a Play Store release.

Artifact ZIP: 79,641,205 bytes. GitHub digest:

`sha256:0c0d8151f66655a9fb505262eca5c97891b85d655bb8e9153e8d96a1ac9dc1a1`

### iOS build verification

[Download iOS simulator artifact](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712/artifacts/12712864828)

The outer artifact ZIP contains `ilmigo-ios-simulator.zip`, which contains `Runner.app` for the macOS ARM64 iOS Simulator. **This cannot be installed directly on an iPhone.** Physical-iPhone distribution requires Apple signing/provisioning and a signed IPA/TestFlight/App Store workflow.

Artifact ZIP: 59,156,278 bytes. GitHub digest:

`sha256:be2ba94816cae94c85d11335bacd74e740c80e80c2c618f6d78308cb9861e6eb`

### Browser preview

[Download web preview artifact](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712/artifacts/12712839543)

The generated `ILMIGO-preview.html` runs without a server. Cloud/AI/purchases are intentionally inactive in that standalone file.

These GitHub artifacts expire on **25 January 2027**. The source remains in the repository; the workflow can regenerate builds. Artifact downloads normally require GitHub sign-in. Artifact ZIPs were also downloaded through the GitHub connector into reusable file references. They were not locally unpacked in this restricted workspace, so recorded ZIP sizes/digests are GitHub's artifact metadata, not an independent local byte-hash claim.

## Issues found and fixed by actual cloud runs

1. **Node-version mismatch:** the first web job used Node 22, which rejected `--test-isolation=none`. The project/CI now consistently require Node 24; the final web job passed all 46 checks.
2. **Dashboard widget-test hang:** real asset/storage work inside Flutter's fake async clock stalled the widget test. The test now loads the store with `tester.runAsync`, keeps all assertions, and has an explicit 60-second limit. Both hosts subsequently completed all 13 Flutter cases in seconds.
3. **Async dialog context:** after awaiting parent-PIN setup, child-profile creation now checks that its widget is still mounted before opening another dialog.
4. **Bounded diagnostics:** CI runs Flutter tests serially with a timeout and fail-fast reporting. No failing test was removed or skipped to make the build green.

The successful final run supersedes the first cancelled/failed diagnostic runs. Earlier files under `review/build/` describe the old restricted local host and its missing SDK; they do not override these actual cloud results.

## Working scope and remaining product work

The beta includes ILMIGO DIGITAL ACADEMY branding, the ILMIGO robot, 40 guided English/Urdu lessons across five stages, local learning/progress/family profiles, device audio and optional supported recognition. It preserves the earlier account/privacy, progress-history, content validation and PIN fixes.

The following have **not** been completed or verified by this build:

- Qualified linguistic/audio review of the authored curriculum; professional fluency is not certified.
- The other 32 language courses; their catalog entries remain coming soon.
- Live Supabase/OTP/AI/billing activation and real provider tests. The APK was built without an API_BASE_URL, so account/cloud/AI services are inactive in this preview.
- Live database migration/RLS/concurrency/deletion tests.
- Physical Android/iPhone, microphone/voice availability, accessibility and full visual QA.
- Independent child sessions and verified legal parent consent; the PIN is a local UI gate.
- Release signing, signed iPhone IPA, TestFlight, Play Store or App Store publication.

The analyzer's 8 informational notes include deprecated Flutter APIs and do not invalidate this successful build. Android also reports a plugin Kotlin Gradle compatibility notice for future Flutter versions. The verified SDK is 3.47.8; future SDK/plugin upgrades need fresh analysis/tests/builds.

**Conclusion:** the Android test APK is ready to install for testing, and the iOS simulator build is verified. This is meaningful native-build evidence, not a claim that the entire production academy/platform is finished or bug-free.
