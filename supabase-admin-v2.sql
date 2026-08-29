-- SHYAKA CUP ENTEBBE — Admin Centre v2 upgrade
-- Run once in Supabase SQL Editor. Safe to run again.

-- Ensure all teams appearing in the official fixture exist as villages.
insert into public.villages (name) values
('KIWAFU CENTRAL'),('LUGONJO'),('MANYAGO 1'),('BUSAMBAGA'),('VIRUS'),('BANGA NAKIWOGO'),
('KITASA'),('BUGONGA'),('KIWAFU EAST'),('KITOORO'),('MISOLI'),('OLD ENTEBBE'),('NAKASAMBA'),
('KAKEKA'),('KITUBULU'),('NAMATE'),('MAYANZI'),('KIGUNGU CENTRAL'),('LUNYO EAST'),('LUNYO CENTRAL'),
('KIWAFU WEST'),('POST OFFICE'),('NSAMIZI'),('MANYAGO 2')
on conflict (name) do nothing;

-- Authenticated admins can fully manage players.
drop policy if exists "Authenticated admins can update players" on public.players;
create policy "Authenticated admins can update players" on public.players
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated admins can delete players" on public.players;
create policy "Authenticated admins can delete players" on public.players
for delete to authenticated using (true);

-- Admins can also remove uploaded files if needed later.
drop policy if exists "Authenticated admins can delete player files" on storage.objects;
create policy "Authenticated admins can delete player files" on storage.objects
for delete to authenticated using (bucket_id = 'player-files');
