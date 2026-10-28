# ILMIGO 0.7.0 — introductory courses for the other 32 languages

96 new draft lessons are authored and connected to web/native learning flows: three per language, each with a suggested 30-minute plan. Combined catalog: 34 languages, 136 lessons. Existing English/Urdu IDs and their 20-lesson tracks are preserved.

## Content delivered

Each new language has greetings/courtesy, simple replies/apologies and counting one to four. Every lesson contains four target expressions with English/Urdu glosses and approximate Roman aids, a reading/drill, language-specific usage notes, speaking/writing practice, self-review rubric and four quiz checks. Duplicate expressions used for both attention and apology are deduplicated in quiz choices; identical written forms are not offered as separate wrong choices. This is taught-phrase matching, not a general synonym or proficiency test.

Courses are original introductory drafts, not complete professional-fluency courses. No qualified linguistic/audio reviewer has certified them. Gender, politeness, tone, script and context caveats are included. Partner drills are labelled as drills rather than natural conversations. Pashto is a general foundation set, not a completed Swabi-specific regional course. Pakistani Punjabi uses Shahmukhi, with pa-PK device locale rather than pa-IN. Installed speech recognition/TTS availability is device/provider dependent; Roman aids do not substitute for pronunciation review.

The new course data lives in scripts/foundation_phrases.json and the structured builder scripts/foundation_courses.py. These are included in both sanitized source packaging and the Docker build context. Rebuilding deterministically restores the expanded catalog; no live translation/AI API is needed. Individual curriculum exports are under courses/{language}-curriculum.md.

## Integration

All language catalog entries have actual sample lessons. Onboarding now offers all 34 available languages in web/Flutter; explanation languages remain English/Urdu. App copy distinguishes the 20-lesson English/Urdu drafts from the three-lesson starter tracks. Catalog revision increases to four so valid older cached catalogs upgrade. Per-language planned minutes are explicit: English/Urdu 600 each, other tracks 90 each. Paid-access checks, trial policy and child scopes are unchanged.

## Verification

Local build/syntax checks and all 114 Node tests pass. New tests check every new language's schema/content coverage, distinct ordered readings, all-question grading, wrong-answer rejection, three-lesson progression, repeat XP idempotence and catalog/native asset equality.

CI adds native progression coverage for all 32 courses and an actual Chrome flow that selects every new language, opens its first lesson, checks reading direction/content, saves writing, answers its assessment and verifies progress after reload. This tests integration, not qualified translation accuracy or actual microphone/TTS output. Final cloud results are recorded below after completion.

Owner setup/live payments, qualified language/audio review, expansion beyond these starter lessons and physical-device testing are not completed by adding this content. Automated passes cannot guarantee zero bugs or professional proficiency.

## Final cloud evidence and downloads

Application commit: `6133d669df71c7e5f4d6b984267d2b42038c7392`. [Run 40633111573](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40633111573) succeeded in all three jobs.

114 Node tests, 36 PostgreSQL assertions, Docker build/HTTP smoke and eight Chrome scenarios passed. Both Linux/macOS passed the same 30 distinct Flutter tests, including progression through all three lessons in each new course. Each native analysis reported No issues found. The actual generated Xcode template check and missing-owner Android signing guard also passed.

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40633111573/artifacts/12792940448): extract app-debug.apk.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40633111573/artifacts/12792532432): not a physical-iPhone IPA.
- [Web preview](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40633111573/artifacts/12792666698).
- [Browser evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40633111573/artifacts/12792671623).

Artifacts expire 26 January 2027; GitHub sign-in may be required. Native downloads are unconfigured previews, not live paid/store releases. GitHub artifact metadata/digests are in cloud/foundation-course-verification.json; archive bytes were not independently unpacked locally. Browser screenshots were generated, not manually visually reviewed. Documentation and availability-copy follow-ups do not change tested course data or application behavior.
