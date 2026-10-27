# ILMIGO DIGITAL ACADEMY 0.4.0 — annual subscription implementation

Owner-confirmed plan: **USD 10 per year base price**, with **one explicit free 3-day/72-hour trial per verified account**. Payout preference: Meezan Bank, Pakistan. No merchant/bank account or live payment has been configured or verified.

## Build evidence

Native/backend code commit: `b1959da4bfe0dba3a0616e9075809c8d5fae7cc1`.

[GitHub Actions run 40466353657](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40466353657).

- Cloud web/backend tests: **62 passed, 0 failed**.
- Android: analysis completed with 0 errors and 8 nonfatal informational findings; **14 Flutter tests passed**; debug APK built.
- iOS: analysis completed with 0 errors and 8 nonfatal informational findings; the same **14 Flutter tests passed** on macOS; simulator app built.
- Additional web-only correction after the build commit: membership responses cannot open lessons after an account switch, and a full device store cannot crash paid-mode initialization. Web build and **63 Node tests passed locally**, including the new account-switch regression. Native code is unchanged from the verified commit.
- Paid asset preparation was exercised locally: the native asset contained no lesson bodies, while the backend's 40-lesson catalog remained intact. Normal curriculum assets were regenerated afterwards for preview/testing.

No production-flagged/signed build, physical-device purchase, live database migration, email delivery, provider transaction, renewal/refund lifecycle or bank payout was exercised. Eight informational analysis findings are not a guarantee of no defects. Test transports simulate external providers; they do not prove merchant setup works.

## Downloads

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40466353657/artifacts/12716114249): extract `app-debug.apk`. Archive SHA-256: `e5559b10e86d3528d7ebfc9c9949f65037a25b82accc2fa340f0f64dd27eb549`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40466353657/artifacts/12717280168): not installable on a physical iPhone. Archive SHA-256: `7bb16726b789d4b31b5b61643a2072195e0e96ae04c50dedbd04a080c9d7c880`.
- [Standalone web preview](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40466353657/artifacts/12716613278): this build-commit preview predates the two subsequent web-only corrections described above; latest source/local generated preview includes them.

These remain unconfigured previews: no backend URL, paid-build flag or live SDK keys were supplied to the native builds, and purchases are disabled. GitHub sign-in may be required. Artifacts expire 25 January 2027. Digests and sizes are GitHub metadata, not independently inspected archive contents.

## Implemented flow

1. A verified adult account explicitly starts its trial. Login alone does not take a payment. No card or paid subscription is created by the trial API.
2. The database records fixed timestamps once using an account primary key and insert-on-conflict. Repeat requests return the existing trial; they cannot extend it. Reinstall, logout, new family profiles or learning-data deletion do not reset it. A deleted/recreated auth account is a different account; this is not one-trial-per-person verification.
3. Enabled subscription mode serves course bodies through authenticated `/api/member-catalog` only while trial or annual access is verified. Public API/static catalogs contain metadata only. Migration 003 removes direct general published-course reads. Paid mobile preparation removes bundled lesson bodies. Production native builds verify access at lesson entry, requiring connectivity.
4. AI access is enforced on the server. The expired/unstarted trial is rejected before reserving AI quota or calling OpenAI. Trials allow 3 turns per UTC day; verified paid Plus allows 20. Conversation/text feedback share that allowance; provider failures can consume reserved turns.
5. Native purchase UI offers configured annual packages only, displays the store price and renewal terms, checks the configured USD storefront price is exactly 10, and uses actual RevenueCat purchase/restore methods. No simulated payment grants access. Supabase verified UUIDs identify subscribers, and server entitlement checks require an allowed product with a future expiry. Extra store-trial grants and non-expiring grants are not accepted as annual purchases.
6. Trials never automatically convert or charge. A separately purchased annual store subscription renews unless cancelled in the store. Restore/cancellation links and a bilingual draft subscription-terms page are included. Purchases stay disabled until provider activation and signed store setup.

This is application access control, not DRM against device control or access to the already-public original draft source. Existing preview releases were free and are not retroactively converted into paid releases.

## Owner action required

Follow [Pakistan/Meezan payment setup](PAYMENT-SETUP-PAKISTAN.md): OpenAI API billing, Supabase project/migrations/SMTP, Google Play merchant account, RevenueCat project, Apple Developer/App Store Connect, annual products, final terms/support details, release signing and sandbox lifecycle verification. Configure actual merchant/bank information only in official dashboards.

Google lists Pakistan as supporting developer and merchant registration. Meezan acceptance and the correct bank/currency details still require store/bank verification. USD 10 is gross customer pricing; fees, taxes, exchange rates, settlement timing and thresholds affect net bank proceeds. RevenueCat is the verification bridge; stores handle customer charges and payouts.

Course language review/expansion, the other 32 language tracks, production child consent/scoped sessions and physical-device/accessibility/RTL/voice QA remain separate unfinished production work. No feature in this release certifies professional fluency.
