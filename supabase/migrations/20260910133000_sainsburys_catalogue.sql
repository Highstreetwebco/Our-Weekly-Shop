-- Live Sainsbury's catalogue metadata and search-cache support.
-- Product pages are fetched only by the authenticated Edge Function; no retailer
-- credentials or browser cookies are stored here.

alter table public.catalogue_products
  alter column test_sku drop not null,
  alter column brand set default '';

alter table public.catalogue_products
  add column if not exists retailer_id text references public.retailers(id) on delete cascade,
  add column if not exists retailer_sku text,
  add column if not exists product_url text,
  add column if not exists image_url text,
  add column if not exists pack_label text,
  add column if not exists pack_estimated boolean not null default false,
  add column if not exists source_updated_at timestamptz;

alter table public.catalogue_products
  add constraint catalogue_products_retailer_sku_key unique (retailer_id, retailer_sku);

alter table public.retailer_offers
  add column if not exists promotional_price_pence integer check (promotional_price_pence > 0),
  add column if not exists promotion_text text,
  add column if not exists unit_price_text text;

create index if not exists catalogue_products_live_name_idx
  on public.catalogue_products using gin (to_tsvector('simple', name))
  where is_test_data = false;

create index if not exists retailer_offers_live_retailer_idx
  on public.retailer_offers (retailer_id, captured_at desc)
  where is_test_data = false;

create table if not exists public.catalogue_searches (
  retailer_id text not null references public.retailers(id) on delete cascade,
  search_term text not null check (char_length(search_term) between 2 and 80),
  refreshed_at timestamptz not null default now(),
  product_count integer not null default 0 check (product_count >= 0),
  last_requested_by uuid references auth.users(id) on delete set null,
  primary key (retailer_id, search_term)
);

create table if not exists public.catalogue_search_products (
  retailer_id text not null,
  search_term text not null,
  product_id uuid not null references public.catalogue_products(id) on delete cascade,
  position integer not null check (position >= 0),
  last_seen_at timestamptz not null default now(),
  primary key (retailer_id, search_term, product_id),
  foreign key (retailer_id, search_term)
    references public.catalogue_searches(retailer_id, search_term) on delete cascade
);

create index if not exists catalogue_search_products_lookup_idx
  on public.catalogue_search_products (retailer_id, search_term, position);

create table if not exists public.catalogue_import_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  retailer_id text not null references public.retailers(id) on delete cascade,
  search_term text not null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  product_count integer check (product_count >= 0),
  succeeded boolean not null default false,
  error_code text
);

create index if not exists catalogue_import_events_rate_idx
  on public.catalogue_import_events (user_id, requested_at desc);

alter table public.catalogue_searches enable row level security;
alter table public.catalogue_search_products enable row level security;
alter table public.catalogue_import_events enable row level security;

revoke all on public.catalogue_searches, public.catalogue_search_products, public.catalogue_import_events from anon, authenticated;

update public.retailers
set is_test_data = false
where id = 'sainsburys';

