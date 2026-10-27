# ILMIGO DIGITAL ACADEMY — 0.3.1

English/Urdu language-learning development build: Flutter Android/iOS source, a self-contained browser preview, a Node/Supabase backend, and an original ILMIGO logo-shirt robot.

**This is still a development build, not a complete production platform.** There are 34 catalog languages and 40 original guided lessons: 20 English and 20 Urdu, with four units in each of five stages (beginner, elementary, intermediate, advanced, professional/workplace topics). These are curriculum drafts, not a guarantee of professional fluency. The other 32 courses and qualified linguistic/audio review remain pending. Android/iOS builds and live providers have not been verified in this environment.

See the [current course/build report](review/ILMIGO-COURSE-BUILD-REPORT.md) and machine-readable [build verification](review/build/verification.json). The [0.2.0 fix report](review/ILMIGO-FIX-REPORT.md) records the preceding bug-fix release. The earlier [0.1.0 review](review/ILMIGO-REVIEW.md) is historical; it records the defects which prompted this release.

## Run the preview or full browser app

Open `ILMIGO-preview.html` in a modern browser. This single file runs without a server and disables cloud/AI/purchases. Browser storage saves progress when available; otherwise a temporary-session warning appears. Some phone file viewers do not execute HTML; open it in a browser or run the server below.

Node 24+; no package installation required:

```sh
npm start
```

Open `http://localhost:3000`. The full browser companion includes a dashboard, searchable 34-language catalog, 5-block lesson player/resume, local quizzes/streaks/XP, English/Urdu explanations and RTL, optional device audio/speech, separate family profiles, parent PIN gate, JSON backups, calendar reminders and offline caching.

Daily blocks: 5 minutes review + 8 words/grammar + 7 reading/listening + 7 speaking + 3 quiz. Durations are suggestions. Planned completed minutes and active time are labelled separately. Replaying a lesson does not multiply XP.

## Native Android / iPhone

Install Flutter stable (Dart >=3.4), Android SDK for Android, and Xcode on macOS for iOS:

```sh
python3 scripts/bootstrap_mobile.py
cd mobile
flutter analyze --no-fatal-infos --no-fatal-warnings
flutter test
flutter run
```

The script generates Android/iOS platform shells, copies the shared catalog and adds microphone/speech/TTS permissions and iOS usage explanations. It does not create signing credentials or a store listing. Platform folders are generated, not included as an already built app.

Configure an owner-operated HTTPS backend:

```sh
flutter run --dart-define=API_BASE_URL=https://your-server.example
flutter build appbundle --dart-define=API_BASE_URL=https://your-server.example
# macOS + signing required:
flutter build ipa --dart-define=API_BASE_URL=https://your-server.example
```

Native source includes the five-stage curriculum, grammar/dialogues/writing tasks, multi-question checks and progress, family profiles, PIN gate, TTS, optional adult speech-to-text, word comparison, OTP, cloud sync, text AI feedback and a Google Calendar reminder link. Downloaded catalog data is validated and saved before use so it can survive offline restarts. Device voices/recognition availability varies. Native access tokens stay in memory; sign in again after restarting.

**Native analysis, Flutter tests and APK/IPA compilation have not run here.** The SDK is absent and download failed; the source needs the checks above before it can be considered build-verified.

## Supabase and optional services

1. Create your Supabase project and apply, in order:
   - `supabase/migrations/001_ilmigo.sql`
   - `supabase/migrations/002_review_fixes.sql`
2. Existing 0.1.0 installations apply **only migration 002**. Back up your database first. Do not run 001 again.
3. Enable email OTP; make the email template show `{{ .Token }}`. Configure production SMTP before public launch.
4. Copy `.env.example` to `.env`; set URL, anon key, server-only service-role key and exact `APP_ORIGIN`.
5. Optionally set `OPENAI_API_KEY`/`OPENAI_MODEL` for text tutoring and `REVENUECAT_SECRET_KEY` for server entitlement verification.
6. Run behind HTTPS with browser and backend on the same origin.

Migration 002 adds daily practice history, atomic monotonic completion merging, a transactional family-size limit and a reviewer audit identity which survives deletion of the reviewer's auth account. It preserves existing completions and seeds known practice days. Older practice dates that were never stored in 0.1.0 cannot be reconstructed automatically; device backups/days can import them.

**Migration files were prepared and statically inspected, not applied to a live database here.** Live RLS, concurrent RPC behavior and reviewer deletion must be tested in staging.

