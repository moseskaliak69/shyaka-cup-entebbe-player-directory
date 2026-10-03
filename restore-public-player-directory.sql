-- Public projection: never grant visitors SELECT on the private players table.
-- Safe fields stay synchronized for dashboard imports and admin edits alike.
create schema if not exists shyaka_private;
revoke all on schema shyaka_private from public, anon, authenticated;

create table public.player_directory as
select id, player_number, name, village_id, parish, position,
       photo_url, created_at
from public.players with no data;
alter table public.player_directory add primary key (id);
alter table public.player_directory enable row level security;
revoke all on public.player_directory from public, anon, authenticated;
grant select on public.player_directory to anon, authenticated;
create policy "Public reads player profiles" on public.player_directory
for select to anon, authenticated using (true);

-- Trigger-only function. The source tables already enforce approved-admin writes.
-- Definer rights are needed only to maintain the read-only public projection.
create function shyaka_private.refresh_player_directory() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_shyaka_admin() then
    raise exception 'Administrator access required';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(20261003, 577);
  delete from public.player_directory;
  insert into public.player_directory
  select p.id, p.player_number, p.name, p.village_id, p.parish, p.position,
    case when regexp_replace(p.photo_url,
      '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/player-files/', '') like 'photos/%'
      then split_part(regexp_replace(p.photo_url,
        '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/player-files/', ''), '?', 1)
      else null end,
    p.created_at
  from public.players p
  where not exists (select 1 from public.deleted_players d
    where upper(trim(d.player_number)) = upper(trim(p.player_number)));
  return null;
end $$;
revoke all on function shyaka_private.refresh_player_directory() from public, anon, authenticated;
create trigger refresh_public_players after insert or update or delete or truncate
on public.players for each statement execute function shyaka_private.refresh_player_directory();
create trigger refresh_public_deleted_players after insert or update or delete or truncate
on public.deleted_players for each statement execute function shyaka_private.refresh_player_directory();

insert into public.player_directory
select p.id, p.player_number, p.name, p.village_id, p.parish, p.position,
  case when regexp_replace(p.photo_url,
    '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/player-files/', '') like 'photos/%'
    then split_part(regexp_replace(p.photo_url,
      '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/player-files/', ''), '?', 1)
    else null end,
  p.created_at
from public.players p
where not exists (select 1 from public.deleted_players d
  where upper(trim(d.player_number)) = upper(trim(p.player_number)));

-- Keep player-files private: only referenced photos get public read/sign access.
-- licenses/ and all admin write policies remain unchanged.
create policy "Public reads directory photos" on storage.objects
for select to anon, authenticated using (
  bucket_id = 'player-files' and name like 'photos/%'
  and exists (select 1 from public.player_directory p where p.photo_url = objects.name)
);
