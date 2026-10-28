# 32-language audio approval — actual status

The repository contains 96 beginner draft lessons across these 32 languages. Current supplied audio recordings: **zero**. Qualified lesson approvals: **zero**. Actual listening approvals: **zero**. The app currently relies on device/provider TTS; no language/audio approval is inferred from a successful app build or a voice-availability flag.

## Prepared now

Run `python3 scripts/prepare-audio-review.py` to produce `ILMIGO-32-language-audio-review-scripts.zip` beside the repository. It contains 96 exact native-script lesson reading files, expected recording names, script SHA-256 hashes and blank recording/reviewer evidence fields. It generates no audio and issues no approval. Saraiki has no ISO 639-1 code; unsupported languages must never be silently replaced by another language.

The connected speech tool estimates one credit per 50 characters, minimum one per call: these 96 separate lesson scripts estimate **96 credits before retries/alternate voices**, subject to actual language/account support. This is a planning estimate, not a charge, a guarantee of supported languages or approval. The user delegated connection selection. The selected connection rejected the French pilot before generation because speech requires a paid plan; both connections resolve to the same Free workspace with no available speech models. The user has explicitly declined a paid plan. Do not retry paid generation or purchase a subscription.

Before qualified approval, actual recordings must be created/supplied and checked for technical validity and script alignment. Competent speakers/teachers must listen for pronunciation, tones, vowel length, dialect/register and naturalness, record corrections and identify the exact provider/voice/locale/version and sample. Bind approval to the script and recording hashes. Different device voices and arbitrary AI replies cannot be pre-approved by one sample.

## Free-only audio path

Use the existing Listen controls in the web and mobile app. These use installed browser/device text-to-speech voices rather than Runway speech generation. The app checks voice availability and shows a written-transliteration fallback when a language voice is missing. Device voice coverage, pronunciation and offline behavior vary; this does not supply 32 reviewed recordings or guarantee support for every language.

On Android, check the system text-to-speech settings and download the target language voice if the installed engine offers it. On iPhone, check Accessibility > Spoken Content > Voices. Setting names vary by OS version. On the website, available voices come from the browser/operating system. ILMIGO does not charge a separate provider speech-generation fee for this route. A device engine may use its own online service; do not assume offline operation without testing it.

For languages without an available device voice, retain the written lesson/transliteration and accept native-speaker recordings supplied with permission. Actual recordings and competent listening review remain necessary for qualified audio approval. No approval status changes merely because a free playback route exists.

## Verification

All **118 local Node tests passed**, including a new manifest test proving all 96 scripts match their source, no MP3/audio is fabricated, no reviewer or approval is invented, and unsupported-code handling is explicit. The latest app runtime remains the previously cloud-verified 0.7.1 build; this change adds preparation tooling/tests, not a new signed app release. No new linguistic certification, real speech generation, payment or external message occurred.

The existing 34-course review packets remain available in the previous verified run. Full professional-course expansion and qualified review are incomplete. Approval cannot truthfully be marked complete with no recordings and no reviewer evidence.