Do not expose service-role, OpenAI or RevenueCat secret keys in client code/Flutter defines, backups or Git. No production account, provider or deployment was activated in this delivery.

## Accounts, progress and children

Guest and each authenticated account now use separate local stores. Signing out opens the guest store. A new sign-in fetches its own cloud profiles; it never silently imports another account's local data. Returning to the same account preserves unsynced local progress. Late sync responses after account switching are ignored.

Guest progress remains in guest space. An adult can explicitly choose **Import guest progress** after signing in. Only import guest data you own on a shared device. Other authenticated-account stores are excluded. Imports get fresh profile IDs. Existing 0.1.0 device data is retained as guest data; because that version did not bind it to a verified owner, it is not automatically assigned to an account.

For new child profiles, an adult creates a 6–12 digit parent PIN. Child-to-adult profile switching requires it. PINs are salted/hashed with PBKDF2 and stored separately from progress exports/cloud data; five incorrect attempts trigger a cooldown. The PIN is local UI protection, not encryption, verified parent identity or protection from someone controlling device storage. A signed-in family account can recover adult access by verifying that same account’s email code. A different account cannot reset its PIN. This verifies account ownership, not age or legal parenthood. Guest PINs have no verified email identity; keep those PINs securely. A device reset clears the local gate and unsynced guest data, while signed-in cloud data can be restored after sign-in.

Child live AI/voice recognition remain disabled. The backend independently rejects AI for child profiles. Verified adult/parent consent and independently scoped child sessions remain requirements before public child onboarding. Use device locking and supervision meanwhile.

Cloud sync stores all known completed practice days and never moves a lesson's latest completion date backwards. Imported progress is practice data, not certification or a purchase entitlement.

## API

- `GET /api/config`, `GET /api/catalog`: capability flags/free sample collections.
- `POST /api/auth/otp`, `POST /api/auth/verify`: email OTP. No automatic session refresh yet.
- `POST /api/sync`: authenticated `{profiles:[{id,localId,name,kind,language,goal,completed,days}]}`; response has canonical metadata, latest completions and complete stored day history. Profile IDs are owner-checked.
- `POST /api/speaking`: `{profileId,lessonId,transcript,ui}`; adult/owner-checked text feedback. Atomic quota: 3 trial / 20 Plus turns per UTC day. Upstream failures can consume reserved turns. No audio grading or phonetic score.
- `GET /api/entitlements`: server-side RevenueCat check.
- `POST /api/delete-data`: delete profiles/progress, retain login/quota. Local data remains and a later explicit sync can upload it again.
- `POST /api/delete-account`: `{confirm:"DELETE"}` deletes authenticated account/cloud records; clients remove its local learning store. Store subscriptions must be cancelled separately.
- `GET/POST /api/admin/courses`: trusted administrator studio; strict bilingual lesson validation.

## Course studio and billing

Sign in through the app, then open `/admin.html`. Assign `app_metadata.role="admin"` using a trusted admin console only. Never trust user-editable metadata for roles.

Use `shared/catalog.json` as the lesson schema. Every lesson needs bilingual titles/objectives/readings/quiz question, typed word entries and 2–6 distinct string quiz options containing the answer. Free 30-minute units across all five allowed stages are accepted. Optional assessment arrays, grammar notes, dialogues, writing tasks and bilingual rubrics are strictly validated. Paid gating remains disabled. Admin uploads are capped at 2 MiB; ordinary API bodies at 256 KiB. Draft/review collections stay private; published collections require a human review confirmation/note. Do not put personal information in review notes. The public catalog updates within 30 seconds.

RevenueCat native purchase/restore bridge is **off by default**. Do not set `ENABLE_PURCHASES=true` before completing reviewed paid content, course gating, store products, subscription terms and sandbox lifecycle tests. `REVENUECAT_ANDROID_KEY`/`REVENUECAT_IOS_KEY` are public client SDK keys; the secret key stays on the backend. There is no web checkout or released paid curriculum.

## Checks and release limits

```sh
npm run check
npm test
node --test --test-isolation=none tests/*.test.mjs
node review/reproduce.mjs
npm run build
npm run verify
```

There are **46 passing Node tests** in this revision, including all five curriculum stages, assessment bypass rejection, writing-draft persistence and stale-cache upgrade checks. They cover content/scoring, account isolation, stale responses, replay/history, metadata conflicts, strict input/content shapes, parent hashing/cooldown, local fallback and bundled-preview startup/navigation with a synthetic DOM. HTTP tests run the actual handler in-process with mocked providers; they do not open sockets or call live services.

