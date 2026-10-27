# Owner launch setup — ILMIGO DIGITAL ACADEMY

The repository contains the app, backend, database migrations, guarded signed-build commands and a manual Android release workflow. These instructions do not create provider accounts, activate payments, verify a bank account or publish an app. Do not send private keys, passwords or bank details in chat or commit them to GitHub.

## 1. Backend and email

Deploy the existing Docker image behind HTTPS using your hosting account. Configure APP_ORIGIN as the public app origin and SUPABASE_URL as your project origin. External origins require HTTPS; local HTTP is restricted to explicit development hosts. Store SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY and REVENUECAT_SECRET_KEY in the host secret manager. Service-role, OpenAI and RevenueCat server keys never belong in browser or native client configuration.

Apply migrations 001–004 in order (only missing migrations on an existing, backed-up project). Configure Supabase production SMTP. The email sign-in template must include the numeric `{{ .Token }}` code; a template containing only a magic link does not satisfy the app's code-entry screen. Verify real email delivery and same-owner recovery in staging.

Run the secret-safe backend shape check on the trusted host:

```sh
node --env-file=.env scripts/check-production-config.mjs --paid
```

Then set API_BASE_URL to the deployed HTTPS origin and run the public HTTP check:

```sh
node scripts/check-deployment.mjs
```

This read-only checker verifies public paid configuration, empty public lesson bodies, authentication boundaries, allowed methods, cross-origin refusal and security headers. It does not sign in, call OpenAI, send email, buy anything or prove real database/provider operation. Do not treat its success as purchase, payout or legal acceptance evidence.

## 2. Annual product and payout

Create and approve the Android/Apple annual product and map it to RevenueCat entitlement `plus`. Set the US base price to USD 10/year and use the actual approved identifiers in REVENUECAT_ANNUAL_PRODUCT_IDS. Set SUBSCRIPTIONS_ENABLED=true only after staging acceptance and publisher details are ready.

The app's free trial is an explicitly started, one-time 72-hour account trial. It never automatically becomes a paid subscription. Do not add a separate store introductory trial and expect it to count as paid access; server checks do not accept store trial entitlements as annual paid purchases. A purchased annual plan renews according to the store until cancelled. Checkout must show the real localized price/tax.

Complete the store merchant identity, tax and Meezan bank payout details in the owner's merchant console. Purchase proceeds are settled through the store, not sent directly from the app to a bank account. Net payout can differ from the USD 10 gross price because of fees, tax and currency conversion. No payout has been tested.

## 3. Android signed AAB

Bootstrap uses application ID `com.ilmigo.ilmigo`; register the same package in Play Console, or deliberately update the project identity before its first release. Keep the owner upload keystore/private passwords securely backed up.

For a trusted local build, follow the paid Android command in PRODUCTION-SETUP.md. For GitHub Actions, configure these repository Actions variables:

- ILMIGO_API_BASE_URL — the HTTPS backend origin.
- ILMIGO_REVENUECAT_ANDROID_KEY — the public `goog_` Android SDK key.

Configure Actions secrets:

- ILMIGO_ANDROID_KEYSTORE_BASE64 — base64 bytes of the owner's upload keystore.
- ILMIGO_ANDROID_STORE_PASSWORD
- ILMIGO_ANDROID_KEY_ALIAS
- ILMIGO_ANDROID_KEY_PASSWORD

Manually run **Owner signed Android release** on the reviewed main branch only after owner release acceptance. It validates setup, runs tests, verifies the deployed public paid boundaries, strips bundled lessons, builds the owner-signed paid AAB and uploads only that AAB for seven days. The temporary keystore is removed even on failure. There is no automatic store upload, bank change or payment request. This workflow has not been run with real owner secrets.

## 4. Apple signed IPA

On trusted macOS with Xcode, bootstrap and test the native project. Install the owner's usable Apple Distribution certificate/private key in the build keychain and the exact App Store distribution provisioning profile using Apple's normal tools. The helper never imports certificates, installs profiles or logs into Apple.

Set these environment variables on that trusted host:

- API_BASE_URL — HTTPS backend origin.
- REVENUECAT_IOS_KEY — public Apple `appl_` SDK key.
- ILMIGO_IOS_TEAM_ID — owner 10-character team ID.
- ILMIGO_IOS_BUNDLE_ID — registered explicit bundle ID.
- ILMIGO_IOS_SIGNING_IDENTITY — installed Apple Distribution identity name or SHA-1.
- ILMIGO_IOS_PROFILE_NAME — matching distribution profile name.
- ILMIGO_IOS_PROVISIONING_PROFILE — path to that installed profile file.
- ILMIGO_IOS_EXPORT_OPTIONS — path to the owner's export plist.
- ILMIGO_RELEASE_ACCEPTANCE=verified — only after owner staging/release acceptance.

The export plist must select `app-store-connect` (or supported `app-store`), `teamID` matching the owner, `signingStyle=manual`, and `provisioningProfiles={registered bundle ID: matching profile name}`. Use `destination=export`, `uploadSymbols=false` and `manageAppVersionAndBuildNumber=false`; do not request upload. If signingCertificate is present it must match the selected owner identity.

Run:

```sh
python3 scripts/build-paid-ios.py
```

The helper validates profile expiry/team/bundle/distribution and signing identity, prepares paid client configuration, archives/exports with Xcode, verifies signatures/team/bundle/profile and writes `mobile/build/ios/ilmigo-paid/ILMIGO.ipa`. Temporary public defines and lesson stripping are restored/removed on success or failure. A no-codesign configuration step alone never counts as an IPA. Real signed export is not verified without owner credentials. App Store/TestFlight upload and review remain owner console actions.

## 5. Final owner acceptance

Before paid publication, verify live OTP, child-session consent/revocation, sync/recovery/deletion, AI quotas and real store sandbox purchase/restore/renewal/expiry/cancellation. Fill the actual publisher identity, support/privacy contact, privacy URL and store declarations. Those details cannot be inferred from the app name. Scope the store listing to reviewed/published content only.

The user has kept course expansion, qualified course review, the other 32 language curricula and physical-device testing outside the current coding round. They remain separate release requirements; this setup guide does not mark them complete or override them.
