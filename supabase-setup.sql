-- Shyaka Cup Entebbe shared online player database
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number text not null unique,
  parish text,
  village text not null,
  photo_url text,
  license_url text,
  created_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Anyone can view players"
on public.players for select
using (true);

create policy "Authenticated admins can add players"
on public.players for insert
to authenticated
with check (true);

create policy "Authenticated admins can update players"
on public.players for update
to authenticated
using (true) with check (true);

create policy "Authenticated admins can delete players"
on public.players for delete
to authenticated
using (true);

-- Create a Storage bucket named: player-files
-- Make the bucket PUBLIC so player photos/licenses can be displayed by the directory.
-- Then add these policies in Storage if needed:
create policy "Public can view player files"
on storage.objects for select
using (bucket_id = 'player-files');

create policy "Authenticated admins can upload player files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'player-files');

create policy "Authenticated admins can update player files"
on storage.objects for update
to authenticated
using (bucket_id = 'player-files') with check (bucket_id = 'player-files');
