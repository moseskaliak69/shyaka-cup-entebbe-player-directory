# Emergency offline cache — PR #4

## Behavior and limits

- Successful public reads update only their own section timestamps. Scores and events refresh as a pair. Failed reads retain their previous timestamp; successful empty arrays remove previous rows.
- Live scores stop being labelled live after a failed refresh, while offline, or after 45 seconds without confirmation. Other sections need confirmation within 90 seconds. Full public refresh runs every minute while the public app is visible; scores refresh every 15 seconds. Administrator forms do not auto-refresh.
- Public data expires after 24 hours; published referee reports expire after one hour. Expiry is enforced on restoration and while the app is open. A report withdrawn while the device is offline can remain visible for the remainder of that one-hour window.
- Cache version 1 is discarded. Public field allowlists exclude player records, player media, private reports, unknown columns, and unpublished news/highlights. All public fetches use the anonymous client and explicit publication filters.
- Gallery images are refreshed from the network, fall back only within 24 hours, and are limited to 40 entries of at most 2 MiB each. Only the project's public gallery bucket, without token queries or Authorization headers, is accepted. A 404/403 removes the saved image. Larger images display online without being cached.
- The service worker caches only listed app-shell assets and the public gallery route. It uses a four-second network timeout and falls back on network errors or 5xx responses. Storage failure does not prevent online navigation.
- Public queries time out after eight seconds. The existing faster administrator-player rendering is retained.
- Highlight metadata is available offline; video playback is not cached. Player records, photographs and licences remain excluded. First-time visitors need a successful online visit and service-worker installation. Device/browser storage can be cleared or evicted; this is not a server backup.

## Automated verification

Run `npm test` and `npm run check` with Node 22 or later. GitHub Actions runs both on PR updates and pushes to main/the cache branch, without installing dependencies or needing credentials.

Tests exercise the production cache module, extracted application loaders, and service-worker handlers with controlled responses. They cover mixed failures, recovery, honest timestamps, empty data, expiration, blocked storage, deadlines, 503 navigation, gallery replacement/removal/limits, private media exclusion, and the existing administrator/media/team regressions. These simulations are not evidence of an installed phone PWA test.

## Before merging / match-day acceptance

1. Open the exact PR preview online and wait for data and service-worker installation. Check home, fixtures, live scores, teams, gallery, and published reports.
2. On a phone, install/open the PWA, view a gallery image, then enable airplane mode and close/reopen. Previously saved information must display with timestamps and saved-score labels; private licences and uncached videos must not become available.
3. Restore the connection. Verify current scores and all sections recover; only recovered sections lose their warnings. Use a preview/test harness for forced partial API failures and 503s; do not disrupt production.
4. Confirm an empty fixture response removes old scores, and storage denied/full still allows online use with the warning.
5. As an approved admin, verify fast player loading, open/close a licence, and sign out. Confirm no private player data or private referee reports appear in localStorage or service-worker caches. Do not create production test data.
6. Merge only after the exact commit's checks and phone acceptance pass, outside the immediate match window.

## Rollback

Record the production commit/deployment before merging. If verification fails after release, revert the merge on main or restore that deployment. Existing devices may still have the newer service worker until their next successful online visit; verify an online reload followed by offline reopening. If a cache privacy defect is discovered, ship explicit cache cleanup/version migration rather than assuming a deployment rollback erases browser storage. Keep paper fixture/licence verification available during outages.
