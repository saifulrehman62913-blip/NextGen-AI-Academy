> **Historical 0.1.0 review.** These were the pre-fix findings. Current implementation and remaining verification limits are documented in [ILMIGO-FIX-REPORT.md](ILMIGO-FIX-REPORT.md).

# ILMIGO — Complete Review Report

Review date: 26 October 2026  
Reviewed release: 0.1.0 development starter  
Decision: **Production release HOLD. Prototype ke taur par aage develop ki ja sakti hai; complete ya bug-free app abhi nahi hai.**

## 1. Seedha jawab

Aapki requested mukammal Android/iPhone language-learning app abhi complete nahi hui. Source, browser preview aur backend starter maujood hain. Lekin native build verify nahi hua, full courses nahi bane, aur review mein real bugs mile hain.

Purane **16 automated tests dobara pass** hue. Naye audit checks ne **5 issues reproduce** kiye. Is ke ilawa **1 SQL schema risk** aur **1 documented offline-content gap** source inspection se confirm hue. Tests ka pass hona tamam features ke theek hone ka saboot nahi: pehle tests in naye scenarios ko cover nahi karte the.

**Finding statuses is report mein OPEN hain. Review ne bugs identify kiye hain; inki fixes is package mein apply nahi hui hain.**

## 2. Kis cheez ka kitna kaam hua hai?

| Hissa | Maujooda haalat | Verification |
|---|---|---|
| ILMIGO logo aur logo-shirt robot | Web SVG aur Flutter vector mascot source maujood | Source inspected; native animation/device rendering unverified |
| Professional color theme | Navy, turquoise, mint, warm yellow; responsive CSS | CSS inspected; browser visual QA unverified |
| 34-language catalog | 34 unique entries | Automated content check PASS |
| English/Urdu lessons | 4 + 4 original beginner samples | Structure checked; professional linguistic/audio review nahi hua |
| Baqi 32 languages | Catalog mein “Coming soon” | Complete courses nahi hain |
| Swabi Pashto | Pashto catalog ke andar planned variant | Regional lessons/audio nahi bane |
| Basic se professional levels | Beginner samples; baqi levels placeholder/development state | Full curriculum, placement aur proficiency assessment missing |
| Daily 30-minute plan | 5 + 8 + 7 + 7 + 3 minute suggested blocks | Sum 30 PASS; actual 30-minute study enforce nahi hoti |
| Quiz aur XP | Wrong answer completion nahi deta; repeat se XP multiply nahi hota | Existing tests PASS |
| Progress/streak | Local logic maujood | Basic tests PASS; cloud replay/history issues R02 mein |
| Resume lesson | Session/index/timer state ka source maujood | UI/device end-to-end test nahi hua |
| English/Urdu UI | Translation switching aur RTL source maujood | Har instruction translated nahi; quiz prompts English mein rehte hain |
| Reading/listening | Written passages aur device TTS | Real-device voices aur Urdu support unverified |
| Speaking practice | Optional recognition aur transcript word matching | Pronunciation assessment nahi; microphone/device QA pending |
| AI | Server-side text feedback integration | Mocked request flow tested; live OpenAI service nahi chalayi |
| Family profiles | Local progress alag; cloud owner checks | Basic isolation PASS; verified parent security lock nahi |
| Email OTP/cloud sync | Supabase integration source | Mocked HTTP handler tests PASS; live Supabase test pending |
| Offline | Bundled samples; web service worker | Remote collections persist nahi hotin; R06 |
| Subscription | RevenueCat bridge source, default OFF | Real store purchase/restore test nahi; paid course delivery missing |
| Admin studio | Draft/review/publish endpoints aur UI | Role checks PASS; published lesson validation bug R03 |
| Android/iPhone deliverable | Flutter source aur shell-generation script | APK/IPA nahi bana; compile/analyze/device tests unverified |
| Hosting/store launch | Setup instructions aur CI workflow | Deployment, signing, store submission nahi hui |

Is table ka “source maujood” matlab code likha hua hai; iska matlab live feature successfully tested nahi hai.

## 3. High-priority issues

### R01 — Account badalne par purana family data naye account mein upload hota hai

**Severity: HIGH · Status: OPEN · Evidence: automated reproduction**

