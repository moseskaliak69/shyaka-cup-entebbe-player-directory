# Shyaka Cup Security Baseline

Last hardened: 2026-09-06

## Production rules

- Player directory is available only to approved Supabase administrators.
- Player photos and licences are stored in the private `player-files` bucket.
- Player media is opened with short-lived signed URLs after admin authentication.
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
