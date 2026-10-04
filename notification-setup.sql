-- Public alerts contain only published tournament information.
create table public.tournament_alerts (
 id uuid primary key default gen_random_uuid(), event_key text unique not null,
 kind text not null check(kind in ('match','news')), title text not null, body text not null,
 target text not null check(target in ('fixtures','news')), source_id bigint not null,
 created_at timestamptz not null, expires_at timestamptz not null
);
alter table public.tournament_alerts enable row level security;
revoke all on public.tournament_alerts from public,anon,authenticated;
grant select on public.tournament_alerts to anon,authenticated;
grant all on public.tournament_alerts to service_role;
create policy "Read current tournament alerts" on public.tournament_alerts for select to anon,authenticated using(created_at<=now() and expires_at>now());
create table public.push_configuration (
 id integer primary key check(id=1), public_key text, private_key text,
 dispatch_secret text not null default encode(extensions.gen_random_bytes(32),'hex')
);
insert into public.push_configuration(id) values(1);
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(), endpoint text unique not null,
 p256dh text not null, auth text not null, token_hash text not null,
 matches boolean not null default true, news boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.push_deliveries (
 id uuid primary key default gen_random_uuid(), alert_id uuid references public.tournament_alerts on delete cascade,
 subscription_id uuid references public.push_subscriptions on delete cascade,
 sent_at timestamptz, attempts integer not null default 0, next_attempt timestamptz not null default now(),
 last_status integer, unique(alert_id,subscription_id)
);
create index push_deliveries_pending on public.push_deliveries(next_attempt) where sent_at is null;
create table public.push_rate_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.push_configuration enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
alter table public.push_rate_limits enable row level security;
revoke all on public.push_configuration,public.push_subscriptions,public.push_deliveries,public.push_rate_limits from public,anon,authenticated;
grant all on public.push_configuration,public.push_subscriptions,public.push_deliveries,public.push_rate_limits to service_role;

create function public.push_rate_allow(bucket text) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 insert into public.push_rate_limits(key,hits,expires_at) values(bucket,1,now()+interval '1 hour')
 on conflict(key) do update set hits=case when push_rate_limits.expires_at<now() then 1 else push_rate_limits.hits+1 end,
 expires_at=case when push_rate_limits.expires_at<now() then now()+interval '1 hour' else push_rate_limits.expires_at end returning hits into n;
 return n<=case when bucket like 'ip:%' then 300 else 30 end;
end $$;

create function public.prepare_tournament_alerts() returns void language plpgsql security invoker set search_path='' as $$
declare local_now timestamp := now() at time zone 'Africa/Nairobi';
begin
 -- Polling handles publishing from either the admin app or the database dashboard.
 insert into public.tournament_alerts(event_key,kind,title,body,target,source_id,created_at,expires_at)
 select 'news:'||n.id,'news',left(n.title,120),left(n.body,220),'news',n.id,
 greatest(n.published_at,n.created_at),greatest(n.published_at,n.created_at)+interval '30 days'
 from public.news n where n.published is true and greatest(n.published_at,n.created_at) between now()-interval '30 days' and now()
 on conflict(event_key) do update set title=excluded.title,body=excluded.body,expires_at=excluded.expires_at;
 if local_now::time >= time '09:00' then
  insert into public.tournament_alerts(event_key,kind,title,body,target,source_id,created_at,expires_at)
  select 'match:'||f.id||':'||f.match_date,'match','Match day: '||f.home_team||' vs '||f.away_team,
   coalesce(f.match_time,'Time to be confirmed')||' • '||coalesce(f.venue,'Venue to be confirmed'), 'fixtures',f.id,
   (f.match_date+time '09:00') at time zone 'Africa/Nairobi', (f.match_date+1)::timestamp at time zone 'Africa/Nairobi'
  from public.fixtures f where f.match_date=local_now::date and f.status in ('scheduled','live')
  on conflict(event_key) do update set title=excluded.title,body=excluded.body;
 end if;
 delete from public.tournament_alerts a where expires_at<now() or
  (kind='news' and not exists(select 1 from public.news n where n.id=a.source_id and n.published is true and greatest(n.published_at,n.created_at)<=now())) or
  (kind='match' and not exists(select 1 from public.fixtures f where f.id=a.source_id and f.status in ('scheduled','live') and a.event_key='match:'||f.id||':'||f.match_date));
 delete from public.push_rate_limits where expires_at<now()-interval '1 day';
end $$;

create function public.claim_tournament_push() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 insert into public.push_deliveries(alert_id,subscription_id)
 select a.id,s.id from public.tournament_alerts a cross join public.push_subscriptions s
 where a.created_at>=s.created_at and a.expires_at>now() and a.created_at<=now()
 and ((a.kind='match' and s.matches) or (a.kind='news' and s.news))
 on conflict(alert_id,subscription_id) do nothing;
 with picked as (
  select d.id from public.push_deliveries d
  join public.tournament_alerts a on a.id=d.alert_id
  join public.push_subscriptions s on s.id=d.subscription_id
  where d.sent_at is null and d.attempts<5 and d.next_attempt<=now() and a.expires_at>now()
  and ((a.kind='match' and s.matches) or (a.kind='news' and s.news))
  order by d.next_attempt for update of d skip locked limit 80
 ), claimed as (
  update public.push_deliveries d set attempts=attempts+1,next_attempt=now()+interval '5 minutes'
  from picked where d.id=picked.id returning d.*
 ) select coalesce(jsonb_agg(jsonb_build_object('delivery_id',d.id,'subscription_id',s.id,'endpoint',s.endpoint,
 'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth),'title',a.title,'body',a.body,'target',a.target,'source_id',a.source_id,
 'tag',a.event_key,'expires_at',a.expires_at)),'[]'::jsonb) into result
 from claimed d join public.push_subscriptions s on s.id=d.subscription_id join public.tournament_alerts a on a.id=d.alert_id;
 return result;
end $$;
revoke all on function public.push_rate_allow(text),public.prepare_tournament_alerts(),public.claim_tournament_push() from public,anon,authenticated;
grant execute on function public.push_rate_allow(text),public.prepare_tournament_alerts(),public.claim_tournament_push() to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- The dispatch secret never appears in source control or a browser response.
do $$ begin
 perform vault.create_secret((select dispatch_secret from public.push_configuration where id=1),'shyaka_push_dispatch');
end $$;
create function shyaka_private.run_notification_schedule() returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.prepare_tournament_alerts();
 if exists(select 1 from public.push_subscriptions) then
  perform net.http_post(url:='https://tjabrrvfxlyqkhzhtnyb.supabase.co/functions/v1/tournament-push/dispatch',
   headers:=jsonb_build_object('Content-Type','application/json','x-dispatch-secret',(select decrypted_secret from vault.decrypted_secrets where name='shyaka_push_dispatch')),
   body:='{}'::jsonb,timeout_milliseconds:=60000);
 end if;
end $$;
revoke all on function shyaka_private.run_notification_schedule() from public,anon,authenticated;
select cron.schedule('shyaka-match-news-alerts','* * * * *','select shyaka_private.run_notification_schedule()');
select public.prepare_tournament_alerts();