- Source: `web/app.js:54`, `web/app.js:57`; native equivalent `mobile/lib/services.dart:24` aur `:28`.
- Logout access token aur cloud IDs hata deta hai, magar local profiles aur unki progress wahin rehti hai.
- Naye account ka sign-in/sync device par maujood tamam profiles upload karta hai.
- Reproduction: account A ka nickname/profile save kiya; logout action chalaya; B ki session lagayi; actual `syncCloud()` chalaya. B ke upload payload mein A ka nickname aur profile aa gaya.
- Asar: shared family device par unintended personal-data transfer. Database ownership checks apni jagah kaam karte hain, lekin client khud purana data naye owner ko bhej deta hai.
- Fix: local stores ko authenticated user ID se partition karein. Sign-out par active account store detach karein. Guest progress import sirf explicit choice par ho; doosre account ki progress kabhi silently import na ho.
- Acceptance: A → logout → B mein A ke names/progress B ke upload ya UI mein na aayen; guest import aur account restore alag verify hon.

### R02 — Lesson repeat ki nayi date cloud ki purani date se overwrite hoti hai

**Severity: HIGH · Status: OPEN · Evidence: automated reproduction**

- Source: `server/server.mjs:65`, `web/app.js:54`, `mobile/lib/learning.dart:81`; schema `supabase/migrations/001_ilmigo.sql:21`.
- Attempts table mein har profile/lesson ke liye sirf ek row hai. Sync `resolution=ignore-duplicates` use karta hai.
- Kal complete hua lesson aaj repeat karne par server nayi date ko ignore karta hai. Client remote record ko local record par merge karke aaj ki completion date purani kar deta hai.
- Reproduction: local completion `2026-10-26`; cloud existing record `2026-10-25`. Sync ke baad current completion date `2026-10-25`, aur aaj ke planned completed minutes 30 se 0.
- Asar: daily-goal display inconsistent. Dusre device par purani practice days ka poora streak bhi recover nahi hota, kyunki `days` history separately sync nahi hoti.
- Fix: mastery/completion aur daily practice history alag store karein. Latest completion ke liye deterministic merge use karein; profile/day history idempotently sync karein. XP per lesson hi rahe.
- Acceptance: kal/aaj repeat, offline replay, reverse sync order aur second-device restore mein aaj ka goal aur tamam practice days same rahen.

### R03 — Invalid quiz publish hokar lesson player break kar sakta hai

**Severity: HIGH · Status: OPEN · Evidence: automated reproduction**

- Source: `server/server.mjs:93`; web consumer `web/app.js:45`; native consumer `mobile/lib/main.dart:148`.
- Validator check karta hai ke `quiz.options.includes(answer)` true ho. JavaScript string par bhi `includes()` hota hai, isliye array ki jagah string accept ho jati hai.
- Reproduction: original valid lesson mein sirf `quiz.options = quiz.answer` kiya. Real admin handler ne HTTP 200 aur published record return kiya.
- Web player `.map()` expect karta hai; accepted string par TypeError aata hai. Flutter `List` cast bhi is data ke liye invalid hai.
- Asar: trusted admin ki accidental malformed upload learners ka lesson break kar sakti hai. Word/reading fields ki types aur quiz question ki required presence bhi poori validate nahi hoti.
- Fix: shared strict lesson schema: non-empty string fields, actual array of distinct string options, required question, answer membership, correctly typed bilingual words, allowed level/language, bounded lengths. Invalid content publish se pehle HTTP 400 de.
- Acceptance: string/null/object options, missing question, numeric word text, empty options aur duplicate IDs reject hon; existing 8 samples pass rahen.

### R05 — Course reviewer ka account delete karna database constraint se block ho sakta hai

**Severity: HIGH for affected reviewer accounts · Status: OPEN · Evidence: static SQL finding**

- Source: `supabase/migrations/001_ilmigo.sql:34` aur `:36`; deletion route `server/server.mjs:81`.
- `reviewer_id` auth user ko reference karta hai aur deletion policy specify nahi hai; PostgreSQL default NO ACTION hota hai. Published record mein reviewer non-null bhi required hai.
- Agar user ne published course review kiya hai, us auth user ki deletion referenced course row ki wajah se reject ho sakti hai.
- Yeh live PostgreSQL par execute nahi hua. Constraint conflict source mein clear hai; live DB confirmation release se pehle zaroori hai.
- Fix: reviewer audit identity ko deletable auth account se decouple karein. Anonymous/tombstoned audit actor preserve karein aur publishing constraint ki semantics update karein. Sirf `ON DELETE SET NULL` lagana kaafi nahi, kyunki current published check null reject karega.
- Acceptance: ordinary learner aur published-course reviewer dono apna account delete kar saken; published course aur required review audit record valid rahe.

