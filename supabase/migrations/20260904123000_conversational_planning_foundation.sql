-- Our Weekly Shop: conversation-first planning foundation.
-- This migration keeps the existing demo tables and adds structured, reviewable
-- records for household people, AI actions, recipe metadata and basket choices.

create table if not exists public.household_people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null default 'Adult' check (role in ('Adult','Child')),
  portion_multiplier numeric(4,2) not null default 1 check (portion_multiplier > 0 and portion_multiplier <= 5),
  dietary_requirements text,
  dislikes text,
  allergies text,
  usual_days smallint[] not null default '{0,1,2,3,4,5,6}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  input_text text not null check (char_length(input_text) <= 4000),
  input_mode text not null default 'text' check (input_mode in ('text','voice')),
  intent text not null,
  proposed_changes jsonb not null default '{}'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','undone')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.household_preferences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, preference_key)
);

create table if not exists public.planned_meal_people (
  planned_meal_id uuid not null references public.planned_meals(id) on delete cascade,
  person_id uuid not null references public.household_people(id) on delete cascade,
  primary key (planned_meal_id, person_id)
);

alter table public.meals add column if not exists servings smallint check (servings between 1 and 100);
alter table public.meals add column if not exists instructions text;
alter table public.meals add column if not exists prep_minutes smallint check (prep_minutes >= 0);
alter table public.meals add column if not exists estimated_cost_pence integer check (estimated_cost_pence >= 0);
alter table public.meals add column if not exists source text not null default 'household' check (source in ('household','conversation','imported'));
alter table public.planned_meals add column if not exists meal_type text not null default 'dinner' check (meal_type in ('breakfast','lunch','dinner','snack'));
alter table public.planned_meals add column if not exists source text not null default 'manual' check (source in ('manual','conversation','repeat'));
alter table public.shopping_list_items add column if not exists quantity numeric(10,2) not null default 1 check (quantity > 0);
alter table public.shopping_list_items add column if not exists unit text not null default 'item';
alter table public.shopping_list_items add column if not exists original_name text;
alter table public.shopping_list_items add column if not exists selected_name text;
alter table public.shopping_list_items add column if not exists substitution_status text not null default 'none' check (substitution_status in ('none','suggested','accepted','declined'));
alter table public.shopping_list_items add column if not exists substitution_saving_pence integer check (substitution_saving_pence >= 0);

create index if not exists household_people_household_idx on public.household_people(household_id);
create index if not exists ai_actions_household_week_idx on public.ai_actions(household_id, week_start, created_at desc);
create index if not exists ai_actions_user_idx on public.ai_actions(user_id);
create index if not exists household_preferences_household_idx on public.household_preferences(household_id);
create index if not exists planned_meal_people_person_idx on public.planned_meal_people(person_id);

alter table public.household_people enable row level security;
alter table public.ai_actions enable row level security;
alter table public.household_preferences enable row level security;
alter table public.planned_meal_people enable row level security;

drop policy if exists "users see own memberships" on public.household_members;
create policy "users see own memberships" on public.household_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_household_member(household_id));

drop policy if exists "members manage household people" on public.household_people;
create policy "members manage household people" on public.household_people
  for all to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));

drop policy if exists "members manage ai actions" on public.ai_actions;
create policy "members manage ai actions" on public.ai_actions
  for all to authenticated
  using (private.is_household_member(household_id) and user_id = (select auth.uid()))
  with check (private.is_household_member(household_id) and user_id = (select auth.uid()));

drop policy if exists "members manage household preferences" on public.household_preferences;
create policy "members manage household preferences" on public.household_preferences
  for all to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));

drop policy if exists "members manage planned meal people" on public.planned_meal_people;
create policy "members manage planned meal people" on public.planned_meal_people
  for all to authenticated
  using (exists (
    select 1
    from public.planned_meals pm
    join public.weekly_plans wp on wp.id = pm.weekly_plan_id
    where pm.id = planned_meal_id and private.is_household_member(wp.household_id)
  ))
  with check (exists (
    select 1
    from public.planned_meals pm
    join public.weekly_plans wp on wp.id = pm.weekly_plan_id
    join public.household_people hp on hp.id = person_id and hp.household_id = wp.household_id
    where pm.id = planned_meal_id and private.is_household_member(wp.household_id)
  ));

grant select, insert, update, delete on public.household_people to authenticated;
grant select, insert, update, delete on public.ai_actions to authenticated;
grant select, insert, update, delete on public.household_preferences to authenticated;
grant select, insert, update, delete on public.planned_meal_people to authenticated;
