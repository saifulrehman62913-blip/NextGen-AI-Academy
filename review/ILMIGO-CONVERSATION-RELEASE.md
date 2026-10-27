# ILMIGO DIGITAL ACADEMY 0.3.2 — conversation beta

## Verified builds

Product code commit: `71dfb6392fef0f17f908badd4e33aecdc83fdfd6`.

[GitHub Actions run 40461426439](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40461426439): all three jobs completed successfully.

- Web/backend: 54 tests passed, zero failures.
- Android: analysis completed with eight nonfatal informational findings, all 13 Flutter tests passed, debug APK built.
- iOS: analysis completed with eight nonfatal informational findings, all 13 Flutter tests passed, simulator app built.

These are 13 distinct Flutter tests executed on two hosts. This is not physical-device, store-signing or live-provider verification. Artifact metadata/digests come from GitHub; archive bytes were not independently inspected locally.

## Downloads

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40461426439/artifacts/12715201015). Extract `app-debug.apk`. SHA-256 of artifact archive: `4a56c02f9864a97c5f7b24f0e765116212e2af93927ab9aa34b57a8c621dadda`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40461426439/artifacts/12715205829). For macOS iOS Simulator; cannot install on an iPhone. Archive SHA-256: `1b37c162193076170dd4686e96c72fa721df097d66fc8cb9e868eed689749a6d`.
- [Web preview at the verified commit](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40461426439/artifacts/12714213326).

GitHub sign-in may be required. Artifacts expire 25 January 2027. Native artifacts have no backend URL configured and do not activate cloud AI or purchases.

## New implementation

`POST /api/conversation` verifies the signed-in owner, adult profile and current lesson language. It shares the atomic daily allowance with text feedback: three free-trial turns or 20 Plus turns per UTC day. Bounded alternating text history is validated before quota reservation; client-supplied system roles are rejected. Unreadable/incomplete AI output returns a service error. Upstream failure can consume a reserved turn.

The model receives the lesson objective, level, sample phrase and text history. It returns a short target-language reply with a follow-up question, plus English/Urdu explanation. Clients offer optional existing device speech recognition and an explicit button to play replies using installed device TTS. This is turn-taking, not continuous real-time audio streaming or acoustic pronunciation grading.

Web and native screens keep conversation history only in memory and clear it when leaving/changing profile. Late conversation responses are ignored after account/profile changes. AI requests send the submitted text/history to the configured provider. Child live AI and recognition remain disabled. After five exchanges the UI asks the learner to start a new conversation; resetting does not reset the daily allowance.

## Additional web correction after the build commit

The source also stops active recognition/playback on page or profile render, preventing an adult recording session from continuing into another profile. Recognition callbacks are detached before aborting. The web build and all 54 Node tests passed again locally after this correction. The linked preview artifact predates this web-only correction; the generated local preview and latest source include it. Native code is unchanged from the verified commit.

## Still required for production

No provider credentials or outbound service identities are configured in the execution environment. Supabase migrations, OTP delivery, OpenAI live calls and RevenueCat sandbox transactions have not been executed against owner accounts. Purchases remain disabled; paid gating/content/subscription terms still need implementation and review. Apple/Google owner accounts and signing material are required for store releases. Full professional curricula for the other 32 catalog languages are not authored, and the current 40 English/Urdu lessons still need qualified review/expansion. Production child consent/scoped sessions and real-device/voice/accessibility/RTL QA remain open.

See [production setup and acceptance checklist](PRODUCTION-SETUP.md). Docker asset generation was tested in an isolated source context; the Docker engine/image runtime was unavailable locally and is not claimed verified.
