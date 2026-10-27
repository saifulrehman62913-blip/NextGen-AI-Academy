# Owner-confirmed subscription and Pakistan payout setup

Confirmed: USD 10 per year base price; one explicit free 3-day (72-hour) trial per verified account; owner wants payout to Meezan Bank, Pakistan. The trial does not start a paid store subscription or auto-charge. Annual purchases renew unless cancelled through the store.

## Accounts the owner needs

1. **OpenAI API account/project with API billing**. An existing OpenAI login can be used if API access/billing is available. A ChatGPT subscription is not API credit. [Official separate billing explanation](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform).
2. **Supabase project** for email verification, account profiles and durable one-time trial records. Apply migrations 001, 002, 003, then 004. Use production SMTP and HTTPS. Do not reset the trial ledger when deleting only learning progress.
3. **Google Play Console developer + merchant/payments profile** for Android subscriptions. Pakistan is listed as supporting both developer and merchant registration; its default developer currency is PKR. Use the owner's real Pakistan identity/business information. [Official supported locations](https://support.google.com/googleplay/android-developer/answer/9306917).
4. **Apple Developer / App Store Connect** for iPhone distribution, with the Paid Apps Agreement, required tax forms and banking information. [Official banking setup](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information).
5. **RevenueCat project** connecting the two store apps and entitlement `plus`. RevenueCat coordinates purchase verification; the relevant store handles customer charges and bank payouts. Configure authenticated Supabase user UUIDs as App User IDs and the restore behavior to keep purchases with the original app user. Verify the restore/account-transfer policy in sandbox before sales. [Official RevenueCat restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior).

Meezan acceptance has **not** been verified. Add the account only in the official store payments dashboard after confirming payout eligibility with the store and bank. Account-holder identity must match the registered legal owner. The bank should supply the correct account/IBAN, routing/SWIFT and currency details; do not guess them or paste them in chat/public source. Apple notes that if its bank search cannot identify a bank, it may not be able to pay it. [Official banking reference](https://developer.apple.com/help/app-store-connect/reference/reporting/banking-information).

USD 10 is the intended gross customer price, not a guaranteed USD 10 net deposit. Store/service fees, taxes, currency conversion, payout thresholds and schedules can affect proceeds. Payouts are not instant per-login or per-purchase transfers to a bank. [Apple payment requirements](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments).

## Configure the annual products

- Create dedicated **annual** subscription products and a RevenueCat annual package; use product identifier `ilmigo_plus_annual` or configure the exact identifiers returned in RevenueCat. Do not share one product ID with a monthly plan. Confirm the US storefront supports the exact USD 10 price before activation; do not silently substitute another price point.
- Configure the base plan as one year, attach it to entitlement `plus`, and do not add a second store free trial/introductory trial. The application supplies the one-time 72-hour trial independently.
- Set the actual store prices in the store dashboards. App metadata cannot create a real store price. Local storefront prices/taxes are displayed by the store SDK; native checkout refuses an unexpected USD price.
- Complete publisher/support information, reviewed sellable content, privacy and final subscription terms before enabling sales. The included terms page is a draft and clearly identifies unpublished content.
- Sandbox-test purchase, user cancellation, renewal, expiry, billing retry/grace behavior, refund/revocation, restore with the original account, and attempted restoration under another app account. Verify server entitlement decisions against actual RevenueCat responses.

## Backend and native configuration

Keep all server credentials in the hosting secret manager. Configure Supabase keys, `OPENAI_API_KEY`, `REVENUECAT_SECRET_KEY`, exact `REVENUECAT_ANNUAL_PRODUCT_IDS`, HTTPS `APP_ORIGIN`, then `SUBSCRIPTIONS_ENABLED=true` only after the above setup is ready. The default remains false. Invalid/incomplete subscription configuration fails at startup.

The enabled backend hides lesson bodies from public catalog endpoints/static catalog and serves them through authenticated `/api/member-catalog` only while trial/paid access is active. Migration 003 removes direct anonymous/general published-course reads. AI is enforced server-side after trial expiry. Lesson access is checked on entering a lesson; this is not DRM against someone controlling a device or reading the already-public draft source repository.

Before release, configure an owner-controlled Android upload keystore/Gradle release signing and Apple signing/provisioning. ILMIGO bootstrap replaces Flutter’s default debug release fallback with owner-only environment signing. Set ILMIGO_ANDROID_KEYSTORE, ILMIGO_ANDROID_STORE_PASSWORD, ILMIGO_ANDROID_KEY_ALIAS and ILMIGO_ANDROID_KEY_PASSWORD securely; no secret values are written into Gradle source. Missing credentials/keystore paths explicitly stop a release. Never commit keystores or passwords. Follow the [official Flutter Android signing guide](https://docs.flutter.dev/deployment/android#sign-the-app).

Run native tests against generated curriculum first, then prepare a paid production build:

```sh
python3 scripts/build_curriculum.py
python3 scripts/bootstrap_mobile.py
# Run analyze/tests on a host with Flutter before the next step.
python3 scripts/prepare-paid-mobile.py
cd mobile
flutter build appbundle --release --dart-define=SUBSCRIPTIONS_REQUIRED=true --dart-define=ENABLE_PURCHASES=true --dart-define=API_BASE_URL=https://YOUR_BACKEND --dart-define=REVENUECAT_ANDROID_KEY=YOUR_PUBLIC_ANDROID_SDK_KEY
# On macOS, use the corresponding public iOS SDK key and your Apple signing setup:
flutter build ipa --release --dart-define=SUBSCRIPTIONS_REQUIRED=true --dart-define=ENABLE_PURCHASES=true --dart-define=API_BASE_URL=https://YOUR_BACKEND --dart-define=REVENUECAT_IOS_KEY=YOUR_PUBLIC_IOS_SDK_KEY
```

The paid asset contains language metadata only, not bundled course bodies. Native paid builds require verified membership/internet at lesson entry; guest/offline paid access is not granted. Generated debug artifacts remain explicitly unconfigured previews with purchases disabled. Neither a signed production artifact nor a live payment/payout was produced here.

`POST /api/trial` requires authentication, an owned adult profile and explicit `confirm:true`; the database primary key and insert-on-conflict preserve the original timestamps. Sign-out, reinstall, new family profiles and learning-data deletion do not reset it. Account deletion removes its ledger; a newly verified account is a different account. This prevents duplicate trials per account, not multiple accounts per person.
