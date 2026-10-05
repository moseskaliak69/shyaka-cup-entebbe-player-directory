-- Anonymous browser activity; no names, email addresses or raw IP addresses.
create table public.visitor_activity (
 day date not null,
 device_id uuid not null,
 section text not null check (section in ('home','teams','players','fixtures','livescores','matchcentre','results','standings','stats','knockout','sponsor','notifications','news','gallery','highlights')),
 last_seen timestamptz not null default now(),
 primary key(day,device_id,section)
);
alter table public.visitor_activity enable row level security;
revoke all on public.visitor_activity from public,anon,authenticated;
grant select on public.visitor_activity to authenticated;
grant all on public.visitor_activity to service_role;
create policy "Approved admins view visitor activity" on public.visitor_activity for select to authenticated using ((select public.is_shyaka_admin()));
create index visitor_activity_last_seen on public.visitor_activity(last_seen);
create function public.record_visitor(p_device uuid,p_section text) returns void
language sql security invoker set search_path='' as $$
 insert into public.visitor_activity(day,device_id,section)
 values ((now() at time zone 'Africa/Nairobi')::date,p_device,p_section)
 on conflict(day,device_id,section) do update set last_seen=now()
 where visitor_activity.last_seen < now()-interval '30 seconds';
$$;
revoke all on function public.record_visitor(uuid,text) from public,anon,authenticated;
grant execute on function public.record_visitor(uuid,text) to service_role;
create function public.visitor_summary() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; today date := (now() at time zone 'Africa/Nairobi')::date;
begin
 if not public.is_shyaka_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select jsonb_build_object(
 'active',count(distinct device_id) filter(where last_seen>now()-interval '5 minutes'),
 'today',count(distinct device_id) filter(where day=today),
 'week',count(distinct device_id) filter(where day>=date_trunc('week',today::timestamp)::date),
 'month',count(distinct device_id) filter(where day>=date_trunc('month',today::timestamp)::date),
 'sections',coalesce((select jsonb_agg(s) from (select section,count(distinct device_id) as visitors from public.visitor_activity where day>=date_trunc('month',today::timestamp)::date group by section order by visitors desc,section limit 6) s),'[]'::jsonb)
 ) into result from public.visitor_activity
 where day>=least(date_trunc('month',today::timestamp)::date,date_trunc('week',today::timestamp)::date,today-1);
 return result;
end;
$$;
revoke all on function public.visitor_summary() from public,anon;
grant execute on function public.visitor_summary() to authenticated;
select cron.schedule('shyaka-visitor-retention','17 1 * * *', $$delete from public.visitor_activity where day < (now() at time zone 'Africa/Nairobi')::date-90$$);