The synthetic DOM is **not real browser QA**. Native tests are included but unrun. This environment previously blocked TCP listeners and Chromium startup. No visual/device/audio/microphone checks, live Supabase/OpenAI/RevenueCat integration, production deployment, APK/IPA or store submission has been completed.

Before release: apply/test migrations in staging; run native analysis/tests/builds; verify real Android/iOS/Urdu/text-scaling/permissions/offline flows; implement verified parent sessions/consent; professionally review agreed launch courses; test real OTP/AI/billing/deletion; configure privacy/support/retention/crash monitoring and signing. The included GitHub Actions workflow can run native analysis/tests/Android debug build and an iOS simulator build once the source is in a repository.

## Course content and build status

The agreed staged launch prioritises English and Urdu. Each course contains 20 guided lessons / 600 planned minutes; repeating and practising with other people is additional. Four workplace units cover interviews, meetings, negotiation and recommendations/presentations. Readings and dialogues use fictional scenarios. The complete authored v1 unit set is present, but it is not an accredited comprehensive professional-fluency qualification. Qualified review, recorded audio and broader skill assessment are still needed.

- [English curriculum and instructor answer key](courses/en-curriculum.md)
- [Urdu curriculum and instructor answer key](courses/ur-curriculum.md)
- `scripts/course_units.py`: authored bilingual scenario source.
- `npm run curriculum`: reproducibly generates catalog/mobile assets and Markdown course exports.
- `npm run build`: generates course assets, standalone preview and checks JavaScript syntax.
- `npm run verify`: also runs tests and attempts native bootstrap/analyse/tests/builds. It **exits 2** when required native checks are blocked, **1** on a failure, and **0 only when all requested checks pass**.

In this workspace, web/content/source checks pass; `review/build/verification.json` records `partial_native_blocked` because Flutter is missing and iOS needs macOS/Xcode. No APK/IPA is included. The SDK network-access attempt was not approved, so the download was not completed. Writing drafts stay local and are included in device backups; cloud sync uploads completion/day history, not the drafts.

## Completing the native build

This workspace has no Flutter/Dart, Android SDK or Xcode; Docker access is denied. A search found no connected ILMIGO GitHub repository. A supported build host is required. Supply an existing connected GitHub repository URL to place the prepared source/workflows there, or run the included bootstrap and verification commands on a Flutter/Android SDK host (and macOS/Xcode for iOS). No native build is claimed until those jobs actually finish successfully.

Version 0.3.1 also adds same-account email parent-PIN recovery, preserves the native auth session if local sign-out persistence fails, and rejects non-HTTPS lookalike hosts such as `http://localhost.example` in native backend configuration. Native service tests cover those cases but remain unrun without Flutter.

## Prepared cloud build handoff

`scripts/prepare-github-source.py` creates a source-only ZIP and SHA256 manifest under `release/`, excluding keys, caches and generated catalog/preview assets. All three CI jobs now generate their required assets from the authored curriculum before testing/building. A fresh local checkout from that prepared source successfully generated the curriculum/web preview and passed 46 Node tests. This proves clean-checkout reproducibility for those local checks, not native compilation.

Connected GitHub discovery found an empty **public** `NextGen-AI-Academy` repository owned by the user. No code was uploaded: the repository choice/public visibility needs a response before publishing. There is no tool here for creating a new GitHub repository. An existing repository can host the prepared Android/iOS workflows once selected. The Android artifact is a debug APK; the iOS artifact is a simulator app, not a signed installable iPhone IPA.

## Academy name

The academy/app display name is **ILMIGO DIGITAL ACADEMY**. The robot teacher remains **ILMIGO**. Browser titles, install manifest, app wordmarks, native display-name generation and course exports use the academy branding. GitHub still reports the existing `NextGen-AI-Academy` repository slug; no repository rename or remote upload has been performed by this agent. The updated repository URL or explicit choice of the existing public repository is pending.

## Selected repository

The owner selected the existing public repository `saifulrehman62913-blip/NextGen-AI-Academy` for this project. The academy display name is ILMIGO DIGITAL ACADEMY; the repository slug remains unchanged. Source and prepared verification workflows are now being uploaded. Actual cloud-build results will be recorded after the jobs run. Prior local reports describe the pre-cloud environment and must not be read as native-build success.

## Cloud verification in progress

Source was pushed to the owner-selected repository. The first real CI run exposed a Node 22 test-flag incompatibility; the supported project runtime is now Node 24, matching local verification. Native cloud checks are being evaluated; success will be documented only after completed jobs.