## 4. Medium-priority issues aur limitations

### R04 — JSON `null` input par HTTP 500

**Severity: MEDIUM · Status: OPEN · Evidence: automated reproduction**

- Source: `server/server.mjs:29` aur `:38`.
- JSON parse hona enough nahi. `null` valid JSON hai, lekin object nahi; `data.email` par TypeError hota hai.
- Reproduction: configured/mock server par `POST /api/auth/otp` body `null`; result HTTP 500.
- Fix: har route mein top-level object aur nested structures validate karein; invalid client payload ko HTTP 400 mile. Current generic error secret expose nahi karta, magar server-error reporting ghalat hai.
- Acceptance: `null`, arrays, primitives aur malformed nested profiles predictable 400 dein; provider call na ho.

### R07 — Fresh device par local/cloud language mismatch

**Severity: MEDIUM · Status: OPEN · Evidence: automated reproduction**

- Source: `server/server.mjs:57`, `web/app.js:54`; native merge `mobile/lib/learning.dart:73`.
- Default local profile key har fresh install mein `local` hai. Cloud mein us key ka English profile pehle se ho aur naye device ka profile Urdu ho, existing-row branch metadata update nahi karti.
- Client merge cloud ID attach karta hai, magar local language/name metadata reconcile nahi karta.
- Reproduction: request Urdu, existing cloud profile English. Sync HTTP 200; local language Urdu, cloud English; metadata PATCH calls zero.
- Asar: speaking endpoint profile language aur lesson language match maangta hai, isliye valid-looking local practice reject ho sakti hai.
- Fix: random local profile IDs aur explicit existing-profile restore/import use karein; profile metadata conflict rule define karein aur client/server ko ek canonical result par reconcile karein.
- Acceptance: English cloud account + fresh Urdu guest device ke restore/import paths mein language/name agreed result par same hon; speaking request work kare.

### R06 — Remote lessons offline persist nahi hotin

**Severity: MEDIUM relative to requested offline capability · Status: known gap · Evidence: static source inspection**

- Source: `mobile/lib/learning.dart:48`, `:61`; `web/sw.js:7`.
- Native startup bundled catalog load karta hai; saved progress mein downloaded remote catalog nahi. Browser service worker API responses cache nahi karta, jabki published collections `/api/catalog` se milti hain.
- Asar: remote collection online dikh sakti hai, magar offline restart par bundled samples tak access reh jata hai.
- Existing README ne is limitation ko disclose kiya hua hai; yeh naya hidden completion claim nahi hai.
- Fix: versioned, validated downloadable course cache aur offline-available indicator implement karein. User data/auth responses ko public cache se separate rakhein.
- Acceptance: published collection download → app close → internet off → restart → same lessons/readings available.

## 5. Requested product ke baqi release blockers

Ye completion gaps hain; sab ko “bug” kehna theek nahi hoga.

