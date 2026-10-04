# Shyaka Cup Security Baseline

Last updated: 2026-10-03

## Production rules

- Public player profiles are read from `player_directory`, a read-only projection with no licence, phone, birth date or emergency-contact columns.
- Private player records remain accessible only to approved Supabase administrators.
- Database triggers keep the projection synchronized and exclude deleted-player numbers.
- Player photos and licences are stored in the private `player-files` bucket.
- Only photos referenced by the public directory can be signed by visitors. Licences require approved admin authentication.
- Player media uses short-lived signed URLs and is excluded from persistent offline caches.
- Public gallery media uses the separate public `gallery` bucket.
- Match highlights use the public `match-highlights` bucket and are limited to approved admin uploads.
- No service-role or Supabase secret key belongs in browser code or this repository.
- The browser may contain only the Supabase publishable key.
- All production tables use Row Level Security.
- Admin write policies must call `public.is_shyaka_admin()`.
- Legacy SQL files marked DEPRECATED must never be run.

## Upload limits

- Player files: maximum 10 MB; JPG, PNG, WebP or PDF.
- Public gallery: maximum 8 MB; JPG, PNG or WebP.
- Match highlights: maximum 20 MB; MP4, WebM or QuickTime.

## Repository rules

Never commit player photos, player licences, exported player data, passwords, .env files,
private keys, service-role keys or Supabase secret keys.

## Remaining manual security setting

Supabase Auth leaked-password protection should be enabled in the Supabase dashboard.

## Important history note

Private player media was removed from the current public branch. Older Git commits may still
retain historical copies until repository history is fully purged. Treat a full Git history
purge as a separate maintenance operation because it rewrites commit history.

## Notifications

Notification subscriber endpoints, encryption keys and VAPID private keys are
service-role only. The dispatcher authenticates its Vault-backed secret. Device
management requires an unguessable ownership token. The public alert feed contains
only published match/news text; no player records or licences. See NOTIFICATIONS.md.
