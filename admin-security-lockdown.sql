-- SHYAKA CUP ENTEBBE — ADMIN SECURITY LOCKDOWN
-- Run after creating public.admins and inserting the approved admins.
-- This changes tournament WRITE permissions from any authenticated user to approved admins only.

create or replace function public.is_shyaka_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_shyaka_admin() from public;
grant execute on function public.is_shyaka_admin() to anon, authenticated;

-- Fixtures
drop policy if exists "Admins can update fixtures" on public.fixtures;
drop policy if exists "Admins can insert fixtures" on public.fixtures;
drop policy if exists "Admins can delete fixtures" on public.fixtures;
create policy "Approved admins can update fixtures" on public.fixtures for update to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());
create policy "Approved admins can insert fixtures" on public.fixtures for insert to authenticated with check (public.is_shyaka_admin());
create policy "Approved admins can delete fixtures" on public.fixtures for delete to authenticated using (public.is_shyaka_admin());

-- Match events
drop policy if exists "Admins can manage match events" on public.match_events;
create policy "Approved admins manage match events" on public.match_events for all to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());

-- Players
drop policy if exists "Authenticated admins can update players" on public.players;
drop policy if exists "Authenticated admins can delete players" on public.players;
drop policy if exists "Authenticated users can insert players" on public.players;
drop policy if exists "Authenticated users can add players" on public.players;
drop policy if exists "Admins can insert players" on public.players;
create policy "Approved admins can insert players" on public.players for insert to authenticated with check (public.is_shyaka_admin());
create policy "Approved admins can update players" on public.players for update to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());
create policy "Approved admins can delete players" on public.players for delete to authenticated using (public.is_shyaka_admin());

-- Villages / teams
drop policy if exists "Authenticated users can insert villages" on public.villages;
drop policy if exists "Admins can manage villages" on public.villages;
create policy "Approved admins can insert villages" on public.villages for insert to authenticated with check (public.is_shyaka_admin());
create policy "Approved admins can update villages" on public.villages for update to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());
create policy "Approved admins can delete villages" on public.villages for delete to authenticated using (public.is_shyaka_admin());

-- Team profiles
drop policy if exists "Admins manage team profiles" on public.team_profiles;
create policy "Approved admins manage team profiles" on public.team_profiles for all to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());

-- News
drop policy if exists "Admins manage news" on public.news;
create policy "Approved admins manage news" on public.news for all to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());

-- Gallery
drop policy if exists "Admins manage gallery" on public.gallery;
create policy "Approved admins manage gallery" on public.gallery for all to authenticated using (public.is_shyaka_admin()) with check (public.is_shyaka_admin());

-- Storage: player photos, licences and gallery files
drop policy if exists "Authenticated admins can upload player files" on storage.objects;
drop policy if exists "Authenticated admins can update player files" on storage.objects;
drop policy if exists "Authenticated admins can delete player files" on storage.objects;
create policy "Approved admins can upload player files" on storage.objects for insert to authenticated with check (bucket_id='player-files' and public.is_shyaka_admin());
create policy "Approved admins can update player files" on storage.objects for update to authenticated using (bucket_id='player-files' and public.is_shyaka_admin()) with check (bucket_id='player-files' and public.is_shyaka_admin());
create policy "Approved admins can delete player files" on storage.objects for delete to authenticated using (bucket_id='player-files' and public.is_shyaka_admin());
