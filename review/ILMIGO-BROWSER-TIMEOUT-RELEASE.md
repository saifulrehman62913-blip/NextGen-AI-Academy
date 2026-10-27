# ILMIGO 0.5.2 — browser network deadline review

Application commit: `040b4674ead14d65f5d24a2e95de760c1ec18185`.

Cloud run: https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40522025719

The learning app browser client previously placed no deadline on cloud requests or startup catalog/config requests. A stalled connection could leave sign-in, sync or startup waiting indefinitely. Native requests already had a 30-second timeout; this release changes browser behavior only, apart from native version metadata.

## Fix

`ApiSession` applies a 30-second deadline to each transfer, including the response-body download. Expiry rejects with a retry message and aborts the underlying browser fetch. The same client now loads the public startup catalog/config. If a startup request fails, existing validated cached/bundled fallback handling continues; when no catalog is available, the app displays its reconnect message.

Timeouts and network failures do not refresh credentials or automatically replay a request. The existing single retry after a verified expired-session refresh is retained. A refresh timeout also stops without replaying the protected write. Successful downloads clear the timer. Raw network exception details are replaced with a readable connection message.

Aborting a client request does not prove the server stopped processing it. A request could have been applied before its reply was lost. The UI therefore asks the learner to try again; the code does not promise an automatic refund or exactly-once provider execution. Existing progress sync is idempotent. A later user-initiated retry of AI can still consume another reserved turn.

## Verification scope

Locally, 90 Node tests and JavaScript syntax checks passed. New regression cases cover stalled fetch, stalled body download, absence of automatic write replay, refresh timeout, timer cleanup, credential preservation and redaction of network errors. Standalone preview tests now provide the standard AbortController browser API in their synthetic environment.

The cloud web job passed all 90 Node tests, four migrations with 36 PostgreSQL assertions, Docker build/HTTP smoke and five Chrome scenarios.

A fifth real-Chrome scenario holds an actual intercepted HTTP request open and verifies timeout rejection, a single request and unchanged tab credentials. This is an intentional local HTTP fixture, not a live provider outage test. SQL and native application behavior are unchanged from 0.5.1; their CI jobs are also rerun for this version.

## Production status

The paid plan remains USD 10/year with one explicitly started 72-hour trial per verified account and no automatic trial conversion. No live payment, bank payout or provider credential was configured or tested by this release. Owner credentials are absent in this execution environment. Production HTTPS/provider/merchant setup, owner-signed Android/Apple releases, physical-device/audio/accessibility acceptance, qualified review/expansion of the 40 English/Urdu lesson drafts and the other 32 language curricula remain incomplete.

The current app is a test beta. Passing checks does not prove zero defects or a complete professional academy launch.

## Final cloud result and downloads

Run 40522025719 completed successfully for the exact application commit above. Each Linux/macOS host passed the same 25 distinct Flutter tests, not 50 different tests. Android debug APK and iOS simulator builds succeeded. Missing owner signing credentials were rejected by the actual Flutter release path. Native analysis has no errors and four informational speech/radio deprecation findings per host. These notices remain, and are not described as fixed bugs.

- [Android debug APK ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40522025719/artifacts/12741499578): extract `app-debug.apk`.
- [iOS simulator ZIP](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40522025719/artifacts/12742028331): not installable on a physical iPhone.
- [Web preview](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40522025719/artifacts/12741394453).
- [Browser evidence](https://github.com/saifulrehman62913-blip/NextGen-AI-Academy/actions/runs/40522025719/artifacts/12742930520).

Artifacts expire 25 January 2027; GitHub sign-in may be required. GitHub-provided digests and sizes are recorded in `cloud/browser-timeout-verification.json`; archives were not independently unpacked locally. Browser screenshots are generated, not manually visually reviewed. Native downloads remain unconfigured test previews without a backend URL, purchase flags or store SDK keys. Documentation-only follow-up commits do not change the tested application.
