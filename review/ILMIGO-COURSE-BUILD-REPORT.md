# ILMIGO 0.3.1 — Courses, build verification aur bug fixes

Date: 27 October 2026.

**Current result:** 40 guided English/Urdu lessons integrated; 46 Node checks pass. Web/content build passes. Android/iPhone build verification remains **BLOCKED**, not passed. No APK/IPA was produced.

## Courses delivered

Agreed phased launch ke mutabiq English aur Urdu pehle tayyar ki gayi hain. Har language mein 20 guided lessons, 600 planned minutes, aur five stages hain:

| Stage | Units per language | Topics |
|---|---:|---|
| Beginner | 4 | Greetings, introductions, numbers, daily routines |
| Elementary | 4 | Time/plans, shopping, directions, past-day narration |
| Intermediate | 4 | Rescheduling, practical advice, comparing options, clear email requests |
| Advanced | 4 | Evidence summaries, contingency planning, constructive disagreement, complaint resolution |
| Professional / workplace | 4 | Interview examples, meetings/action notes, scope/deadline negotiation, presentations/recommendations |

The 32 new scenarios each have six bilingual target phrases, a distinct reading, grammar/usage explanations in English and Urdu, a four-turn dialogue, a speaking/writing task, bilingual self-review rubric and three comprehension/application questions. The original eight beginner lessons retain their stable IDs and now include grammar, writing and self-review guidance.

Daily plan: review 5m + words/patterns 8m + reading/listening 7m + speaking/writing 7m + assessment 3m. These are suggested practice durations, not forced waiting periods.

Instructor exports, including answer keys:

- [English curriculum](../courses/en-curriculum.md)
- [Urdu curriculum](../courses/ur-curriculum.md)

**Content status:** original curriculum drafts; qualified linguistic/audio review pending. Ten planned hours per language do not guarantee professional fluency. These stages organise practice topics; they are not CEFR accreditation or an occupational certificate. The other 32 catalog languages remain “Coming soon.” Swabi Pashto remains a planned regional track.

## App integration

- Learning path now groups actual lessons by their level; advanced/professional cards are no longer empty placeholders.
- Recommended next lesson moves through the ordered course while preserving existing beginner progress.
- Grammar notes appear with vocabulary; dialogues appear with reading/listening.
- Writing tasks save drafts on the device, including after lesson completion. Drafts are not uploaded through progress sync.
- New lessons assess all three questions. Passing requires at least 80%, with every question answered; with three questions this means all three correct. A single correct first answer cannot complete the lesson.
- Reading translations, task/rubric instructions and assessment questions support English/Urdu explanations.
- Newer bundled curriculum supersedes an older cached eight-lesson catalog. An older remote revision cannot replace a newer downloaded native catalog.
- Admin validation supports all five free curriculum levels and validates the extra nested content. Admin body limit is 2 MiB, allowing a full authored collection; ordinary API bodies remain capped at 256 KiB.

## Bugs/issues fixed in this pass

1. **Advanced lessons rejected by old schema:** the beginner-only restriction was replaced with an explicit allowed-level list, while paid-content delivery remains disabled.
2. **Path showed all lessons under Beginner:** web/native paths filter the actual stage and count its completed lessons.
3. **Multi-question bypass:** completion checks the full assessment; the legacy first-answer shortcut fails for multi-question units.
4. **Writing disappeared on completion:** drafts now persist independently of resume sessions and remain after completion.
5. **Old cache hid new courses:** revision checks keep the newer bundled/downloaded curriculum.
6. **Resume lost assessment/writing state:** session state retains current answers, writing and timer/index data.
7. **Native listener syntax:** a Dart arrow/set-literal-shaped callback introduced during implementation was corrected to a block callback during source inspection. Native compilation is still required to confirm the entire project.
8. **Voice cleanup could throw when service unavailable:** stop/dispose cleanup is best-effort.
9. **Verification wrapper reliability:** asynchronous child execution and explicit output files replace sandbox-incompatible synchronous capture. Missing Flutter yields a blocked status and exit 2, never a successful native-build claim.

The earlier account-isolation, progress-history, strict input validation, deletion migration and PIN fixes remain covered by regression checks.

## Verification evidence

Command: `node scripts/verify-release.mjs` (`npm run verify`).

