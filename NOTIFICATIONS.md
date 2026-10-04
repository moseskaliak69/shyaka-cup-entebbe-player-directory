# Match-day and news notifications

Menu → Notifications (or the bell) shows public alerts. Phone push is optional per
device; permission is requested only after tapping Enable phone notifications.
Users can choose match reminders/news, save preferences, disable push and send
a test to their own subscription. iPhone/iPad users need a supported Home Screen
web app. Permission and delivery remain controlled by the browser/OS.

## Schedule and source

Supabase Cron `shyaka-match-news-alerts` runs every minute. It builds match-day
alerts from scheduled/live fixtures at 09:00 Africa/Nairobi and news alerts from
published stories. Cancelled/postponed/rescheduled fixtures and unpublished news
are removed. Existing older news appears in-app but is not pushed to devices
that subscribed afterward. Match changes after the reminder do not trigger
another push that day. Match alerts expire at local midnight; news after 30 days.
The app refreshes the list every 30 seconds while visible and on reconnect.

`notification-setup.sql` documents the production schema setup; do not rerun it
on an existing installation. Edge function source lives in
`supabase/functions/tournament-push/`. The pinned web-push dependency encrypts
payloads and authenticates them using VAPID. Only public match/news information
is included in payloads.

## Access and reliability

- `tournament_alerts`: public SELECT of current published alerts only.
- `push_configuration`, `push_subscriptions`, `push_deliveries`, `push_rate_limits`:
  RLS enabled, no public/authenticated grants or policies; service role only.
- The edge function has custom authorization: the dispatch route requires a
  server-generated secret, and subscription changes/test/unsubscribe require
  the owning device's random 256-bit token. Database stores only its hash.
- Public config returns only the VAPID public key. The private key is stored in
  the restricted configuration table. Dispatch credentials are held in Vault
  and the restricted configuration table, never source control/browser code.
- Subscription requests validate browser push hosts and encryption key lengths,
  enforce rate limits, and send only to HTTPS provider endpoints without redirects.
- Queue claims use SKIP LOCKED, five-minute leases and up to five attempts.
  Permanent provider 404/410 responses remove expired subscriptions. Browser tags
  replace repeat displays if delivery succeeded but recording the result failed.
- Removing an alert/subscription cascades to queued deliveries.

## Checks performed

Syntax and application regression tests; background notification display/click
unit tests; live public-key endpoint; rejected unauthenticated dispatch; real
scheduled sender invocation (empty queue); public access denial to subscription
and key tables; transaction-rolled-back database checks for news deduplication,
queue leasing, unpublishing, Uganda match-day timing and cancelled matches.
A user device must opt in before actual phone receipt can be verified.
