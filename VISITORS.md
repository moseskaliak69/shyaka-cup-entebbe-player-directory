# Admin visitor counts

Admin → Visitors shows active browsers (last five minutes), distinct browsers today, this calendar week (Monday start), and this calendar month. Most-viewed sections rank distinct browsers per section this month. All calendar boundaries use Africa/Nairobi.

Collection starts with the 5 October 2026 deployment; earlier visits cannot be reconstructed. A random UUID is saved in localStorage. No names, email addresses, page content, or raw IP addresses are stored in analytics. Clearing storage or changing browser/device creates a new visitor. Shared browsers count as one. Bots and blocked requests can affect estimates.

The visible online production page reports its section on navigation and once per minute. Hidden pages stop. Server time determines timestamps. The database coalesces repeats within thirty seconds and the daily cron removes records older than ninety days. There is no offline activity backlog.

`visitor-pulse` has JWT verification enabled and accepts the existing public anon JWT, with strict production origin, UUID, section and payload validation. This is a public write-only telemetry endpoint; origin/JWT checks do not make anonymous traffic immune to spoofing. It uses service credentials only inside the Edge Function. `record_visitor` is service-role-only. Direct writes from client roles are revoked. Reads and `visitor_summary` require the existing approved-admin authorization and RLS. No analytics totals are public.

Backend installation: `visitor-analytics-setup.sql` was applied once to project tjabrrvfxlyqkhzhtnyb. Do not rerun it on the installed schema. Edge source is in `supabase/functions/visitor-pulse/index.ts`.
