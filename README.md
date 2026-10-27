# ILMIGO DIGITAL ACADEMY

A bilingual language-learning beta with **ILMIGO**, the robot teacher. Android debug APK and iOS simulator builds have now completed successfully on GitHub Actions.

## Download the test app

- [Android APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712/artifacts/12712984740) — extract and install `app-debug.apk` on Android.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712/artifacts/12712864828) — for macOS ARM64 iOS Simulator; not a signed iPhone IPA.
- [Browser preview ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712/artifacts/12712839543) — open `ILMIGO-preview.html` in a modern browser.

GitHub sign-in may be required for downloads. Artifacts expire on 25 January 2027. These are test/beta artifacts, not store releases.

[Successful workflow run](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40458293712) · [Detailed verification report](review/ILMIGO-CLOUD-BUILD-REPORT.md) · [Machine-readable evidence](review/cloud/verification.json)

Verified code commit: `78063c16ee4bed2080b4ef88b1199e1096959120`. Flutter 3.47.8 stable; Node 24.21.0.

| Verification | Result |
|---|---|
| Web/backend/content checks | 46 passed |
| Flutter tests, Linux | 13 passed |
| Flutter tests, macOS | 13 passed |
| Native analysis | 0 errors; 8 informational notes |
| Android debug APK | Built |
| iOS simulator app | Built |

## What is included

- Original ILMIGO robot, academy branding and English/Urdu explanations with RTL support.
- 20 English and 20 Urdu guided lessons: four units in each of five stages, from first words to workplace communication.
- Grammar/usage notes, reading, dialogue, device listening, optional supported speech recognition, writing drafts, self-review rubrics and assessments.
- Suggested daily plan: review 5m, words/patterns 8m, reading/listening 7m, speaking/writing 7m, assessment 3m.
- Real local progress, streaks/XP, saved lesson resumption and writing drafts.
- Separate family/account stores, explicit guest import, parent PIN and same-account email PIN recovery when cloud service is configured.
- Source integrations for Supabase, text AI feedback and disabled-by-default RevenueCat billing.
- Lesson-scoped adult AI conversations with follow-up questions, bilingual explanations, optional device speech recognition and a button to hear each reply with installed device TTS. Conversations remain in screen/page memory, reset when leaving or changing profile, and share the 3 trial / 20 Plus daily turn quota. Provider/device verification still requires owner configuration.

The 40 lessons are original curriculum drafts awaiting qualified language/audio review. Ten planned hours per language do not guarantee professional fluency or CEFR/occupational certification. The other 32 languages in the catalog remain **coming soon**.

The current APK is an offline-capable preview built without a backend URL. Live accounts/cloud AI/payment services are not active. Real-device/voice/visual QA, production parent consent/session controls, release signing and store publication remain pending. See the detailed report for limits.

## Run or regenerate the web app

Node **24+**, Python 3; no npm dependency installation is needed:

```sh
npm run build
npm start
```

Open `http://localhost:3000`. To open the standalone version, use generated `ILMIGO-preview.html`. Some mobile file viewers do not execute HTML; open it in a browser.

```sh
npm run check
npm test
npm run verify
```

`npm run verify` also attempts native checks: it exits 2 when prerequisites are blocked, 1 on failure, and 0 only when all required checks pass. Older local-host reports under `review/build/` record the missing SDK before cloud verification became available. Current cloud evidence is under `review/cloud/`.

## Native Android / iOS source

Use Flutter stable (verified on 3.47.8), Android SDK for Android, and macOS/Xcode for iOS:

```sh
python3 scripts/build_curriculum.py
python3 scripts/bootstrap_mobile.py
cd mobile
flutter analyze --no-fatal-infos --no-fatal-warnings
flutter test --reporter expanded --concurrency 1 --timeout 120s --fail-fast
flutter build apk --debug
# macOS/Xcode:
flutter build ios --simulator --no-codesign
```

The bootstrap script generates platform projects and microphone/TTS/speech permission declarations. It preserves authored source. Native display name: ILMIGO DIGITAL ACADEMY; robot name: ILMIGO.

To connect an owner-configured HTTPS backend:

```sh
flutter run --dart-define=API_BASE_URL=https://your-server.example
```

Do not place server secrets in Flutter defines. Apple signing/provisioning is required for a physical-iPhone IPA/TestFlight release; the simulator artifact cannot be installed on an iPhone.

## Cloud setup and API

The [production setup checklist](review/PRODUCTION-SETUP.md) includes the Docker deployment commands, secret-safe configuration check and remaining account/product acceptance work. Adding deployment files does not activate providers or establish production readiness.

