-- Keep pilot RLS checks as init plans and cover the retailer foreign key.
create index if not exists retailer_pilot_users_retailer_idx
  on public.retailer_pilot_users (retailer_id);

drop policy if exists "pilot users can read their own access" on public.retailer_pilot_users;
create policy "pilot users can read their own access"
  on public.retailer_pilot_users for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "pilot users can read their own transfer events" on public.retailer_transfer_events;
create policy "pilot users can read their own transfer events"
  on public.retailer_transfer_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "enabled pilot users can create their own transfer events" on public.retailer_transfer_events;
create policy "enabled pilot users can create their own transfer events"
  on public.retailer_transfer_events for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and retailer_id = 'sainsburys'
    and exists (
      select 1 from public.retailer_pilot_users pilot
      where pilot.user_id = (select auth.uid())
        and pilot.retailer_id = retailer_transfer_events.retailer_id
        and pilot.status = 'enabled'
        and (pilot.ends_at is null or pilot.ends_at > now())
    )
  );

drop policy if exists "enabled pilot users can update their own transfer events" on public.retailer_transfer_events;
create policy "enabled pilot users can update their own transfer events"
  on public.retailer_transfer_events for update to authenticated
  using (
    (select auth.uid()) = user_id
    and retailer_id = 'sainsburys'
    and exists (
      select 1 from public.retailer_pilot_users pilot
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
      select 1 from public.retailer_pilot_users pilot
      where pilot.user_id = (select auth.uid())
        and pilot.retailer_id = retailer_transfer_events.retailer_id
        and pilot.status = 'enabled'
        and (pilot.ends_at is null or pilot.ends_at > now())
    )
  );
