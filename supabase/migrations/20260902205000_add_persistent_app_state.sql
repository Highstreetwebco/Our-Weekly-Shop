alter table public.profiles
  add column if not exists app_state jsonb not null default '{}'::jsonb,
  add column if not exists setup_complete boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

grant select, insert, update on public.profiles to authenticated;
