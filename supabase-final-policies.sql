drop policy if exists "Public can add players" on public.players;
create policy "Authenticated admins can add players" on public.players for insert to authenticated with check (true);
create policy "Authenticated admins can upload player files" on storage.objects for insert to authenticated with check (bucket_id = 'player-files');
create policy "Public can read player files" on storage.objects for select to public using (bucket_id = 'player-files');
