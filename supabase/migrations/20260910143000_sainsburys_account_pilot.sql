-- One-account Sainsbury's browser-assisted pilot.
-- No retailer password, session cookie, payment data or basket contents are stored.

create table public.retailer_pilot_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  retailer_id text not null references public.retailers(id) on delete cascade,
  status text not null default 'enabled' check (status in ('enabled','paused','ended')),
  connection_method text not null default 'browser_assisted' check (connection_method = 'browser_assisted'),
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, retailer_id),
  check (ends_at is null or ends_at > started_at)
);

create table public.retailer_transfer_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  retailer_id text not null references public.retailers(id) on delete cascade,
  transfer_id text not null unique check (char_length(transfer_id) between 8 and 100),
  week_start date,
  fulfilment text not null check (fulfilment in ('delivery','collection')),
  status text not null default 'prepared' check (status in ('prepared','completed','partial','failed','cancelled')),
  requested_items integer not null check (requested_items >= 0),
  matched_items integer not null check (matched_items >= 0),
  approved_items integer not null check (approved_items >= 0),
  unmatched_items integer not null check (unmatched_items >= 0),
  transferred_items integer not null default 0 check (transferred_items >= 0),
  failed_items integer not null default 0 check (failed_items >= 0),
  displayed_subtotal_pence integer check (displayed_subtotal_pence >= 0),
  displayed_loyalty_subtotal_pence integer check (displayed_loyalty_subtotal_pence >= 0),
  connector_version text not null check (char_length(connector_version) between 1 and 30),
  duration_seconds integer check (duration_seconds >= 0),
  failure_code text check (char_length(failure_code) <= 80),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (matched_items <= requested_items),
  check (approved_items <= matched_items),
  check (unmatched_items <= requested_items),
  check (transferred_items + failed_items <= approved_items)
);

create index retailer_transfer_events_user_created_idx
  on public.retailer_transfer_events (user_id, created_at desc);
create index retailer_transfer_events_retailer_status_idx
  on public.retailer_transfer_events (retailer_id, status, created_at desc);
create index retailer_pilot_users_retailer_idx
  on public.retailer_pilot_users (retailer_id);

alter table public.retailer_pilot_users enable row level security;
alter table public.retailer_transfer_events enable row level security;

revoke all on public.retailer_pilot_users, public.retailer_transfer_events from anon, authenticated;
grant select on public.retailer_pilot_users to authenticated;
grant select, insert, update on public.retailer_transfer_events to authenticated;

create policy "pilot users can read their own access"
  on public.retailer_pilot_users
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "pilot users can read their own transfer events"
  on public.retailer_transfer_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "enabled pilot users can create their own transfer events"
  on public.retailer_transfer_events
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and retailer_id = 'sainsburys'
    and exists (
      select 1
      from public.retailer_pilot_users pilot
      where pilot.user_id = (select auth.uid())
        and pilot.retailer_id = retailer_transfer_events.retailer_id
        and pilot.status = 'enabled'
        and (pilot.ends_at is null or pilot.ends_at > now())
    )
  );

create policy "enabled pilot users can update their own transfer events"
  on public.retailer_transfer_events
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and retailer_id = 'sainsburys'
    and exists (
      select 1
      from public.retailer_pilot_users pilot
      where pilot.user_id = (select auth.uid())
        and pilot.retailer_id = retailer_transfer_events.retailer_id
        and pilot.status = 'enabled'
        and (pilot.ends_at is null or pilot.ends_at > now())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and retailer_id = 'sainsburys'
    and exists (
      select 1
      from public.retailer_pilot_users pilot
      where pilot.user_id = (select auth.uid())
        and pilot.retailer_id = retailer_transfer_events.retailer_id
        and pilot.status = 'enabled'
        and (pilot.ends_at is null or pilot.ends_at > now())
    )
  );

-- The current project has one test account. Later accounts remain ineligible until
-- Sainsbury's and Our Weekly Shop deliberately expand the pilot.
insert into public.retailer_pilot_users (user_id, retailer_id, status, connection_method)
select id, 'sainsburys', 'enabled', 'browser_assisted'
from auth.users
order by created_at asc
limit 1
on conflict (user_id, retailer_id) do nothing;
