-- Shyaka Cup: Player Directory is private to approved administrators.
drop policy if exists "Public can view players" on public.players;
drop policy if exists "Approved admins can view players" on public.players;
create policy "Approved admins can view players"
on public.players
for select
to authenticated
using (public.is_shyaka_admin());

drop policy if exists "Public reads deleted player numbers" on public.deleted_players;
drop policy if exists "Approved admins can view deleted player numbers" on public.deleted_players;
create policy "Approved admins can view deleted player numbers"
on public.deleted_players
for select
to authenticated
using (public.is_shyaka_admin());