1. **Full content missing:** 34 languages ka catalog 34 complete courses nahi hai. 8 beginner samples se professional language training complete nahi hoti. Course progression, placement, stage assessments aur qualified content/audio review chahiye.
2. **Native build unverified:** Flutter/Dart SDK yahan absent hai; download fail hua tha. Analyze, Flutter tests, APK build aur iOS build run nahi hue. Source dekh kar compile success certify nahi ki ja sakti.
3. **Live integrations unverified:** Supabase schema/RLS, OTP delivery, real AI responses/limits aur RevenueCat purchase/restore test nahi hue. Mocked tests live service test ka substitute nahi.
4. **Parent access controls incomplete:** child-profile AI restriction backend mein hai, lekin adult profile switch par PIN/re-authentication nahi. Local adulthood checkbox verified parent identity nahi. Shared-device child can reach adult profile through the selector. Public child onboarding se pehle actual parent-access design aur verification chahiye.
5. **AI voice conversation incomplete:** current AI endpoint text correction deta hai. Natural back-and-forth voice tutor, audio understanding, spoken AI reply aur pronunciation grading implement nahi hue.
6. **Bilingual coverage incomplete:** quiz question current content mein single English field hai; player Urdu mode mein bhi wahi question dikhata hai. Kuch onboarding/goal labels bhi English hain. Full explanation-language experience ka review chahiye.
7. **Billing disabled:** payment bridge ko revenue-ready feature na samjhein. Paid courses/gating, store products, terms aur sandbox purchase/refund/restore lifecycle complete nahi.
8. **UI, accessibility aur devices:** browser startup environment mein blocked tha. Small screens, RTL, text scaling, focus, contrast, microphone permission, calendar behavior aur real Urdu voices test nahi hue.
9. **Operational release:** real hosting/HTTPS, account support, retention policy, crash monitoring, signing credentials aur store listings configure nahi hue. Native shell folders bootstrap se generate hote hain; source ZIP installable APK nahi hai.

## 6. Kya positive checks pass hue?

Existing suite mein ye evidence mila:

- Catalog mein 34 unique language entries aur Swabi Pashto variant hai.
- Sample lesson structure aur shared/mobile catalog copies consistent hain.
- Daily block minutes ka total 30 hai.
- Wrong quiz answer lesson complete nahi karta; repeated completion XP inflate nahi karti.
- Basic local family histories separate rehti hain.
- Streak month boundary/leap day cases aur Urdu word normalization covered hain.
- Guest app assets/config route bina cloud keys ke available hain.
- Hostile browser Origin, missing auth aur basic invalid payload checks kaam karte hain.
- Guessed foreign cloud profile IDs reject hote hain.
- Backend child profile par AI request refuse karta hai.
- Quota exhausted ho to AI provider call nahi hoti.
- Mocked AI call server key use karti hai aur prompt text-only feedback disclose karta hai.
- Non-admin publishing reject hoti hai; review requirement ka basic path covered hai.
- Mocked account deletion authenticated identity ko target karti hai; Supabase 204 responses handle hote hain.

**Limits:** daily quota RPC khud real database par concurrency ke saath test nahi hua. Cloud RLS aur real account deletion tests bhi mocked handler tests se prove nahi hote.

## 7. Reproduction aur evidence files

Project root se:

```sh
npm run check
node --test --test-isolation=none tests/*.test.mjs
node review/reproduce.mjs
```

- Regular suite: **16 passed, 0 failed** during this review.
- Audit file: **5 runtime/handler reproductions**, plus **2 static checks**. Is file ka PASS matlab bug/gap confirm hua hai, fix nahi.
- `review/evidence.json`: machine-readable findings/evidence summary.
- `review/reproduce.mjs`: actual web functions/HTTP handler ke isolated reproductions; no live credentials/provider/network port required.
- `npm run check` JavaScript syntax check hai, full UI integration test nahi.

Report, evidence aur reproduction script mein live keys ya real learner data use nahi hua. All cloud identities are synthetic test fixtures.

## 8. Fix aur release ki recommended order

| Order | Kaam | Release gate |
|---|---|---|
| 1 | Account isolation R01 aur cloud restore R07 | A/B accounts aur second-device tests pass |
| 2 | Daily history/replay sync R02 | Offline/replay/order/history tests pass |
| 3 | Strict route/content schemas R03/R04 | Invalid JSON shapes predictable 400; valid lessons render |
| 4 | Reviewer/account deletion R05 | Live Postgres deletion tests pass |
| 5 | Course offline cache R06 aur bilingual completeness | Restart/offline/Urdu flows pass |
| 6 | Flutter SDK + Android/iOS builds | Analyze/tests pass; APK/IPA tested on devices |
| 7 | Live integrations and parent controls | Real OTP/DB/AI/parent access acceptance tests pass |
| 8 | Reviewed content and store billing | Agreed launch courses reviewed; payment lifecycle verified |
| 9 | Hosting, signing and store submission | Privacy/support/monitoring ready; store review complete |

**Final review verdict:** app ek development starter hai. Demo ka basic logic test hua hai, lekin production approval abhi nahi deni chahiye. Upar wale open issues aur completion gaps resolve aur verify hone ke baad hi “complete app” kehna munasib hoga.
