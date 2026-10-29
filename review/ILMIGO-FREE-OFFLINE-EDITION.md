# ILMIGO 0.8.1 — free offline learning beta

This native build has no configured backend URL and does not require an account or a purchase for bundled lessons. The 168 draft lessons, 30-minute plans, local progression, writing drafts, family profiles and parent PIN remain available. Listening uses supported installed device voices; some engines/voice downloads and optional recognition need internet. No recorded audio or guaranteed support for every voice is implied.

## Changes

When cloud configuration is absent, speaking practice offers device Listen, optional supported recognition and local word comparison. It hides unavailable AI/conversation controls. The family page displays local-saving guidance and hides email sign-in and subscription prompts. Privacy copy also explains the lack of cloud backup without directing offline users to unavailable sign-in. Direct sign-in attempts return a clear local-edition message rather than opening a nonworking OTP flow. Cloud-configured editions retain their existing signed-in AI flow and paid-access guards.

Native word comparison now ignores common target-script punctuation (including Arabic/Urdu question marks, Indic danda and East Asian stops) without stripping meaningful accents/letters. A regression covers these cases.

Two native widget regressions verify usable offline word comparison and the family screen's local controls without dead account/purchase prompts. Existing cloud fixtures continue exercising the configured AI path. No production credentials, paid plan, live AI, payment activation, owner signing or store publication is included.

Verification: pending latest native cloud run. The previous 0.8.0 run verified 124 Node tests and 33 Flutter tests per host. Update this report with the exact 0.8.1 commit/run and artifacts only after they succeed.

## Installation and limits

Extract app-debug.apk from the Android artifact ZIP and install it on a compatible Android phone, allowing installation from the chosen file manager/browser when prompted. This is a debug beta, not a Play Store release. Keep app data to preserve local progress; clearing/uninstalling the app can remove it. This does not create cloud backup. Never uninstall a working installation merely to test an update without protecting its data.

Full professional-course expansion, qualified language/audio review and physical-device acceptance remain pending. Supabase/hosting accounts are not ready and physical testing is currently unavailable, as confirmed by the owner. This edition provides local practice while those dependencies remain unavailable.
