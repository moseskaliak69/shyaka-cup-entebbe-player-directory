-- SHYAKA CUP ENTEBBE — LIVE MATCH CLOCK
-- Applied to Supabase on 2026-09-22.
-- Keeps a server-backed running match clock and enables realtime score/event refresh.

alter table public.fixtures
  add column if not exists clock_elapsed_seconds integer not null default 0,
  add column if not exists clock_started_at timestamptz,
  add column if not exists clock_running boolean not null default false,
  add column if not exists clock_period text not null default 'not_started';

alter table public.fixtures
  drop constraint if exists fixtures_clock_elapsed_seconds_check;
alter table public.fixtures
  add constraint fixtures_clock_elapsed_seconds_check
  check (clock_elapsed_seconds >= 0 and clock_elapsed_seconds <= 10800);

alter table public.fixtures
  drop constraint if exists fixtures_clock_period_check;
alter table public.fixtures
  add constraint fixtures_clock_period_check
  check (clock_period = any (array[
    'not_started'::text,
    'first_half'::text,
    'half_time'::text,
    'second_half'::text,
    'full_time'::text
  ]));

-- Run each ADD only if the table is not already in supabase_realtime.
alter publication supabase_realtime add table public.fixtures;
alter publication supabase_realtime add table public.match_events;
