-- Add the two existing villages used by the current directory.
insert into public.villages (name)
values ('Kiwafu Central')
on conflict (name) do nothing;