| Check | Result |
|---|---|
| Deterministic curriculum generation | PASS |
| Standalone preview packaging | PASS |
| Browser/shared/server JS syntax | PASS |
| Python source syntax | PASS |
| Node tests | **46 passed, 0 failed** |
| Flutter SDK detection | BLOCKED — `flutter` not installed (`ENOENT`) |
| Native bootstrap | BLOCKED — script reports missing Flutter |
| Flutter analysis/tests | BLOCKED — prerequisites unavailable |
| Android debug build | BLOCKED — prerequisites unavailable |
| iOS simulator build | BLOCKED — requires Flutter and macOS/Xcode |

Overall report: **`partial_native_blocked`**, command exit **2**. This is an intentionally incomplete verification result, not a successful native build.

Evidence files:

- [Machine-readable build verification](build/verification.json)
- [Detailed Node results](build/node-tests.log)
- [Build command log](build/verification.log)

The SDK download attempt required sandbox network access; that request was not approved and the download did not complete. No bypass or credential workaround was used. The current host is Linux; it cannot perform an Xcode iOS build.

Node checks include content structure/distinctness, five-stage progression, advanced assessment validation, malformed-content rejection, account/privacy regressions, saved writing and cache-upgrade cases. Standalone startup/navigation/professional-assessment checks use a **synthetic DOM**, not a real visual browser. Providers are mocked. These tests do not prove professional language accuracy, real microphone/audio behavior, live database migrations or native compiler success.

GitHub Actions now contains Android and macOS iOS-simulator build jobs. Those jobs were authored, not run in a connected repository during this task.

## What is still required

1. Install Flutter on a suitable build host; run bootstrap, `flutter analyze`, `flutter test`, Android debug build and iOS simulator build. Fix any actual compiler/device findings before release.
2. Have qualified English/Urdu reviewers check every lesson, translations, grammar guidance, speech support and rubrics. Revise and record reviewer approval; the current pending status must remain until that happens.
3. Apply/test database migrations 001 then 002 in staging (existing 0.1 installations apply only 002), including RLS, replay/history and reviewer account deletion.
4. Configure/test real OTP, AI feedback and store services. Billing remains disabled; reviewed paid curriculum/gating and terms are not complete.
5. Implement verified parent consent and independent child-session access for a public child platform; the existing device PIN is a local UI gate.
6. Complete real-browser/device/RTL/accessibility/offline/permission QA, privacy/support/monitoring, signing and store submissions.
7. Author/review the remaining 32 language courses before advertising them as available.

**Handoff:** the authored English/Urdu v1 foundations-to-workplace unit set and app integration are delivered. It is not yet an independently reviewed comprehensive professional-fluency course or a build-verified production mobile app.

## 0.3.1 continuation — exact blocker and extra fixes

- Same-account verified email can recover the local parent PIN. Another account’s successful login is rejected for recovery; guest PINs do not gain an email backdoor. Three additional Node regression checks pass.
- Native verification rejects a mismatched recovery identity before replacing the existing session. Native sign-out clears tokens only after the local account switch succeeds. A lookalike remote host no longer qualifies for the local HTTP exception. These native service tests are authored but not executed here.
- All Dart source files passed a delimiter-only inspection. This is not Dart analysis, compilation or Flutter test execution.
- Read-only discovery found no Flutter/Dart, Android SDK, adb or Xcode. Docker daemon access was denied. Connected GitHub search returned no ILMIGO repository.
- The user has been asked to identify a connected GitHub repository or a Flutter/Xcode build host. That answer is still required to run the native jobs. No repository was created, source pushed or CI run in this task.
- Full content review, the remaining 32 courses, real provider/database checks and production parent/session controls remain pending as described above.

## Cloud-build preparation update

The user’s GitHub connection is available. Read-only discovery found an empty public `NextGen-AI-Academy` repository, alongside an unrelated repository. This candidate has not been selected by the user, so no source, commit, PR or workflow run has been created there. The public/private destination choice is pending.

A source-only upload package is now prepared. Its clean-checkout test generated all lesson/web assets and passed **46 Node tests**. The workflow explicitly generates assets in Android and iOS jobs, uses read-only default token permissions, cancels obsolete runs, and errors if expected build artifacts are missing. Native builds remain blocked until a destination/build host is selected and actual CI jobs run.

## Branding update

The user set the academy name to **ILMIGO DIGITAL ACADEMY**. App/browser titles, logo wordmarks, install manifest, native app-label generation and course exports now use that name. The robot teacher remains ILMIGO. Web build and five targeted preview flow checks passed after the branding change; native compilation is still blocked. GitHub metadata/read-only lookup still shows the old NextGen-AI-Academy slug and no visible ILMIGO-DIGITAL-ACADEMY repository. An exact new URL or selection of the existing public repository is pending, so no remote writes/builds occurred.