1. Create a Supabase project; apply migrations `001_ilmigo.sql`, then `002_review_fixes.sql` under `supabase/migrations/`. Existing 0.1 installations apply only 002 after a backup.
2. Enable email OTP and put `{{ .Token }}` in the email template. Set up production SMTP before public launch.
3. Copy `.env.example` to `.env`; configure the Supabase URL, anon key, **server-only** service role key and exact `APP_ORIGIN`.
4. Optionally configure `OPENAI_API_KEY`/`OPENAI_MODEL` and server-only `REVENUECAT_SECRET_KEY`.
5. Run behind HTTPS with web/backend on the same origin, then test actual providers and database policies in staging.

Migration 002 stores daily history, merges completion dates monotonically, limits family size transactionally and preserves anonymised review audit identity when the reviewer's auth account is deleted. It has not been executed against a live project here. Older dates never saved by 0.1 cannot be reconstructed without surviving device history/backups.

Main routes:

- `GET /api/config`, `GET /api/catalog`: capability flags and available free curriculum.
- `POST /api/auth/otp`, `POST /api/auth/verify`: email OTP; no automatic token refresh yet.
- `POST /api/sync`: owner-checked profiles, latest completions and full stored practice-day history.
- `POST /api/speaking`: adult/owner-checked **text** feedback, not audio pronunciation grading. Quota: 3 trial / 20 Plus turns per UTC day; a failed upstream request can consume a reservation.
- `POST /api/conversation`: bounded adult lesson conversation; text history only, owner and language checked, shared AI quota. Returns a target-language reply and English/Urdu explanation; clients use device recognition/TTS, not continuous streamed audio.
- `GET /api/entitlements`: server-side RevenueCat entitlement lookup.
- `POST /api/delete-data`: deletes owned cloud learning profiles/progress; login/quota and local data remain. A subsequent explicit sync can upload local data again.
- `POST /api/delete-account` with `{confirm:"DELETE"}`: deletes the authenticated account/cloud data; clients remove its local store. Store subscriptions must be cancelled separately.
- `GET/POST /api/admin/courses`: trusted admin-only studio. Assign roles via server-managed `app_metadata`, never user-editable metadata.

No live project or secret was provisioned in this task. Never commit service-role, OpenAI or RevenueCat secrets. Only `.env.example` is included.

## Family, privacy and billing

Guest and signed-in users have separate device stores; signing out opens guest space. A new account never silently inherits another account's profiles. Adults can explicitly import guest data they own. Late sync responses after an account switch are ignored. Legacy 0.1 device data is retained as guest data because that version did not bind it to a verified owner.

Parent PINs use salted PBKDF2 hashes, are separate from progress exports and have a retry cooldown. Signed-in owners can recover adult access by verifying the same account's email; another account cannot reset the gate. Guest PINs have no verified email recovery. A local PIN is not encryption, verified age/parenthood or protection from someone controlling device storage. Use device locking/supervision; production needs verified parent consent and independently scoped child sessions.

Child live AI and voice recognition are disabled. Device/browser recognition may use its provider. ILMIGO does not store audio. Writing drafts are local and included in backups, not cloud progress sync. AI receives submitted text only on request. Web fonts may contact Google Fonts; the standalone preview uses system fonts.

RevenueCat purchase/restore code remains **off by default**. Do not enable purchases before reviewed paid content, gating, store products, subscription terms and sandbox lifecycle checks are complete. Public native SDK defines are `REVENUECAT_ANDROID_KEY`/`REVENUECAT_IOS_KEY`; `REVENUECAT_SECRET_KEY` stays on the server. No web checkout is released.

## Content and reproducibility

- [English curriculum + instructor answer key](courses/en-curriculum.md)
- [Urdu curriculum + instructor answer key](courses/ur-curriculum.md)
- `scripts/course_units.py`: original authored bilingual scenario source.
- `npm run curriculum`: generates the shared/mobile catalogs and course exports.
- `/admin.html`: signed-in trusted administrator studio; strict schema/review attestation before publication. All five free levels are supported; paid gating is not released. Admin body limit: 2 MiB; ordinary requests: 256 KiB.
- `.github/workflows/verify.yml`: web checks, Android debug APK and iOS simulator build. Jobs generate lesson assets from source before building.
- `scripts/prepare-github-source.py`: packages source without secret files/caches/derived catalog/preview assets.

Historical reviews record pre-fix/pre-cloud states. The current successful cloud run/report above supersedes their native-build-blocked status, while their remaining production/content limitations still apply.
