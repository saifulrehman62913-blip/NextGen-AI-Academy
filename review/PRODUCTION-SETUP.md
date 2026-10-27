# Production setup and outstanding verification

Current consolidated owner steps: [OWNER-LAUNCH-SETUP.md](OWNER-LAUNCH-SETUP.md), including the manual Android workflow, signed Apple export helper and read-only deployment checker.

The successful beta build is not a deployed production service. This checklist records actual dependencies; no account, payment or signing setup has been completed by adding these files.

## Backend deployment

The repository now includes a non-root, multi-stage Docker image. Build from the repository root:

```sh
docker build -t ilmigo-backend .
docker run --rm --env-file .env -p 3000:3000 ilmigo-backend
```

The image generates curriculum during its build. Its allowlisted build context excludes `.env`, exports, caches and signing materials. Inject runtime credentials using the hosting provider's secret manager. Place the service behind HTTPS and set `APP_ORIGIN` to the exact public web origin (without a trailing slash). The health check verifies HTTP availability only, not provider connectivity. The image build and HTTP smoke checks have now passed on GitHub Actions in run 40485530870. This proves the unconfigured container starts and serves the app; it does not verify live providers.

Before deployment, run the secret-safe, offline configuration check:

```sh
node --env-file=.env scripts/check-production-config.mjs
```

This checks field presence and URL shape only. It does not prove that keys are valid or that external services work. Never paste credentials in chat or commit them to the public repository.

## Owner account setup and acceptance

- Supabase: create/select the owner's project; apply migrations 001, 002, 003 and 004; configure email OTP and production SMTP. Verify sign-in, cross-account isolation, progress sync, parent recovery and account deletion against the real database.
- OpenAI: configure the server key and billing/usage limits. Verify adult text-feedback requests and quotas. The new lesson-scoped conversation endpoint supports text exchanges with device speech recognition and device TTS on clients. Live provider and physical-device checks remain required; no audio pronunciation scoring is provided.
- RevenueCat/store accounts: decide products and prices; configure entitlement `plus`; verify the implemented trial/access checks, protected member catalog and final subscription terms before enabling purchases. See PAYMENT-SETUP-PAKISTAN.md for the confirmed USD 10/year, one-time 3-day trial and Meezan payout requirements. Verify purchase, restore, renewal, expiry and cancellation in store sandboxes. The current purchase flag remains disabled.
- Android: owner-controlled release keystore/Play signing and production application ID are required. Bootstrap now installs an owner-key-only release guard; supply ILMIGO_ANDROID_KEYSTORE, ILMIGO_ANDROID_STORE_PASSWORD, ILMIGO_ANDROID_KEY_ALIAS and ILMIGO_ANDROID_KEY_PASSWORD through secure environment settings. Keep signing material in protected CI secrets, never source control. The existing artifact is debug signed.
- Apple: Apple Developer membership, App Store Connect app, team/bundle identifiers, certificate and provisioning profile are required for an installable signed IPA/TestFlight. The existing simulator artifact cannot install on an iPhone.

## Product work still requiring completion

- Author and obtain qualified review for the remaining 32 catalog languages. Review and expand the current 40 English/Urdu draft lessons; they are not a complete professional-fluency qualification.
- Verify the new lesson-based conversation on configured providers and real devices: speech recognition, installed-device TTS replies, connectivity and microphone permission behavior. This is user-triggered turn-taking, not continuous real-time audio streaming.
- Scoped child sessions, consent events, revocation and same-owner parent return are implemented and tested. Complete live staging tests and final publisher/market-specific consent-policy review before a public child-account launch.
- Perform Android/iPhone device, accessibility, RTL and audio QA. Store privacy declarations must reflect the final configured providers and behavior.

All four SQL migrations and 36 integration assertions now pass on a disposable PostgreSQL 16 database, including concurrent trial/quota/family-limit calls and row isolation. The test database uses stand-in auth roles/functions, not a live Supabase project. Live deployment, actual JWT/OTP integration and existing-project rollout still require staging verification.

Account setup alone does not finish these product tasks. Do not label the app production complete until the resulting implementation and acceptance checks have evidence.

## Paid Android release command

After bootstrap and native acceptance checks, run `node --env-file=.env scripts/check-production-config.mjs --paid` for the backend's paid configuration. This rejects disabled subscriptions and missing/placeholder RevenueCat server configuration, without printing credential values or contacting providers.

On the trusted Android build host, provide `API_BASE_URL` (HTTPS origin), `REVENUECAT_ANDROID_KEY` (public Android SDK key), the four `ILMIGO_ANDROID_*` signing variables listed above, and `ILMIGO_RELEASE_ACCEPTANCE=verified` only after staging/content/privacy/device acceptance. Then run:

```sh
python3 scripts/build-paid-android.py
```

The command enables `ENABLE_PURCHASES` and `SUBSCRIPTIONS_REQUIRED`, strips mobile lesson bodies during compilation, invokes owner-signed `flutter build appbundle --release`, and restores the original asset even after compiler failure. Public Dart defines use a temporary file that is deleted afterward; server secrets are never included in it. A previous generated AAB is removed before building so it cannot be mistaken for a successful fresh artifact. The expected output is `mobile/build/app/outputs/bundle/release/app-release.aab`. This helper does not bootstrap native projects, upload an app, prove provider readiness, or certify content review. No real owner-signed AAB has been built without the owner's credentials.
