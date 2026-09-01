-- Our Weekly Shop: secure shared-household foundation
create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  adults smallint not null default 2 check (adults between 1 and 20),
  children smallint not null default 0 check (children between 0 and 20),
  portion_size text not null default 'normal' check (portion_size in ('small','normal','large','custom')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  emoji text not null default '🍽️',
  default_portions smallint not null default 2 check (default_portions between 1 and 50),
  favourite boolean not null default false,
  last_cooked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table public.meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit text not null default 'pack',
  preference text not null default 'suitable' check (preference in ('suitable','prefer_brand','exact')),
  preferred_product_name text
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (household_id, week_start)
);

create table public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete restrict,
  day_of_week smallint check (day_of_week between 0 and 6),
  portions smallint not null check (portions between 1 and 50),
  leftover_portions smallint not null default 0 check (leftover_portions >= 0),
  cooked_at timestamptz
);

create table public.regular_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  frequency_days smallint check (frequency_days >= 1),
  last_bought_at timestamptz,
  is_active boolean not null default true,
  unique (household_id, name)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
  status text not null default 'active' check (status in ('active','delivered','archived')),
  created_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  name text not null,
  detail text,
  category text not null default 'Extras',
  source text not null default 'manual' check (source in ('meal','regular','manual')),
  is_checked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  name text not null,
  tracking_type text not null default 'estimated' check (tracking_type in ('exact','estimated','expiry_led','non_perishable')),
  estimated_quantity numeric(10,2),
  unit text,
  use_by_date date,
  updated_at timestamptz not null default now()
);

create index on public.household_members(user_id);
create index on public.meals(household_id);
create index on public.ingredients(household_id);
create index on public.weekly_plans(household_id, week_start);
create index on public.shopping_lists(household_id, status);
create index on public.inventory_items(household_id, use_by_date);

-- All user-facing data is household scoped. This helper is SECURITY DEFINER only to
-- avoid recursive policy checks; it is not exposed and has no public EXECUTE grant.
create function private.is_household_member(target_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id and hm.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_household_member(uuid) from public;
grant execute on function private.is_household_member(uuid) to authenticated;

create function private.is_household_owner(target_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = target_household_id and hm.user_id = (select auth.uid()) and hm.role = 'owner'
  );
$$;
revoke all on function private.is_household_owner(uuid) from public;
grant execute on function private.is_household_owner(uuid) to authenticated;

create function private.is_household_creator(target_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.households h
    where h.id = target_household_id and h.created_by = (select auth.uid())
  );
$$;
revoke all on function private.is_household_creator(uuid) from public;
grant execute on function private.is_household_creator(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.ingredients enable row level security;
alter table public.meals enable row level security;
alter table public.meal_ingredients enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.planned_meals enable row level security;
alter table public.regular_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.inventory_items enable row level security;

create policy "profile owner" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "members see household" on public.households for select to authenticated using (private.is_household_member(id));
create policy "user creates household" on public.households for insert to authenticated with check ((select auth.uid()) = created_by);
create policy "members update household" on public.households for update to authenticated using (private.is_household_member(id)) with check (private.is_household_member(id));
create policy "members see members" on public.household_members for select to authenticated using (private.is_household_member(household_id));
create policy "creator joins new household" on public.household_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'owner' and private.is_household_creator(household_id)
);
create policy "owner manages members" on public.household_members for update to authenticated using (private.is_household_owner(household_id)) with check (private.is_household_owner(household_id));
create policy "owner removes members" on public.household_members for delete to authenticated using (private.is_household_owner(household_id));

create policy "members manage ingredients" on public.ingredients for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "members manage meals" on public.meals for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "members manage meal ingredients" on public.meal_ingredients for all to authenticated using (exists (select 1 from public.meals m where m.id = meal_id and private.is_household_member(m.household_id))) with check (exists (select 1 from public.meals m where m.id = meal_id and private.is_household_member(m.household_id)));
create policy "members manage weekly plans" on public.weekly_plans for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "members manage planned meals" on public.planned_meals for all to authenticated using (exists (select 1 from public.weekly_plans p where p.id = weekly_plan_id and private.is_household_member(p.household_id))) with check (exists (select 1 from public.weekly_plans p where p.id = weekly_plan_id and private.is_household_member(p.household_id)));
create policy "members manage regular items" on public.regular_items for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "members manage shopping lists" on public.shopping_lists for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "members manage shopping list items" on public.shopping_list_items for all to authenticated using (exists (select 1 from public.shopping_lists l where l.id = shopping_list_id and private.is_household_member(l.household_id))) with check (exists (select 1 from public.shopping_lists l where l.id = shopping_list_id and private.is_household_member(l.household_id)));
create policy "members manage inventory" on public.inventory_items for all to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
