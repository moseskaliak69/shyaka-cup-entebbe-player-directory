-- Run this only if uploading photos/licenses from the admin panel gives a storage permission error.
-- The bucket "player-files" must already exist and be PUBLIC.

create policy "Authenticated admins can upload player files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'player-files');

create policy "Authenticated admins can update player files"
on storage.objects for update
to authenticated
using (bucket_id = 'player-files')
with check (bucket_id = 'player-files');
