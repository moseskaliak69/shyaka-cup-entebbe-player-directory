-- Already applied to the connected Shyaka Cup Supabase project on 2026-09-05.
-- Kept here for source history and recovery.
create table if not exists public.match_highlights (
  id bigserial primary key,
  fixture_id bigint not null references public.fixtures(id) on delete cascade,
  title text,
  video_url text not null,
  storage_path text not null,
  duration_seconds numeric(6,2) not null check (duration_seconds > 0 and duration_seconds <= 30.5),
  start_seconds numeric(8,2) not null default 0,
  mime_type text,
  file_size bigint,
  published boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_highlights_one_per_fixture unique (fixture_id)
);
